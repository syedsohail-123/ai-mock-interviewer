import { useState } from 'react';
import { templates } from '../templates';
import { useResume } from '../context/ResumeContext';
import { uploadResumeToStorage } from '../lib/supabaseStorage';
import { Download, User, Palette, LayoutTemplate, LayoutDashboard, PenSquare, Cloud, Check, Upload } from 'lucide-react';
import { ResumeData } from '../types/resume';

export const TopBar = ({
  onOpenAuth,
  userEmail,
  selectedTemplate,
  setSelectedTemplate,
  activeView,
  setActiveView,
  onUploadOriginal,
}: {
  onOpenAuth: () => void;
  onOpenInterviewKey?: () => void;
  userEmail: string | null;
  userId?: string;
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  activeView: 'dashboard' | 'editor' | 'original';
  setActiveView: (view: 'dashboard' | 'editor' | 'original') => void;
  mobileEditorTab?: 'form' | 'preview';
  setMobileEditorTab?: (tab: 'form' | 'preview') => void;
  onUploadOriginal?: (pages: any[], filename: string, resumeData?: ResumeData) => void;
}) => {
  const { data, metadata, updateColors, setResumeData } = useResume();
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudSavedSuccess, setCloudSavedSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleCloudSave = async () => {
    if (!userEmail) {
      onOpenAuth();
      return;
    }
    setIsCloudSaving(true);
    try {
      await uploadResumeToStorage(userEmail, data.id || 'primary-resume', data);
      setCloudSavedSuccess(true);
      setTimeout(() => setCloudSavedSuccess(false), 3000);
    } catch (e) {
      console.warn('Cloud save notification:', e);
    } finally {
      setIsCloudSaving(false);
    }
  };

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const endpoints = [
      'http://127.0.0.1:8000/api/resumes/parse-original',
      'http://localhost:8000/api/resumes/parse-original',
    ];

    let success = false;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.resumeData) {
            setResumeData(result.resumeData);
          }
          if (onUploadOriginal) {
            onUploadOriginal(result.pages || [], file.name, result.resumeData);
          }
          setSelectedTemplate('original');
          setActiveView('editor');
          success = true;
          break;
        }
      } catch {
        // Try next endpoint
      }
    }

    if (!success) {
      alert('Unable to connect to backend server. Please make sure python main.py is running.');
    }

    e.target.value = '';
    setIsUploading(false);
  };

  const handlePdfExport = () => {
    window.print();
  };

  const presetPalettes = [
    { name: 'Sky Tech', primary: '#0ea5e9', sidebar: '#f8fafc', sidebarText: '#0f172a' },
    { name: 'Emerald Pro', primary: '#059669', sidebar: '#f0fdf4', sidebarText: '#064e3b' },
    { name: 'Indigo Sleek', primary: '#6366f1', sidebar: '#f5f3ff', sidebarText: '#1e1b4b' },
    { name: 'Slate Executive', primary: '#334155', sidebar: '#f1f5f9', sidebarText: '#0f172a' },
    { name: 'Rose Modern', primary: '#e11d48', sidebar: '#fff1f2', sidebarText: '#881337' },
  ];

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 sticky top-0 z-40">
      {/* Brand & View Switcher */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20 text-xs sm:text-sm">
            ATS
          </div>
          <div className="hidden xs:block">
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide">ATS Resume Builder</h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Reactive Template Engine</p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 hidden sm:block" />

        {/* View Toggle: Dashboard vs Editor */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard size={13} /> Dashboard
          </button>
          <button
            onClick={() => setActiveView('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'editor'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenSquare size={13} /> Editor
          </button>
        </div>

        {/* Template Selector Dropdown (visible in editor) */}
        {activeView === 'editor' && (
          <div className="flex items-center gap-2 text-xs">
            <LayoutTemplate size={14} className="text-slate-400 hidden md:inline" />
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="bg-slate-800 text-sky-400 border border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-xs focus:outline-hidden focus:border-sky-500 cursor-pointer"
            >
              {Object.entries(templates).map(([key, item]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center customization tools */}
      <div className="flex items-center gap-3">
        {/* Preset Palettes */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
          <Palette size={14} className="text-slate-400 ml-1 mr-1" />
          {presetPalettes.map((pal) => (
            <button
              key={pal.name}
              title={pal.name}
              onClick={() => updateColors({ primary: pal.primary, sidebar: pal.sidebar, sidebarText: pal.sidebarText })}
              style={{ backgroundColor: pal.primary }}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                metadata.colors.primary === pal.primary ? 'border-white scale-110' : 'border-transparent'
              }`}
            />
          ))}
        </div>

        {/* Primary Color Picker */}
        <label className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 cursor-pointer">
          <span className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: metadata.colors.primary }} />
          <span className="hidden lg:inline">Custom</span>
          <input
            type="color"
            value={metadata.colors.primary}
            onChange={(e) => updateColors({ primary: e.target.value })}
            className="sr-only"
          />
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-sky-400 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-all cursor-pointer">
          <Upload size={14} />
          <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
          <input
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleUploadResume}
            disabled={isUploading}
          />
        </label>

        <button
          onClick={handleCloudSave}
          disabled={isCloudSaving}
          title={userEmail ? 'Sync & Backup Resume to S3 Cloud Storage' : 'Sign in to sync to cloud storage'}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            cloudSavedSuccess
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750'
          }`}
        >
          {cloudSavedSuccess ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="hidden md:inline text-emerald-300">Saved</span>
            </>
          ) : (
            <>
              <Cloud size={14} className={isCloudSaving ? 'animate-pulse text-sky-400' : 'text-slate-400'} />
              <span className="hidden md:inline">{isCloudSaving ? 'Saving...' : 'Sync S3'}</span>
            </>
          )}
        </button>

        <button
          onClick={onOpenAuth}
          title={userEmail ? `Signed in as ${userEmail}` : 'Sign In'}
          className={`flex items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer ${
            userEmail
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white px-3'
          }`}
        >
          {userEmail ? (
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs uppercase">
              {userEmail.trim().charAt(0)}
            </span>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold">
              <User size={14} />
              <span>Sign In (OTP)</span>
            </div>
          )}
        </button>

        <button
          onClick={handlePdfExport}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
        >
          <Download size={14} />
          <span>Export PDF</span>
        </button>
      </div>
    </header>
  );
};
