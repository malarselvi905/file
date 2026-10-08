import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  FileKey2,
  Database,
  ArrowRight,
  Fingerprint,
  FileCheck2,
  AlertTriangle,
  Code2,
} from 'lucide-react';

interface LandingPageProps {
  onSelectTab: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectTab }) => {
  const { user, quickLogin } = useAuth();

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative pt-8 lg:pt-14 pb-12 overflow-hidden border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 tracking-wider uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Cybersecurity Defense Architecture</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 tracking-tight leading-[1.15] text-balance">
                Secure File Vault with AES-256-GCM Encryption at Rest
              </h1>

              <p className="text-base text-slate-300 leading-relaxed max-w-xl">
                A hardened, academic cybersecurity storage core designed to eliminate Insecure Direct Object References (IDOR), path traversal exploits, credential brute-forcing, and plain-text data leakage.
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {user ? (
                  <button
                    onClick={() => onSelectTab('dashboard')}
                    className="px-6 py-3 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-cyan-600/25"
                  >
                    <span>Open Personal Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => quickLogin('admin')}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-rose-600/20"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Instant Demo (Admin)</span>
                    </button>
                    <button
                      onClick={() => quickLogin('user')}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-cyan-600/20"
                    >
                      <FileKey2 className="w-4 h-4" />
                      <span>Instant Demo (Alice User)</span>
                    </button>
                    <button
                      onClick={() => onSelectTab('login')}
                      className="px-5 py-2.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl transition-colors"
                    >
                      Standard Sign In
                    </button>
                  </>
                )}
                <button
                  onClick={() => onSelectTab('project')}
                  className="px-4 py-2.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Inspect Flask Source & Schema</span>
                </button>
              </div>

              {/* Key defensive specs unboxed without pill badge sandwiches */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Fingerprint className="w-4 h-4 text-cyan-400" /> AES-256-GCM AEAD
                </span>
                <span aria-hidden="true">·</span>
                <span>SHA-256 Checksums</span>
                <span aria-hidden="true">·</span>
                <span>UUID Disk Segregation</span>
                <span aria-hidden="true">·</span>
                <span>Immutable MySQL Audit Log</span>
              </div>
            </div>

            {/* Right Column: Vault Core Visual */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl relative group">
                <img
                  src="/src/assets/images/vault_shield_hero_1791464590135.jpg"
                  alt="Cyber Defense Data Vault Core"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover aspect-[16/9] lg:aspect-[4/3] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-left">
                  <span className="text-xs font-mono font-medium text-cyan-400">
                    SERVER-SIDE STORAGE LAYER
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Encrypted at rest · Authenticated with 128-bit MAC tag
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Defensive Architecture Bento Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 text-left">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Defensive Cryptographic Architecture
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Engineered against the OWASP Top 10 web application vulnerabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit border border-cyan-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">
              Authenticated Encryption at Rest
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every file is encrypted via AES-256-GCM using a unique 96-bit random IV and verified with a 128-bit Galois Message Authentication Code. Prevents bit-flipping and ciphertext tampering.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit border border-emerald-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">
              IDOR & Path Traversal Immunity
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Files are saved under random UUIDv4 names in an isolated directory outside public document roots. Access is cryptographically checked against session owner records; foreign ID probes trigger immediate 403 Forbidden logs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">
              Brute-Force Lockout & Audit Trail
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              5 consecutive failed login attempts trigger an immediate 15-minute account lockout. Every upload, download, authentication attempt, and unauthorized access probe is recorded in an immutable audit ledger.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Quick Launch CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-100">
              Ready to verify the security controls?
            </h3>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
              Test live attack simulations including Insecure Direct Object References (IDOR), bit-flip ciphertext tampering, and account lockout in our interactive defense lab.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('security-lab')}
              className="px-5 py-2.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-md shadow-cyan-400/20"
            >
              Enter Defense Lab
            </button>
            <button
              onClick={() => onSelectTab('project')}
              className="px-5 py-2.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              View MySQL Schema & Flask
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
