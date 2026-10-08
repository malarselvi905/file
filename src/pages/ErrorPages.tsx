import React from 'react';
import { ShieldAlert, AlertOctagon, HelpCircle, ArrowLeft } from 'lucide-react';

interface ErrorViewProps {
  code: 403 | 404 | 500;
  onGoHome: () => void;
}

export const ErrorPages: React.FC<ErrorViewProps> = ({ code, onGoHome }) => {
  const configs = {
    403: {
      icon: <ShieldAlert className="w-12 h-12 text-rose-400" />,
      title: '403 Forbidden – Security Access Violation',
      desc: 'Cryptographic authorization check failed. Insecure Direct Object Reference (IDOR) barrier intercepted this request or administrator credentials are required.',
      badge: 'ACCESS_DENIED_IDOR_BARRIER',
    },
    404: {
      icon: <HelpCircle className="w-12 h-12 text-cyan-400" />,
      title: '404 Not Found – Resource Undefined',
      desc: 'The requested vault file or API endpoint does not exist or has been permanently zeroed from the cryptographic catalog.',
      badge: 'RESOURCE_NOT_FOUND',
    },
    500: {
      icon: <AlertOctagon className="w-12 h-12 text-amber-400" />,
      title: '500 Cryptographic Subsystem Exception',
      desc: 'AES-256-GCM authentication tag mismatch or server-side failure prevented unsafe decryption. Data at rest remains preserved.',
      badge: 'INTEGRITY_SAFEGUARD_HALT',
    },
  };

  const current = configs[code];

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 mx-auto flex items-center justify-center">
          {current.icon}
        </div>

        <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {current.badge}
        </span>

        <h2 className="text-lg font-bold text-slate-100">{current.title}</h2>
        <p className="text-xs text-slate-400 leading-relaxed">{current.desc}</p>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={onGoHome}
            className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-cyan-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Secure Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
