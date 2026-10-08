import React, { useState, useRef } from 'react';
import { Upload, X, Shield, FileCheck, AlertCircle, Loader2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  token: string | null;
  onAddToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
}

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'zip'];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  token,
  onAddToast,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateFile = (file: File): string | null => {
    if (!file) return 'No file provided.';
    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `Disallowed extension (.${ext}). Allowed: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File exceeds maximum 15MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
    }
    return null;
  };

  const handleFileSelection = (file: File) => {
    setErrorMsg(null);
    const err = validateFile(file);
    if (err) {
      setErrorMsg(err);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(25);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setUploadProgress(60);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      setUploadProgress(95);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed.');
      }

      setUploadProgress(100);
      onAddToast({
        type: 'success',
        title: 'File Encrypted & Vaulted',
        description: `Stored '${selectedFile.name}' under AES-256-GCM authenticated cipher.`,
      });

      setSelectedFile(null);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading file.');
      onAddToast({
        type: 'error',
        title: 'Upload Failed',
        description: err.message,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Upload to Secure Vault</h3>
            <span className="text-xs text-slate-400">Server-Side AES-256-GCM Encryption at Rest</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-500 bg-cyan-500/5'
                : selectedFile
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <FileCheck className="w-10 h-10 text-emerald-400 mb-2" />
                <span className="text-sm font-semibold text-slate-200 truncate max-w-sm">
                  {selectedFile.name}
                </span>
                <span className="text-xs font-mono text-slate-400 mt-1 tabular-nums">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span className="text-xs text-cyan-400 hover:underline mt-2">
                  Click or drag to choose another file
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-10 h-10 text-slate-500 mb-2" />
                <p className="text-sm font-medium text-slate-300">
                  Drag and drop your file here, or <span className="text-cyan-400">browse</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                  <span>PDF, DOCX, XLSX, TXT, PNG, ZIP</span>
                  <span aria-hidden="true">·</span>
                  <span>Max 15MB</span>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cryptographic Pipeline Safeguards */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Cryptographic Security Pipeline</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 pl-6 list-disc">
              <li>MIME sniffing & extension validation against executable payloads</li>
              <li>Random UUID storage mapping (no path traversal, non-public directory)</li>
              <li>AES-256-GCM cipher with unique 96-bit IV and 128-bit MAC tag</li>
              <li>Pre-encryption SHA-256 integrity checksum generation</li>
            </ul>
          </div>

          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Encrypting payload & committing to vault...</span>
                <span className="font-mono tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-cyan-600/20"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encrypting...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Encrypt & Store</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
