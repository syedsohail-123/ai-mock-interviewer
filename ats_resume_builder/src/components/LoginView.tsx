import { useState, useEffect, FormEvent } from 'react';
import { sendEmailOtp, verifyEmailOtp } from '../lib/supabase';
import { loginWithServerToken } from '../lib/serverAuth';
import {
  Mail,
  KeyRound,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  FileCheck2,
  Lock,
} from 'lucide-react';

export const LoginView = ({
  onLoginSuccess,
}: {
  onLoginSuccess: (email: string) => void;
}) => {
  const [method, setMethod] = useState<'server' | 'supabase'>('server');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // 1. Direct Server Token Login (Sets token & cookie, unlimited)
  const handleServerLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await loginWithServerToken(email);
      setMessage({
        text: 'Login successful! Redirecting to Dashboard...',
        type: 'success',
      });
      setTimeout(() => {
        onLoginSuccess(res.email);
      }, 700);
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({
        text: error.message || 'Failed to authenticate with server',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Supabase OTP Send
  const handleSendOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;
    if (cooldown > 0) {
      setMessage({ text: `Please wait ${cooldown}s before requesting a new OTP.`, type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await sendEmailOtp(email);
      setStep('otp');
      setCooldown(60);
      setMessage({ text: `OTP sent to ${email}. Check your inbox!`, type: 'success' });
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({
        text: error.message?.includes('rate limit')
          ? 'Supabase rate limit exceeded. You can switch to Direct Server Login below!'
          : error.message || 'Failed to send OTP',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Supabase OTP Verify
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await verifyEmailOtp(email, otp);
      setMessage({ text: 'Authenticated successfully! Redirecting to Dashboard...', type: 'success' });
      setTimeout(() => {
        onLoginSuccess(email);
      }, 700);
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: error.message || 'Invalid or expired OTP', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-sky-500 selection:text-white">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl" />
        <div className="w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl -mt-20 ml-20" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xl shadow-xl shadow-sky-500/20 mb-3">
            ATS
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            ATS Resume Builder
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access your resumes, ATS optimization scores & dashboard.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Method Tabs */}
          <div className="flex bg-slate-850 p-1 rounded-xl mb-6 text-xs font-semibold border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMethod('server');
                setMessage(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                method === 'server'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap size={14} /> Server Token (Cookie)
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod('supabase');
                setMessage(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                method === 'supabase'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck size={14} /> Supabase OTP
            </button>
          </div>

          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs mb-5 flex flex-col gap-1.5 ${
                message.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                <span>{message.text}</span>
              </div>
              {message.text.includes('rate limit') && (
                <button
                  type="button"
                  onClick={() => {
                    setMethod('server');
                    setMessage(null);
                  }}
                  className="mt-1 text-left text-xs font-bold text-sky-300 underline hover:text-sky-200 cursor-pointer"
                >
                  ⚡ Switch to Direct Server Login (No limits) &rarr;
                </button>
              )}
            </div>
          )}

          {method === 'server' ? (
            <div>
              <form onSubmit={handleServerLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-hidden focus:border-sky-500 text-white placeholder-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-1"
                >
                  <Lock size={15} />
                  {loading ? 'Generating Token...' : 'Enter Email & Sign In'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-5">
                <h2 className="text-sm font-bold text-white">
                  {step === 'email' ? 'Supabase Email OTP' : 'Verify One-Time Password'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {step === 'email'
                    ? 'We will send a 6-digit one-time password code to your email.'
                    : `Enter the 6-digit verification code sent to ${email}`}
                </p>
              </div>

              {step === 'email' ? (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-hidden focus:border-sky-500 text-white placeholder-slate-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer mt-1"
                  >
                    {loading ? 'Sending Code...' : 'Send OTP Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">6-Digit Code</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm tracking-widest font-mono text-center focus:outline-hidden focus:border-sky-500 text-white transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer mt-1"
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Change email
                    </button>

                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={() => handleSendOtp()}
                      className="font-semibold text-sky-400 hover:text-sky-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Feature highlights footer */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-sky-400" />
              <span>Real-time ATS Scoring</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileCheck2 size={13} className="text-emerald-400" />
              <span>Multi-template Export</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
