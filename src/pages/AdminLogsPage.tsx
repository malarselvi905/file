import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuditLog } from '../types';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminLogsPage: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      const url = `/api/admin/logs?action=${actionFilter}&status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, actionFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(
    (l) =>
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.username.toLowerCase().includes(search.toLowerCase()) ||
      l.ip_address.includes(search)
  );

  const exportToCSV = () => {
    const headers = ['ID', 'Timestamp', 'Status', 'Action', 'Username', 'IP Address', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      l.status,
      l.action,
      `"${l.username}"`,
      l.ip_address,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure_vault_audit_trail_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionOptions = [
    'ALL',
    'USER_LOGIN_SUCCESS',
    'USER_LOGIN_FAILED',
    'LOGIN_BLOCKED_LOCKOUT',
    'ACCOUNT_LOCKED',
    'FILE_UPLOAD_ENCRYPTED',
    'FILE_DOWNLOAD_DECRYPTED',
    'FILE_DELETED',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'UNSUPPORTED_FILE_BLOCKED',
    'USER_REGISTRATION',
    'ADMIN_USER_MODIFICATION',
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Comprehensive Security Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Forensic security records with IP addresses, user agents, cryptographic status, and actor identities.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl transition-colors flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export Forensics CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search text */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search details, actor, IP address..."
            className="w-full px-3.5 py-2 pl-9 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Action Select */}
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {actionOptions.map((opt) => (
              <option key={opt} value={opt}>
                Action: {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Status Select */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Status: All Levels</option>
            <option value="SUCCESS">SUCCESS (Green)</option>
            <option value="BLOCKED">BLOCKED (Red - Threats & IDOR)</option>
            <option value="WARNING">WARNING (Amber - Lockouts)</option>
            <option value="FAILED">FAILED (Red - Bad Creds)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Diagnostic Details</th>
                <th className="py-3 px-4">Origin IP</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    Querying immutable audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">#{l.id}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          l.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : l.status === 'BLOCKED'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">{l.action}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{l.username}</td>
                    <td className="py-3 px-4 text-slate-300 max-w-sm truncate">{l.details}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{l.ip_address}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(l.timestamp).toLocaleString()}
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
