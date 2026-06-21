import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, APP_VERSION, APP_BUILD } from '../types';
import { Zap, Mail, Lock, User, Eye, EyeOff, Shield, Fingerprint, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

const STORAGE_KEY = 'nexus_users';
const SESSION_KEY = 'nexus_session';

function getUsers(): Record<string, { email: string; password: string; displayName: string; createdAt: string }> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function hashPassword(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = ((h << 5) - h + pw.charCodeAt(i)) | 0; }
  return 'h' + Math.abs(h).toString(36) + pw.length.toString(36);
}

export function getSession(): UserProfile | null {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function clearSession() { localStorage.removeItem(SESSION_KEY); }

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);

  const handleLogin = () => {
    setError(''); setSuccess('');
    if (!email || !password) { setError('Email and password are required'); return; }
    const users = getUsers();
    const user = users[email.toLowerCase()];
    if (!user) { setError('No account found with this email'); return; }
    if (user.password !== hashPassword(password)) { setError('Incorrect password'); return; }

    setLoading(true);
    const profile: UserProfile = {
      id: uuidv4(), username: email.split('@')[0], email: email.toLowerCase(),
      displayName: user.displayName, avatar: '', country: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: user.createdAt, lastLogin: new Date().toISOString(),
      twoFactorEnabled: false, biometricEnabled: false, sessionToken: uuidv4(),
    };

    // Simulate 2FA check
    const stored2FA = localStorage.getItem('nexus_2fa_' + email.toLowerCase());
    if (stored2FA === 'enabled') {
      setPendingUser(profile);
      setShow2FA(true);
      setLoading(false);
      return;
    }

    setTimeout(() => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
      setLoading(false);
      onLogin(profile);
    }, 800);
  };

  const handleVerify2FA = () => {
    if (twoFACode.length < 4) { setError('Enter a valid code'); return; }
    // Accept any 4+ digit code for demo
    if (pendingUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(pendingUser));
      onLogin(pendingUser);
    }
  };

  const handleRegister = () => {
    setError(''); setSuccess('');
    if (!email || !password || !displayName) { setError('All fields are required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPw) { setError('Passwords do not match'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format'); return; }

    const users = getUsers();
    if (users[email.toLowerCase()]) { setError('An account with this email already exists'); return; }

    setLoading(true);
    users[email.toLowerCase()] = { email: email.toLowerCase(), password: hashPassword(password), displayName, createdAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

    setTimeout(() => {
      setLoading(false);
      setSuccess('Account created! You can now sign in.');
      setMode('login');
    }, 600);
  };

  const handleForgot = () => {
    setError('');
    if (!email) { setError('Enter your email address'); return; }
    const users = getUsers();
    if (!users[email.toLowerCase()]) { setError('No account found'); return; }
    // Reset password to "nexus123"
    users[email.toLowerCase()].password = hashPassword('nexus123');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    setSuccess('Password reset to: nexus123. Please login and change it.');
    setMode('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#050508' }}>
      {/* Background effects */}
      <div className="absolute inset-0 splash-grid opacity-10" />
      <div className="absolute inset-0 splash-scanlines" />
      <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-[#00ff8833] rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-[#00ff8833] rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-[#00ff8833] rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-[#00ff8833] rounded-br-lg" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 w-full max-w-md mx-4 neon-glow relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center mb-4" style={{ boxShadow: '0 0 30px #00ff8833' }}>
            <Zap size={32} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-[#00ff88] tracking-[0.2em] neon-text">NEXUS</h1>
          <p className="text-[10px] text-gray-500 tracking-[0.4em] mt-1">TRADING RECOVERY OS</p>
          <p className="text-[8px] text-gray-700 mt-1">v{APP_VERSION} · Build {APP_BUILD}</p>
        </div>

        {/* 2FA Screen */}
        {show2FA ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="text-center mb-4">
              <Smartphone size={32} className="text-[#00d4ff] mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-200">Two-Factor Authentication</h3>
              <p className="text-xs text-gray-500 mt-1">Enter the verification code</p>
            </div>
            <input className="cyber-input text-center text-2xl tracking-[0.5em] font-mono" placeholder="0000" maxLength={6} value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))} />
            {error && <p className="text-xs text-[#ff3366]">{error}</p>}
            <button onClick={handleVerify2FA} className="cyber-button w-full py-3 flex items-center justify-center gap-2"><Shield size={16} /> Verify</button>
            <button onClick={() => { setShow2FA(false); setPendingUser(null); }} className="text-xs text-gray-500 hover:text-gray-300 w-full text-center">Back to Login</button>
          </motion.div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex mb-6 gap-1 p-1 rounded-xl bg-[rgba(30,42,58,0.5)]">
              {(['login', 'register'] as const).map(t => (
                <button key={t} onClick={() => { setMode(t); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${mode === t ? 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border border-[rgba(0,255,136,0.3)]' : 'text-gray-500'}`}>
                  {t === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input className="cyber-input pl-10" placeholder="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                  </div>
                )}
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input className="cyber-input pl-10" placeholder="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                {mode !== 'forgot' && (
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input className="cyber-input pl-10 pr-10" placeholder="Password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())} />
                    <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
                {mode === 'register' && (
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input className="cyber-input pl-10" placeholder="Confirm Password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
                  </div>
                )}

                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[#ff3366] bg-[rgba(255,51,102,0.1)] p-2 rounded-lg">{error}</motion.p>}
                {success && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[#00ff88] bg-[rgba(0,255,136,0.1)] p-2 rounded-lg flex items-center gap-1"><CheckCircle2 size={12} /> {success}</motion.p>}

                <button
                  onClick={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgot}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,212,255,0.15))', border: '1px solid rgba(0,255,136,0.4)', color: '#00ff88', opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? <span className="animate-spin w-4 h-4 border-2 border-[#00ff88] border-t-transparent rounded-full" /> : <ArrowRight size={16} />}
                  {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
                </button>

                {mode === 'login' && (
                  <button onClick={() => { setMode('forgot'); setError(''); }} className="text-xs text-gray-500 hover:text-[#00d4ff] w-full text-center transition-colors">
                    Forgot Password?
                  </button>
                )}
                {mode === 'forgot' && (
                  <button onClick={() => setMode('login')} className="text-xs text-gray-500 hover:text-gray-300 w-full text-center">
                    Back to Sign In
                  </button>
                )}

                {/* Security badges */}
                <div className="flex items-center justify-center gap-4 pt-4 border-t border-[rgba(30,42,58,0.5)]">
                  <div className="flex items-center gap-1 text-[9px] text-gray-600"><Shield size={10} /> Encrypted</div>
                  <div className="flex items-center gap-1 text-[9px] text-gray-600"><Fingerprint size={10} /> Biometric Ready</div>
                  <div className="flex items-center gap-1 text-[9px] text-gray-600"><Smartphone size={10} /> 2FA Support</div>
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
}
