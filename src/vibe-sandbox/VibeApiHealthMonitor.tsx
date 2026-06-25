import { useEffect, useState } from 'react';
import { Activity, AlertCircle, Ban, Clock, Play } from 'lucide-react';

type KeyState = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

interface ApiKey {
  id: string;
  key: string;
  state: KeyState;
  recovery_until?: number;
}

const Badge = ({ state, recoveryUntil }: { state: KeyState; recoveryUntil?: number }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (state !== 'ORANGE' || !recoveryUntil) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((recoveryUntil - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state, recoveryUntil]);

  switch (state) {
    case 'GREEN':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
          <Activity className="h-4 w-4" /> Active
        </span>
      );
    case 'YELLOW':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
          <AlertCircle className="h-4 w-4" /> Global Pause (30s)
        </span>
      );
    case 'ORANGE':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">
          <Clock className="h-4 w-4" /> Recovering {timeLeft > 0 ? `[${timeLeft}s left]` : ''}
        </span>
      );
    case 'RED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
          <Ban className="h-4 w-4" /> Banned / Locked
        </span>
      );
  }
};

export default function VibeApiHealthMonitor() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchKeys();
    const interval = setInterval(fetchKeys, 1000);
    return () => clearInterval(interval);
  }, []);

  const simulateRequest = async (status?: number) => {
    setLoading(true);
    addLog(`Initiating /api/ingest request${status ? ` (Simulating ${status})` : ''}...`);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateStatus: status }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        addLog(`❌ Error: ${data.error || res.statusText}`);
      } else {
        addLog(`✅ Success! Data ingested using key: ${maskKey(data.usedKey)}`);
      }
    } catch (e: any) {
      addLog(`❌ Request failed: ${e.message}`);
    }
    setLoading(false);
    fetchKeys();
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  const maskKey = (key: string) => {
    return key.substring(0, 8) + '...';
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">High-Availability API Rotator</h1>
        <p className="text-gray-600">Centralized State Machine & Health Monitor</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">API Key Pool Status</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/20 text-sm text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Provider Key (Masked)</th>
                    <th className="px-6 py-4 font-medium">Circuit State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-gray-600">
                        {maskKey(k.key)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge state={k.state} recoveryUntil={k.recovery_until} />
                      </td>
                    </tr>
                  ))}
                  {keys.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                        No keys in pool.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">System Activity Logs</h2>
            </div>
            <div className="p-6 bg-gray-900 font-mono text-sm text-gray-300 h-64 overflow-y-auto rounded-b-xl">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">No activity yet...</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, i) => (
                    <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Simulation Controls</h2>
            <div className="space-y-3">
              <button
                onClick={() => simulateRequest()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Play className="h-4 w-4" /> Fire Normal Request (200)
              </button>
              
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-500 uppercase font-semibold">Inject Errors</span>
                </div>
              </div>

              <button
                onClick={() => simulateRequest(429)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Trigger Rate Limit (429)
              </button>
              
              <button
                onClick={() => simulateRequest(403)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Trigger Ban (403)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
