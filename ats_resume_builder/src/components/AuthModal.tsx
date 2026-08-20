import { useState, useEffect, FormEvent } from 'react';
import { sendEmailOtp, verifyEmailOtp, signOutUser } from '../lib/supabase';
import { loginWithServerToken, logoutServer } from '../lib/serverAuth';
import { Mail, KeyRound, LogOut, CheckCircle, AlertCircle, X, ShieldCheck, Zap } from 'lucide-react';

export const AuthModal = ({
  isOpen,
  onClose,
  userEmail,
  setUserEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
}) => {
  const [method, setMethod] = useState<'server' | 'supabase'>('server');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer for OTP
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (!isOpen) return null;

  // 1. Direct Server Token Login (Fast, no third-party rate limits, sets cookie)
  const handleServerLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await loginWithServerToken(email);
      setUserEmail(res.email);
      setMessage({
        text: 'Authenticated successfully! Token stored in browser cookies.',
        type: 'success',
      });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1000);
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
      setCooldown(60); // 60 seconds rate limit cooldown
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
      setUserEmail(email);
      setMessage({ text: 'Authenticated successfully!', type: 'success' });
      setTimeout(() => {
        onClose();
        setStep('email');
        setOtp('');
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: error.message || 'Invalid or expired OTP', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Supabase signout:', err);
    }
    try {
      await logoutServer();
    } catch (err) {
      console.warn('Server signout:', err);
    }
    setUserEmail(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
        >
          <X size={18} />
        </button>

        {userEmail ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Logged In</h3>
              <p className="text-sm text-slate-400 mt-1">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium transition-all cursor-pointer"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        ) : (
          <div>
            {/* Method Tabs */}
            <div className="flex bg-slate-800/80 p-1 rounded-lg mb-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMethod('server');
                  setMessage(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'server'
                    ? 'bg-sky-500 text-white shadow-xs'
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
                className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'supabase'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck size={14} /> Supabase OTP
              </button>
            </div>

            {method === 'server' ? (
              <div>

                {message && (
                  <div
                    className={`p-3 rounded-lg text-xs mb-4 flex items-center gap-2 ${
                      message.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    <span>{message.text}</span>
                  </div>
                )}

                <form onSubmit={handleServerLogin} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-hidden focus:border-sky-500 text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? 'Generating Token...' : 'Generate Token & Sign In'}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold mb-1">
                  {step === 'email' ? 'Sign In with Supabase OTP' : 'Enter Verification Code'}
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                  {step === 'email'
                    ? 'We will send a 6-digit security code directly to your email.'
                    : `Enter the 6-digit verification code sent to ${email}`}
                </p>

                {message && (
                  <div
                    className={`p-3 rounded-lg text-xs mb-4 flex flex-col gap-1.5 ${
                      message.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
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

                {step === 'email' ? (
                  <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Email Address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-hidden focus:border-sky-500 text-white placeholder-slate-500"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">6-Digit OTP</label>
                      <div className="relative">
                        <KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="123456"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm tracking-widest font-mono text-center focus:outline-hidden focus:border-sky-500 text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Verifying...' : 'Verify & Continue'}
                    </button>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Change email
                      </button>

                      <button
                        type="button"
                        disabled={cooldown > 0 || loading}
                        onClick={() => handleSendOtp()}
                        className="text-xs font-semibold text-sky-400 hover:text-sky-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
