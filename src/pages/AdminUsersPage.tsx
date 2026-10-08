import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Shield,
  ArrowUpDown,
} from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface AdminUsersPageProps {
  onAddToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ onAddToast }) => {
  const { token, user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Status change dialog
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'active' | 'inactive' | 'locked' | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusChangeConfirm = async () => {
    if (!targetUser || !pendingStatus || !token) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: pendingStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user status.');
      }

      onAddToast({
        type: 'success',
        title: 'User Status Updated',
        description: `User '${targetUser.username}' is now ${pendingStatus}.`,
      });

      setTargetUser(null);
      setPendingStatus(null);
      fetchUsers();
    } catch (err: any) {
      onAddToast({
        type: 'error',
        title: 'Action Failed',
        description: err.message,
      });
    }
  };

  const handleRoleToggle = async (userToUpdate: User) => {
    if (!token) return;
    const newRole = userToUpdate.role === 'admin' ? 'user' : 'admin';

    try {
      const res = await fetch(`/api/admin/users/${userToUpdate.id}/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onAddToast({
        type: 'info',
        title: 'Role Modified',
        description: `User '${userToUpdate.username}' assigned role: ${newRole.toUpperCase()}.`,
      });
      fetchUsers();
    } catch (err: any) {
      onAddToast({
        type: 'error',
        title: 'Role Change Failed',
        description: err.message,
      });
    }
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
          User Account Administration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Activate, deactivate, reset lockout counters, and assign role privileges.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by username or email..."
            className="w-full px-3.5 py-2 pl-9 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User ID / Username</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Failed Logins</th>
                <th className="py-3 px-4">Vault Files</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    Loading registered directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No users matching search.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 text-[11px]">#{u.id}</span>
                        <span className="font-semibold text-slate-200">{u.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleRoleToggle(u)}
                        disabled={u.id === 1 && currentAdmin?.id !== 1}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border flex items-center gap-1 transition-colors ${
                          u.role === 'admin'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                        }`}
                        title="Click to toggle role between User and Admin"
                      >
                        <Shield className="w-3 h-3" />
                        <span>{u.role.toUpperCase()}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          u.account_status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : u.account_status === 'locked'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        {u.account_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-300">
                      {u.failed_login_attempts ?? 0}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-300">
                      {u.file_count ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.account_status === 'locked' && (
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setPendingStatus('active');
                            }}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Reset Lockout & Activate"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        {u.account_status === 'active' ? (
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setPendingStatus('inactive');
                            }}
                            disabled={u.id === 1}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30"
                            title="Deactivate Account"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setPendingStatus('active');
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Re-activate Account"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!targetUser && !!pendingStatus}
        title={`Confirm User Status Change`}
        description={`Are you certain you want to change '${targetUser?.username}' account status to ${pendingStatus?.toUpperCase()}?`}
        confirmText="Execute Status Update"
        isDestructive={pendingStatus === 'inactive'}
        onConfirm={handleStatusChangeConfirm}
        onCancel={() => {
          setTargetUser(null);
          setPendingStatus(null);
        }}
      />
    </div>
  );
};
