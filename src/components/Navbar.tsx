import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, Upload, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenUpload }) => {
  const { user, logout, quickLogin } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => onSelectTab(user ? 'dashboard' : 'landing')}
        className="flex items-center gap-2.5 text-slate-100 hover:text-white transition-colors text-left group"
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className="text-base font-bold tracking-tight">Secure File Vault</span>
      </button>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        {!user ? (
          <>
            <button
              onClick={() => onSelectTab('landing')}
              className={`hover:text-cyan-400 transition-colors ${currentTab === 'landing' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Overview
            </button>
            <button
              onClick={() => onSelectTab('project')}
              className={`hover:text-cyan-400 transition-colors ${currentTab === 'project' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Flask Source Code
            </button>
            <button
              onClick={() => onSelectTab('login')}
              className={`hover:text-cyan-400 transition-colors ${currentTab === 'login' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Sign In
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`hover:text-cyan-400 transition-colors ${currentTab === 'dashboard' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onSelectTab('files')}
              className={`hover:text-cyan-400 transition-colors ${currentTab === 'files' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              My Files
            </button>
            <button
              onClick={() => onSelectTab('security-lab')}
              className={`hover:text-cyan-400 transition-colors ${currentTab === 'security-lab' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Security Lab
            </button>
            <button
              onClick={() => onSelectTab('activity')}
              className={`hover:text-cyan-400 transition-colors ${currentTab === 'activity' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Audit Trail
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => onSelectTab('admin-dashboard')}
                className={`hover:text-cyan-400 transition-colors ${currentTab.startsWith('admin') ? 'text-cyan-400 font-semibold' : ''}`}
              >
                Admin Console
              </button>
            )}
            <button
              onClick={() => onSelectTab('project')}
              className={`hover:text-cyan-400 transition-colors ${currentTab === 'project' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Source Explorer
            </button>
          </>
        )}
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        {!user ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => quickLogin('admin')}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors whitespace-nowrap hidden sm:inline-flex"
            >
              Demo Admin
            </button>
            <button
              onClick={() => onSelectTab('login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-cyan-600/20"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenUpload}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-600/20 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Vault File</span>
            </button>
            <button
              onClick={() => onSelectTab('profile')}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
              title={`Logged in as ${user.username} (${user.role})`}
            >
              <UserIcon className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
