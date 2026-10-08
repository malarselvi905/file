import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, User, Eye, EyeOff, AlertCircle, ArrowLeft, Check, KeyRound } from 'lucide-react';

interface AuthPageProps {
  initialView?: 'login' | 'register' | 'forgot';
  onSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const AuthPages: React.FC<AuthPageProps> = ({
  initialView = 'login',
  onSuccess,
  onNavigate,
}) => {
  const { login, register, quickLogin } = useAuth();
  const [view, setView] = useState<'login' | 'register' | 'forgot'>(initialView);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password rules validation
  const passLength = password.length >= 8;
  const passUpper = /[A-Z]/.test(password);
  const passLower = /[a-z]/.test(password);
  const passDigit = /[0-9]/.test(password);
  const passSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = passLength && passUpper && passLower && passDigit && passSymbol;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const res = await login(username, password);
    setIsLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.error || 'Login failed.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isPasswordValid) {
      setErrorMsg('Please satisfy all password complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await register(username, email, password);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg('Registration successful. You can now authenticate.');
      setView('login');
      setPassword('');
      setConfirmPassword('');
    } else {
      setErrorMsg(res.error || 'Registration failed.');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    setSuccessMsg(`Cryptographic reset token generated and dispatched for ${email}. (In demo mode, please use standard credentials)`);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative text-left">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            {view === 'login' && 'Vault Authentication'}
            {view === 'register' && 'Create Security Account'}
            {view === 'forgot' && 'Reset Vault Credentials'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {view === 'login' && 'Access encrypted storage protected by AES-256-GCM'}
            {view === 'register' && 'Zero-trust registration with salted PBKDF2 hashing'}
            {view === 'forgot' && 'Send recovery token to registered identity'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sec_admin or alice_analyst"
                  className="w-full px-3.5 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 pl-9 pr-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm shadow-cyan-600/20 disabled:opacity-50"
            >
              {isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Vault'}
            </button>

            {/* Quick Fill Demo Credentials */}
            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-2 font-medium text-center">
                Instant Academic Demo Accounts
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await quickLogin('admin');
                    onSuccess();
                  }}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-left transition-colors group"
                >
                  <span className="text-[11px] font-semibold text-rose-300 block">Security Admin</span>
                  <span className="text-[10px] text-slate-500 font-mono">sec_admin</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await quickLogin('user');
                    onSuccess();
                  }}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors group"
                >
                  <span className="text-[11px] font-semibold text-cyan-300 block">Standard User</span>
                  <span className="text-[10px] text-slate-500 font-mono">alice_analyst</span>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">
                New researcher or employee?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('register');
                    setErrorMsg(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Register Account
                </button>
              </span>
            </div>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3-30 chars, alphanumeric"
                  className="w-full px-3.5 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@vault.cyber.local"
                  className="w-full px-3.5 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 pl-9 pr-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password complexity checklist */}
              <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] space-y-1">
                <div className="text-slate-400 font-medium mb-1">Cybersecurity Password Policy:</div>
                <div className="grid grid-cols-2 gap-1">
                  <div className={`flex items-center gap-1 ${passLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <Check className="w-3 h-3" /> 8+ Characters
                  </div>
                  <div className={`flex items-center gap-1 ${passUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <Check className="w-3 h-3" /> Uppercase (A-Z)
                  </div>
                  <div className={`flex items-center gap-1 ${passLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <Check className="w-3 h-3" /> Lowercase (a-z)
                  </div>
                  <div className={`flex items-center gap-1 ${passDigit ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <Check className="w-3 h-3" /> Number (0-9)
                  </div>
                  <div className={`flex items-center gap-1 col-span-2 ${passSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <Check className="w-3 h-3" /> Special Symbol (!@#$%...)
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid}
              className="w-full py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm shadow-cyan-600/20 disabled:opacity-50"
            >
              {isLoading ? 'Hashing & Creating Account...' : 'Register Secure Account'}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setErrorMsg(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Sign In
                </button>
              </span>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Registered Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@vault.cyber.local"
                  className="w-full px-3.5 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm shadow-cyan-600/20"
            >
              Dispatch Cryptographic Recovery Token
            </button>

            <button
              type="button"
              onClick={() => {
                setView('login');
                setErrorMsg(null);
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
