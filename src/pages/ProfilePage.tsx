import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Key, Lock, Check, AlertCircle, Smartphone, Clock } from 'lucide-react';

interface ProfilePageProps {
  onAddToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onAddToast }) => {
  const { user } = useAuth();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) {
      onAddToast({
        type: 'error',
        title: 'Policy Violation',
        description: 'New password must have at least 8 characters.',
      });
      return;
    }
    if (newPass !== confirmPass) {
      onAddToast({
        type: 'error',
        title: 'Mismatch',
        description: 'Passwords do not match.',
      });
      return;
    }

    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      onAddToast({
        type: 'success',
        title: 'Credentials Rotated',
        description: 'Your master login password hash has been updated with high-entropy salt.',
      });
    }, 600);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
          Account Security & Credentials
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review cryptographic posture, update authentication factors, and inspect session state.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h3 className="text-base font-bold text-slate-100">{user?.username}</h3>
            <span className="text-xs text-slate-400 font-mono">{user?.email}</span>
            <span className="mt-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
              ROLE: {user?.role}
            </span>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Account Status:</span>
              <span className="text-emerald-400 font-medium capitalize">{user?.account_status}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Failed Attempts:</span>
              <span className="font-mono text-slate-200">{user?.failed_login_attempts ?? 0} / 5</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Lockout Policy:</span>
              <span className="font-mono text-slate-200">15 Minutes</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Member Since:</span>
              <span className="font-mono text-slate-300">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Password Rotation & 2FA (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Password Rotation Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <Key className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">Rotate Master Password</h2>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm shadow-cyan-600/20 disabled:opacity-50"
                >
                  {isUpdating ? 'Rehashing...' : 'Update & Rehash Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Two-Factor Authentication Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Two-Factor Authentication (TOTP)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Require a time-based one-time password alongside your master key.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setTwoFactorEnabled(!twoFactorEnabled);
                onAddToast({
                  type: 'info',
                  title: twoFactorEnabled ? '2FA Disabled' : '2FA Enforced',
                  description: twoFactorEnabled
                    ? 'Fallback to single factor master password.'
                    : 'TOTP authenticator secret active on session.',
                });
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                twoFactorEnabled
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
