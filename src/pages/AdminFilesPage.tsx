import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { VaultFile } from '../types';
import { Database, Search, Download, Trash2, Info, Lock, ShieldCheck } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface AdminFilesPageProps {
  onInspectFile: (file: VaultFile) => void;
  onDownloadFile: (file: VaultFile) => void;
  onAddToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
}

export const AdminFilesPage: React.FC<AdminFilesPageProps> = ({
  onInspectFile,
  onDownloadFile,
  onAddToast,
}) => {
  const { token } = useAuth();
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fileToPurge, setFileToPurge] = useState<VaultFile | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/files', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handlePurgeConfirm = async () => {
    if (!fileToPurge || !token) return;

    try {
      const res = await fetch(`/api/files/${fileToPurge.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onAddToast({
        type: 'warning',
        title: 'Admin Purge Executed',
        description: `File '${fileToPurge.original_filename}' purged from vault storage.`,
      });

      setFileToPurge(null);
      fetchFiles();
    } catch (err: any) {
      onAddToast({
        type: 'error',
        title: 'Purge Failed',
        description: err.message,
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const filtered = files.filter(
    (f) =>
      f.original_filename.toLowerCase().includes(search.toLowerCase()) ||
      (f.owner_name && f.owner_name.toLowerCase().includes(search.toLowerCase())) ||
      f.stored_filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
          System-Wide Encrypted Vault Index
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Master registry of all tenant files stored on disk under AES-256-GCM authenticated encryption.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename or owner username..."
            className="w-full px-3.5 py-2 pl-9 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">File ID & Name</th>
                <th className="py-3 px-4">Owner Account</th>
                <th className="py-3 px-4">Physical UUID Path</th>
                <th className="py-3 px-4 text-right">Cipher Size</th>
                <th className="py-3 px-4">Cipher Suite</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    Querying master file table...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No files found in vault.
                  </td>
                </tr>
              ) : (
                filtered.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-200 block truncate max-w-xs">
                            {file.original_filename}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: #{file.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{file.owner_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">UID: #{file.owner_id}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[140px]">
                      {file.stored_filename}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {formatBytes(file.file_size)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-emerald-400 text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        AES-256-GCM
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(file.uploaded_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onInspectFile(file)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Inspect Cryptographic Metadata"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownloadFile(file)}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Admin Authorized Decrypt & Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFileToPurge(file)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Admin Purge File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!fileToPurge}
        title="Admin Purge of User Vault File"
        description={`As an administrator, are you sure you want to forcibly purge '${fileToPurge?.original_filename}' belonging to User #${fileToPurge?.owner_id}? The file and its encrypted ciphertext payload will be deleted from disk and recorded in the audit log.`}
        confirmText="Confirm Purge"
        isDestructive={true}
        onConfirm={handlePurgeConfirm}
        onCancel={() => setFileToPurge(null)}
      />
    </div>
  );
};
