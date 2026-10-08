import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderLock,
  Activity,
  ShieldAlert,
  UserCheck,
  Code2,
  Users,
  ScrollText,
  Database,
  ArrowRightLeft,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, quickLogin } = useAuth();
  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 p-4 flex flex-col justify-between shrink-0 hidden lg:flex select-none">
      <div className="space-y-6">
        {/* User identification badge */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-200 truncate">{user.username}</span>
            <span
              className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                isAdmin
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
              }`}
            >
              {user.role}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
        </div>

        {/* User Navigation Section */}
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-2 block mb-2">
            User Vault
          </span>
          <nav className="space-y-1">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                currentTab === 'dashboard'
                  ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onSelectTab('files')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                currentTab === 'files'
                  ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FolderLock className="w-4 h-4" />
              <span>My Encrypted Files</span>
            </button>
            <button
              onClick={() => onSelectTab('activity')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                currentTab === 'activity'
                  ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>My Security Logs</span>
            </button>
            <button
              onClick={() => onSelectTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                currentTab === 'profile'
                  ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Account Security</span>
            </button>
          </nav>
        </div>

        {/* Cybersecurity Lab & Explorer */}
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-2 block mb-2">
            Defense Lab
          </span>
          <nav className="space-y-1">
            <button
              onClick={() => onSelectTab('security-lab')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                currentTab === 'security-lab'
                  ? 'bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Penetration Test Lab</span>
            </button>
            <button
              onClick={() => onSelectTab('project')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                currentTab === 'project'
                  ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>Flask Source & SQL</span>
            </button>
          </nav>
        </div>

        {/* Admin Navigation Section */}
        {isAdmin && (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-2 block mb-2">
              Admin Governance
            </span>
            <nav className="space-y-1">
              <button
                onClick={() => onSelectTab('admin-dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  currentTab === 'admin-dashboard'
                    ? 'bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Metrics</span>
              </button>
              <button
                onClick={() => onSelectTab('admin-users')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  currentTab === 'admin-users'
                    ? 'bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </button>
              <button
                onClick={() => onSelectTab('admin-logs')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  currentTab === 'admin-logs'
                    ? 'bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ScrollText className="w-4 h-4" />
                <span>System Audit Logs</span>
              </button>
              <button
                onClick={() => onSelectTab('admin-files')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  currentTab === 'admin-files'
                    ? 'bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>All Vault Files</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Quick Test Switcher */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        <div className="text-[11px] text-slate-400 px-1 font-medium">Quick Role Switcher</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => quickLogin('admin')}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors flex items-center justify-center gap-1 ${
              user.username === 'sec_admin'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>Admin</span>
          </button>
          <button
            onClick={() => quickLogin('user')}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors flex items-center justify-center gap-1 ${
              user.username === 'alice_analyst'
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>Alice</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
