import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminOverview, AuditLog } from '../types';
import {
  Users,
  FolderLock,
  HardDrive,
  ShieldAlert,
  AlertOctagon,
  ArrowRight,
  UserX,
  Radio,
  FileCheck2,
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectTab }) => {
  const { token, user } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchAdminStats = async () => {
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOverview(data.overview);
          setRecentLogs(data.recent_logs || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, [token]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Admin Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/admin_security_avatar_1791464601427.jpg"
            alt="Security Admin"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-xl object-cover border border-rose-500/30"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Security Operations Console
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold">
                ADMIN ACCESS
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Live threat mitigation, user governance, and cryptographic audit monitoring
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('admin-users')}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-colors"
          >
            Manage Users
          </button>
          <button
            onClick={() => onSelectTab('admin-logs')}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-sm shadow-rose-600/20"
          >
            Inspect Audit Logs
          </button>
        </div>
      </div>

      {/* Primary Threat & Operations Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Users */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Registered Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {overview?.total_users ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {overview?.active_users ?? 0} active · {overview?.locked_users ?? 0} locked
          </span>
        </div>

        {/* Metric 2: Total Encrypted Files */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Vault Encrypted Files</span>
            <FolderLock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {overview?.total_files ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {formatBytes(overview?.total_storage_bytes ?? 0)} total storage
          </span>
        </div>

        {/* Metric 3: Failed Login Attempts */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Failed Authentication</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {overview?.failed_logins ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Credential stuffing protection active</span>
        </div>

        {/* Metric 4: Suspicious Events / Blocks */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Threat Blocks & Probes</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 tabular-nums">
            {overview?.suspicious_events ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">IDOR & unauthorized probes</span>
        </div>
      </div>

      {/* Threat Events Live Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-100">Live Security Event Log Stream</h2>
          </div>
          <button
            onClick={() => onSelectTab('admin-logs')}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Filterable Logs</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Event Action</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Diagnostics & Details</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                    Streaming security events...
                  </td>
                </tr>
              ) : recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No security events recorded.
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : log.status === 'BLOCKED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-medium">
                      {log.username || 'Anonymous'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-sm">
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {log.ip_address}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
