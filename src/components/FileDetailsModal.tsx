import React, { useState } from 'react';
import { VaultFile } from '../types';
import { ShieldCheck, Copy, Check, X, FileText, Download, KeyRound } from 'lucide-react';

interface FileDetailsModalProps {
  file: VaultFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: VaultFile) => void;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({ file, isOpen, onClose, onDownload }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !file) return null;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-left max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 truncate max-w-md">
                {file.original_filename}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>File #{file.id}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formatBytes(file.file_size)}</span>
                <span aria-hidden="true">·</span>
                <span>{file.file_type}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cryptographic Security Details */}
        <div className="py-4 overflow-y-auto space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-medium text-slate-200">Encryption Status at Rest</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hardware-authenticated AES-256 in Galois/Counter Mode
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {file.encryption_status}
            </span>
          </div>

          {/* Cryptographic Parameters Grid */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Initialization Vector (IV / Nonce)
                </span>
                <button
                  onClick={() => copyToClipboard(file.encryption_iv, 'iv')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {copiedKey === 'iv' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'iv' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-slate-300 break-all select-all">
                {file.encryption_iv}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                96-bit unique cryptographically pseudorandom nonce generated per file (NIST SP 800-38D).
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="font-medium text-slate-300">GCM Authentication Tag</span>
                <button
                  onClick={() => copyToClipboard(file.encryption_tag, 'tag')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {copiedKey === 'tag' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'tag' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-slate-300 break-all select-all">
                {file.encryption_tag}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                128-bit MAC tag verifying payload authenticity and preventing bit-flipping tampering.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="font-medium text-slate-300">Pre-Encryption SHA-256 Digest</span>
                <button
                  onClick={() => copyToClipboard(file.sha256_checksum, 'sha256')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {copiedKey === 'sha256' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'sha256' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-slate-300 break-all select-all">
                {file.sha256_checksum}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Cryptographic integrity hash verified post-decryption.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-1">Isolated Physical UUID Name</span>
                <code className="text-[11px] text-cyan-300 block truncate">{file.stored_filename}</code>
                <span className="text-[10px] text-slate-500 mt-1 block">Stored outside static web directory</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-1">Vault Upload Timestamp</span>
                <span className="text-[11px] font-mono text-slate-200 block">{new Date(file.uploaded_at).toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Immutable audit index</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Ownership: User #{file.owner_id} {file.owner_name ? `(${file.owner_name})` : ''}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onDownload(file)}
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Decrypt & Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
