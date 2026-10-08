import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { VaultFile } from '../types';
import {
  FolderLock,
  Search,
  Filter,
  Download,
  Trash2,
  Info,
  Upload,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface MyFilesPageProps {
  onOpenUpload: () => void;
  onInspectFile: (file: VaultFile) => void;
  onDownloadFile: (file: VaultFile) => void;
  onAddToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
}

export const MyFilesPage: React.FC<MyFilesPageProps> = ({
  onOpenUpload,
  onInspectFile,
  onDownloadFile,
  onAddToast,
}) => {
  const { token, user } = useAuth();
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'size'>('date');
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [fileToDelete, setFileToDelete] = useState<VaultFile | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/files?search=${encodeURIComponent(searchQuery)}&type=${activeFilter}`, {
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
  }, [token, searchQuery, activeFilter]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !token) return;

    try {
      const res = await fetch(`/api/files/${fileToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete file.');
      }

      onAddToast({
        type: 'success',
        title: 'File Securely Purged',
        description: `Removed '${fileToDelete.original_filename}' and zeroed disk payload.`,
      });

      setFileToDelete(null);
      fetchFiles();
    } catch (err: any) {
      onAddToast({
        type: 'error',
        title: 'Delete Failed',
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

  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === 'size') return b.file_size - a.file_size;
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  });

  const filterExtensions = ['all', 'pdf', 'docx', 'xlsx', 'txt', 'jpg', 'png', 'zip'];

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Encrypted File Repository
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Isolated to: {user?.username} (ID: #{user?.id})</span>
            <span aria-hidden="true">·</span>
            <span>All payloads stored outside webroot</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-cyan-400">IDOR BARRIER ACTIVE</span>
          </div>
        </div>

        <button
          onClick={onOpenUpload}
          className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-cyan-600/20"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Vault New Document</span>
        </button>
      </div>

      {/* Search, Interactive Segmented Filter Controls, and Sort Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative max-w-sm w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vaulted files by filename..."
            className="w-full px-3.5 py-2 pl-9 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {filterExtensions.map((ext) => (
            <button
              key={ext}
              onClick={() => setActiveFilter(ext)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeFilter === ext
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ext.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'size')}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="date">Upload Date (Recent First)</option>
            <option value="size">File Size (Largest First)</option>
          </select>
        </div>
      </div>

      {/* Files Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Storage UUID</th>
                <th className="py-3 px-4 text-right">Size</th>
                <th className="py-3 px-4">Encryption Cipher</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                    Querying encrypted file catalog...
                  </td>
                </tr>
              ) : sortedFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <FolderLock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No matching files found in your vault.</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Upload your first sensitive document or adjust search filters.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-950/50 transition-colors group">
                    {/* Filename */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-semibold text-slate-200 truncate max-w-xs block">
                          {file.original_filename}
                        </span>
                      </div>
                    </td>

                    {/* Storage UUID (Anti Path Traversal) */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[150px]">
                      {file.stored_filename}
                    </td>

                    {/* File Size */}
                    <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                      {formatBytes(file.file_size)}
                    </td>

                    {/* Cipher */}
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1.5 font-mono text-emerald-400 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>AES-256-GCM</span>
                      </span>
                    </td>

                    {/* Upload Date */}
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(file.uploaded_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Action Controls */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onInspectFile(file)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Cryptographic Metadata (IV, Tag, SHA-256)"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownloadFile(file)}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Decrypt with AES-256-GCM and Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Permanently Purge from Vault"
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

      {/* Confirmation Modal for File Deletion */}
      <ConfirmationModal
        isOpen={!!fileToDelete}
        title="Permanently Purge Vault File?"
        description={`Are you certain you wish to purge '${fileToDelete?.original_filename}'? The encrypted ciphertext payload on server disk will be securely zeroed and deleted. This action is irreversible and recorded in the audit log.`}
        confirmText="Confirm Purge"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setFileToDelete(null)}
      />
    </div>
  );
};
