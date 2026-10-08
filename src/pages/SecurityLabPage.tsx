import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  Bug,
  Binary,
  KeyRound,
  FileCode2,
  Terminal,
} from 'lucide-react';

interface SecurityLabPageProps {
  onAddToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
  onRefreshDashboard?: () => void;
}

export const SecurityLabPage: React.FC<SecurityLabPageProps> = ({ onAddToast, onRefreshDashboard }) => {
  const { token, user } = useAuth();
  const [runningVector, setRunningVector] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<{
    vector: string;
    status: number;
    title: string;
    defense: string;
    output: any;
  } | null>(null);

  const runSimulation = async (vectorType: string) => {
    if (!token) {
      onAddToast({
        type: 'error',
        title: 'Authentication Required',
        description: 'Please sign in to run security simulations.',
      });
      return;
    }

    setRunningVector(vectorType);
    setSimulationResult(null);

    try {
      const res = await fetch('/api/security/simulate-vector', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vectorType }),
      });

      const data = await res.json();
      setSimulationResult({
        vector: vectorType,
        status: res.status,
        title: vectorType,
        defense: data.defense_triggered || 'Defense In Depth Control',
        output: data,
      });

      onAddToast({
        type: res.status === 403 || res.status === 200 ? 'success' : 'warning',
        title: `Simulation Completed (${res.status})`,
        description: data.details || data.mitigation || data.defense_triggered,
      });

      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err: any) {
      onAddToast({
        type: 'error',
        title: 'Simulation Error',
        description: err.message,
      });
    } finally {
      setRunningVector(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wider uppercase mb-1">
          <Bug className="w-4 h-4" />
          <span>Interactive Defensive Verification</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
          Cybersecurity Penetration & Defense Lab
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Execute simulated attack vectors against the Secure File Vault to observe real-time cryptographic defenses, access control barriers, and audit trail generation.
        </p>
      </div>

      {/* Grid of 4 Interactive Attack Simulations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vector 1: IDOR Attack */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider font-mono">
                OWASP TOP 10 #1
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                CWE-639: IDOR
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              Insecure Direct Object Reference (IDOR) Probe
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attacker tampers with URL or payload ID (e.g. requesting <code>/download/3</code>) to harvest another tenant's private encrypted document.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-400 border border-slate-800">
              DEFENSE: <code>owner_id == session.user_id</code> verified at controller; throws 403 Forbidden & generates alert.
            </div>
          </div>

          <button
            onClick={() => runSimulation('IDOR')}
            disabled={runningVector === 'IDOR'}
            className="w-full py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>{runningVector === 'IDOR' ? 'Simulating Attack...' : 'Simulate IDOR Access Probe'}</span>
          </button>
        </div>

        {/* Vector 2: Bit-Flip Tampering */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">
                NIST SP 800-38D
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                AEAD MAC Check
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              AES-256-GCM 1-Bit Ciphertext Tamper Test
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Adversary modifies a single bit in the stored ciphertext on disk to alter decrypted contents without knowing the encryption key.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-400 border border-slate-800">
              DEFENSE: Galois Counter Mode 128-bit MAC tag verification detects 100% of bit alterations and halts decryption.
            </div>
          </div>

          <button
            onClick={() => runSimulation('TAMPER_DETECTION')}
            disabled={runningVector === 'TAMPER_DETECTION'}
            className="w-full py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <span>{runningVector === 'TAMPER_DETECTION' ? 'Running Cipher Test...' : 'Test 1-Bit Cipher Tamper'}</span>
          </button>
        </div>

        {/* Vector 3: Path Traversal */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                OWASP TOP 10 #5
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                CWE-22: Path Traversal
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              Directory Traversal File Injection
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attacker submits filename with relative paths such as <code>../../../../etc/shadow</code> or null-byte truncations to overwrite system files.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-400 border border-slate-800">
              DEFENSE: Filename stripped by <code>basename</code> and rewritten to UUIDv4 filename stored outside web root.
            </div>
          </div>

          <button
            onClick={() => runSimulation('PATH_TRAVERSAL')}
            disabled={runningVector === 'PATH_TRAVERSAL'}
            className="w-full py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{runningVector === 'PATH_TRAVERSAL' ? 'Evaluating Traversal...' : 'Simulate Traversal Attack'}</span>
          </button>
        </div>

        {/* Vector 4: Brute-Force Lockout */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                OWASP TOP 10 #7
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                CWE-307: Credential Stuffing
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              Brute-Force & Credential Stuffing Spike
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated bot fires dictionary passwords against user account to discover credentials.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-400 border border-slate-800">
              DEFENSE: Threshold triggers account lockout for 15 minutes after 5 consecutive failed attempts.
            </div>
          </div>

          <button
            onClick={() => runSimulation('BRUTE_FORCE')}
            disabled={runningVector === 'BRUTE_FORCE'}
            className="w-full py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>{runningVector === 'BRUTE_FORCE' ? 'Simulating Lockout...' : 'Simulate Brute-Force Spike'}</span>
          </button>
        </div>
      </div>

      {/* Live Simulation Terminal Output */}
      {simulationResult && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400">
              <Terminal className="w-4 h-4" />
              <span className="font-semibold">DEFENSIVE VERIFICATION REPORT</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                simulationResult.status === 403
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              HTTP {simulationResult.status} {simulationResult.status === 403 ? 'FORBIDDEN (BLOCKED)' : 'DEFENSE VERIFIED'}
            </span>
          </div>

          <div className="space-y-1 text-slate-300">
            <div>
              <span className="text-slate-500">VECTOR: </span>
              <span className="text-slate-100">{simulationResult.output.vector}</span>
            </div>
            <div>
              <span className="text-slate-500">DEFENSIVE MECHANISM: </span>
              <span className="text-emerald-400">{simulationResult.defense}</span>
            </div>
            {simulationResult.output.details && (
              <div>
                <span className="text-slate-500">RESPONSE DETAILS: </span>
                <span className="text-slate-300">{simulationResult.output.details}</span>
              </div>
            )}
            {simulationResult.output.mitigation && (
              <div>
                <span className="text-slate-500">MITIGATION: </span>
                <span className="text-slate-300">{simulationResult.output.mitigation}</span>
              </div>
            )}
            {simulationResult.output.error_caught && (
              <div>
                <span className="text-slate-500">CRYPTOGRAPHIC ERROR CAUGHT: </span>
                <span className="text-rose-400">{simulationResult.output.error_caught}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
