import { useState, useEffect } from 'react';
import { useResume } from '../context/ResumeContext';
import {
  X,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Clock,
  Briefcase,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { ResumeData } from '../types/resume';

interface InterviewKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetResumeData?: ResumeData;
}

export const InterviewKeyModal = ({
  isOpen,
  onClose,
  targetResumeData,
}: InterviewKeyModalProps) => {
  const { data: activeResume } = useResume();
  const currentData = targetResumeData || activeResume;

  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const difficulty = 'Intermediate';
  const interviewType = 'Mixed';

  const generateKey = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:8000/api/interview/generate-access-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_data: currentData,
          target_role: currentData.basics.headline || 'Software Engineer',
          difficulty,
          interview_type: interviewType,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate interview access key');
      }

      const result = await res.json();
      setAccessKey(result.access_key);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error generating key. Please ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateKey();
    }
  }, [isOpen, currentData]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!accessKey) return;
    navigator.clipboard.writeText(accessKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Smartphone size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Interview Access Key
              </h2>
              <p className="text-xs text-slate-400">
                Attend your personalized AI mock interview on your Flutter mobile app.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto space-y-5 pr-1 text-left">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Access Key Display Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center flex flex-col items-center justify-center relative shadow-inner">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-2 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck size={13} /> Ready to Connect
            </div>

            {isLoading ? (
              <div className="py-4 flex items-center gap-2 text-slate-400 text-xs">
                <RefreshCw size={16} className="animate-spin text-sky-400" />
                Generating unique interview token...
              </div>
            ) : (
              <>
                <div className="text-3xl sm:text-4xl font-mono font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 select-all my-1">
                  {accessKey || 'INT-XXXX-XX'}
                </div>

                <p className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1.5 mt-1 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                  <Clock size={12} className="text-amber-400" /> Expires in 10 minutes • One-Time Session Key
                </p>

                {/* 1-Click Copy Button */}
                <button
                  onClick={handleCopy}
                  className={`mt-4 flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                    isCopied
                      ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                      : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check size={14} /> Key Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy Access Key
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Synced Candidate Profile Details */}
          <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Synced Resume Data
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Briefcase size={14} className="text-sky-400 shrink-0" />
                <span className="truncate">{currentData.basics.headline || 'Software Engineer'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Layers size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">{currentData.basics.name || 'Candidate'}</span>
              </div>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2.5 text-xs text-slate-300">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" /> How to Start on Flutter App:
            </h4>
            <div className="space-y-2 bg-slate-850/40 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <span>Open your <strong>AI Interview Flutter Mobile App</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Tap <strong>"Connect with Web Key"</strong> and enter this Access Key <code className="text-sky-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">{accessKey || 'INT-XXXX-XX'}</code> (or upload your resume PDF directly).
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Your AI mock interview begins immediately with questions tailored specifically to your experience!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800">
          <button
            onClick={generateKey}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Regenerate Key
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
