import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { VaultFile, AuditLog, UserStats } from '../types';
import {
  FolderLock,
  HardDrive,
  ShieldCheck,
  Activity,
  Upload,
  Download,
  Info,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface UserDashboardProps {
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
  onInspectFile: (file: VaultFile) => void;
  onDownloadFile: (file: VaultFile) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onSelectTab,
  onOpenUpload,
  onInspectFile,
  onDownloadFile,
}) => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentFiles, setRecentFiles] = useState<VaultFile[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentFiles(data.recent_files || []);
          setRecentLogs(data.recent_logs || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
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
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Security Vault Dashboard
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Identity: {user?.username}</span>
            <span aria-hidden="true">·</span>
            <span>Role: {user?.role?.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-400">STATUS: HARDENED</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('security-lab')}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-colors"
          >
            Launch Defense Lab
          </button>
          <button
            onClick={onOpenUpload}
            className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-cyan-600/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Vault New File</span>
          </button>
        </div>
      </div>

      {/* 4 Primary High-Density Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Encrypted Files</span>
            <FolderLock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {stats?.total_files ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active vaulted items</span>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Storage Allocated</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {formatBytes(stats?.total_storage_bytes ?? 0)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">15MB quota per account</span>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Cipher Protection</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold font-mono text-emerald-300">AES-256-GCM</div>
          <span className="text-[11px] text-slate-400 mt-1 block">128-bit MAC Auth Tag</span>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Security Posture</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold font-mono text-cyan-300">ZERO-TRUST</div>
          <span className="text-[11px] text-slate-400 mt-1 block">IDOR & Traversal Immune</span>
        </div>
      </div>

      {/* Main Grid: Recent Files & Audit Log Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Files (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">Recent Vaulted Files</h2>
            </div>
            <button
              onClick={() => onSelectTab('files')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>View All Files</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              Decrypting file catalog...
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <FolderLock className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs text-slate-400">No files stored in your private vault yet.</div>
              <button
                onClick={onOpenUpload}
                className="px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
              >
                Vault First Document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-950/40 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {file.original_filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono tabular-nums">{formatBytes(file.file_size)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{file.encryption_status}</span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onInspectFile(file)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Inspect Cryptographic Parameters"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDownloadFile(file)}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Decrypt & Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity Logs (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">Personal Audit Trail</h2>
            </div>
            <button
              onClick={() => onSelectTab('activity')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>Full Trail</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No recent audit records found.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-slate-300">{log.action}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : log.status === 'BLOCKED'
                          ? 'bg-rose-500/10 text-rose-300'
                          : 'bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{log.details}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()} · IP: {log.ip_address}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
