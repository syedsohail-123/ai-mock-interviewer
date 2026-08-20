import { useState, useEffect } from 'react';
import { ResumeProvider, useResume } from './context/ResumeContext';
import { TopBar } from './components/TopBar';
import { FormPanel } from './components/FormPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { DashboardView } from './components/DashboardView';
import { OriginalResumeCanvas, ResumePage } from './components/OriginalResumeCanvas';
import { AuthModal } from './components/AuthModal';
import { LoginView } from './components/LoginView';
import { InterviewKeyModal } from './components/InterviewKeyModal';
import { ResumeData } from './types/resume';
import { getSupabase } from './lib/supabase';
import { checkServerSession } from './lib/serverAuth';

export const App = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewTargetResume, setInterviewTargetResume] = useState<ResumeData | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId] = useState<string>(() => {
    const path = window.location.pathname.replace(/^\/+/, '').split('/')[0];
    if (path && path.length >= 6 && !['index.html', 'dashboard', 'editor', 'original'].includes(path)) {
      localStorage.setItem('user_workspace_id', path);
      return path;
    }
    const saved = localStorage.getItem('user_workspace_id');
    if (saved) return saved;
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let gen = '';
    for (let i = 0; i < 14; i++) gen += chars.charAt(Math.floor(Math.random() * chars.length));
    localStorage.setItem('user_workspace_id', gen);
    return gen;
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>(() => {
    return localStorage.getItem('ats_selected_template') || 'original';
  });
  const [activeView, setActiveView] = useState<'dashboard' | 'editor' | 'original'>(() => {
    return (localStorage.getItem('ats_active_view') as 'dashboard' | 'editor' | 'original') || 'dashboard';
  });
  const [originalDocPages, setOriginalDocPages] = useState<ResumePage[]>(() => {
    const saved = localStorage.getItem('ats_original_doc_pages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [originalDocFileName, setOriginalDocFileName] = useState<string>(() => {
    return localStorage.getItem('ats_original_doc_filename') || 'My Original Resume';
  });
  const [mobileEditorTab, setMobileEditorTab] = useState<'form' | 'preview'>('form');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('ats_original_doc_pages', JSON.stringify(originalDocPages));
    } catch (e) {
      console.warn('Storage quota exceeded for original pages:', e);
    }
  }, [originalDocPages]);

  useEffect(() => {
    localStorage.setItem('ats_original_doc_filename', originalDocFileName);
  }, [originalDocFileName]);

  useEffect(() => {
    if (userEmail && userId) {
      const targetPath = `/${userId}`;
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath);
      }
    }
  }, [userEmail, userId]);

  useEffect(() => {
    localStorage.setItem('ats_selected_template', selectedTemplate);
  }, [selectedTemplate]);

  useEffect(() => {
    localStorage.setItem('ats_active_view', activeView);
  }, [activeView]);

  useEffect(() => {
    let unsubscribe = () => {};

    const initAuth = async () => {
      try {
        // 1. Check direct server cookie / token session
        const serverEmail = await checkServerSession();
        if (serverEmail) {
          setUserEmail(serverEmail);
          setIsInitializing(false);
          return;
        }

        // 2. Check Supabase session
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (newSession?.user?.email) {
            setUserEmail(newSession.user.email);
          }
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setActiveView('dashboard');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  // 1. If not logged in, show the Login screen first
  if (!userEmail) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Once logged in, show the app with Dashboard by default
  return (
    <ResumeProvider>
      <MainAppContent
        userEmail={userEmail}
        userId={userId}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        activeView={activeView}
        setActiveView={setActiveView}
        originalDocPages={originalDocPages}
        setOriginalDocPages={setOriginalDocPages}
        originalDocFileName={originalDocFileName}
        setOriginalDocFileName={setOriginalDocFileName}
        isAuthOpen={isAuthOpen}
        setIsAuthOpen={setIsAuthOpen}
        setUserEmail={setUserEmail}
        isInterviewModalOpen={isInterviewModalOpen}
        setIsInterviewModalOpen={setIsInterviewModalOpen}
        interviewTargetResume={interviewTargetResume}
        setInterviewTargetResume={setInterviewTargetResume}
        mobileEditorTab={mobileEditorTab}
        setMobileEditorTab={setMobileEditorTab}
      />
    </ResumeProvider>
  );
};

const MainAppContent = ({
  userEmail,
  userId,
  selectedTemplate,
  setSelectedTemplate,
  activeView,
  setActiveView,
  originalDocPages,
  setOriginalDocPages,
  originalDocFileName,
  setOriginalDocFileName,
  isAuthOpen,
  setIsAuthOpen,
  setUserEmail,
  isInterviewModalOpen,
  setIsInterviewModalOpen,
  interviewTargetResume,
  setInterviewTargetResume,
  mobileEditorTab,
  setMobileEditorTab,
}: {
  userEmail: string | null;
  userId: string;
  selectedTemplate: string;
  setSelectedTemplate: (t: string) => void;
  activeView: 'dashboard' | 'editor' | 'original';
  setActiveView: (v: 'dashboard' | 'editor' | 'original') => void;
  originalDocPages: ResumePage[];
  setOriginalDocPages: (p: ResumePage[]) => void;
  originalDocFileName: string;
  setOriginalDocFileName: (n: string) => void;
  isAuthOpen: boolean;
  setIsAuthOpen: (b: boolean) => void;
  setUserEmail: (e: string | null) => void;
  isInterviewModalOpen: boolean;
  setIsInterviewModalOpen: (b: boolean) => void;
  interviewTargetResume: ResumeData | undefined;
  setInterviewTargetResume: (r: ResumeData | undefined) => void;
  mobileEditorTab: 'form' | 'preview';
  setMobileEditorTab: React.Dispatch<React.SetStateAction<'form' | 'preview'>>;
}) => {
  const { setResumeData } = useResume();

  const handleUploadOriginal = (pages: ResumePage[], filename: string, resumeData?: ResumeData) => {
    if (resumeData) {
      setResumeData(resumeData);
    }
    setOriginalDocPages(pages);
    setOriginalDocFileName(filename);
    setSelectedTemplate('original');
    setActiveView('editor');
    setMobileEditorTab('form');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <TopBar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenInterviewKey={() => {
          setInterviewTargetResume(undefined);
          setIsInterviewModalOpen(true);
        }}
        userEmail={userEmail}
        userId={userId}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        activeView={activeView}
        setActiveView={setActiveView}
        mobileEditorTab={mobileEditorTab}
        setMobileEditorTab={setMobileEditorTab}
      />

      {activeView === 'dashboard' ? (
        <DashboardView
          onSelectResume={(selectedData, templateName) => {
            if (selectedData) {
              setResumeData(selectedData);
            }
            setSelectedTemplate(templateName || 'original');
            setActiveView('editor');
            setMobileEditorTab('form');
          }}
          onCreateNew={() => {
            setActiveView('editor');
            setMobileEditorTab('form');
          }}
          onOpenInterviewKey={(targetResume) => {
            setInterviewTargetResume(targetResume);
            setIsInterviewModalOpen(true);
          }}
          onUploadOriginal={handleUploadOriginal}
        />
      ) : activeView === 'original' ? (
        <OriginalResumeCanvas
          initialPages={originalDocPages}
          fileName={originalDocFileName}
          onUpdatePages={(pages) => setOriginalDocPages(pages)}
          onUploadSuccess={(pages, resumeData) => {
            if (resumeData) {
              setResumeData(resumeData);
            }
            setOriginalDocPages(pages);
          }}
          onSwitchToTemplates={() => setActiveView('editor')}
        />
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative print:!block print:!overflow-visible print:!h-auto print:!p-0 print:!m-0">
          {/* Mobile / Tablet Segmented Tab Bar (Visible on < lg) */}
          <div className="lg:hidden no-print bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-center gap-2 z-20">
            <button
              onClick={() => setMobileEditorTab('form')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileEditorTab === 'form'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>✏️ Edit Details</span>
            </button>
            <button
              onClick={() => setMobileEditorTab('preview')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileEditorTab === 'preview'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>📄 Live Preview</span>
            </button>
          </div>

          {/* Desktop Split Screen & Mobile Conditional Rendering */}
          <div className={`w-full lg:w-1/2 lg:block no-print print:!hidden ${mobileEditorTab === 'form' ? 'block' : 'hidden'}`}>
            <FormPanel />
          </div>
          <div className={`w-full lg:w-1/2 lg:block print:!block print:!w-full print:!m-0 print:!p-0 ${mobileEditorTab === 'preview' ? 'block' : 'hidden'}`}>
            <PreviewPanel selectedTemplate={selectedTemplate} />
          </div>

          {/* Mobile Floating Quick-Toggle Button */}
          <div className="lg:hidden no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => setMobileEditorTab((prev) => (prev === 'form' ? 'preview' : 'form'))}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-full font-bold text-xs shadow-2xl shadow-sky-500/50 border border-sky-300/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {mobileEditorTab === 'form' ? (
                <>
                  <span>📄</span>
                  <span>View Live Resume</span>
                </>
              ) : (
                <>
                  <span>✏️</span>
                  <span>Back to Editor</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <InterviewKeyModal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        targetResumeData={interviewTargetResume}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        userEmail={userEmail}
        setUserEmail={(email) => {
          setUserEmail(email);
          if (email) {
            setActiveView('dashboard');
          }
        }}
      />
    </div>
  );
};

export default App;
