import React, { useEffect, useState } from 'react';

interface ApiKey {
  id: string;
  keyValue: string;
  status: 'GREEN' | 'ORANGE' | 'RED';
  recoveryUntil: string | null;
}

export function AdminDashboard() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetch('/api/admin/keys')
      .then(res => res.json())
      .then(data => setKeys(data))
      .catch(err => console.error('Error loading keys:', err));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const renderBadge = (key: ApiKey) => {
    let status = key.status;
    let secondsLeft = 0;

    if (status === 'ORANGE' && key.recoveryUntil) {
      const recoveryMs = new Date(key.recoveryUntil).getTime();
      secondsLeft = Math.max(0, Math.ceil((recoveryMs - now) / 1000));
      if (secondsLeft === 0) {
        status = 'GREEN';
      }
    }

    if (status === 'GREEN') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    
    if (status === 'RED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Banned - Locked
        </span>
      );
    }
    
    if (status === 'ORANGE') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Recovering {secondsLeft}s left
        </span>
      );
    }

    return null;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">API Key Rotation Dashboard</h1>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Key</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {keys.map((k) => (
              <tr key={k.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{k.id.substring(0,8)}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{k.keyValue}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderBadge(k)}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  No API Keys configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
