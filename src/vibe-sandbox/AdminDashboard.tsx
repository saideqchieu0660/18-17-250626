import React, { useEffect, useState } from 'react';

interface ApiKey {
  id: string;
  keyValue: string;
  status: 'GREEN' | 'ORANGE' | 'RED';
  recoveryUntil: string | null;
}

const CountdownBadge: React.FC<{ recoveryUntil: string }> = ({ recoveryUntil }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRecovered, setIsRecovered] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const remaining = Math.floor((new Date(recoveryUntil).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setIsRecovered(true);
        return 0;
      }
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [recoveryUntil]);

  if (isRecovered) {
    return <span className="px-2 py-1 bg-green-500 text-white rounded text-sm">Active</span>;
  }

  return (
    <span className="px-2 py-1 bg-orange-500 text-white rounded text-sm">
      Recovering ({timeLeft}s left)
    </span>
  );
};

export default function AdminDashboard() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/keys')
      .then(res => res.json())
      .then(data => {
        setKeys(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi fetch keys:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Quản lý API Key (Circuit Breaker)</h1>
      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Key Value</th>
              <th className="px-6 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="bg-white border-b">
                <td className="px-6 py-4">{k.id}</td>
                <td className="px-6 py-4">{k.keyValue}</td>
                <td className="px-6 py-4">
                  {k.status === 'GREEN' && (
                    <span className="px-2 py-1 bg-green-500 text-white rounded text-sm">Active</span>
                  )}
                  {k.status === 'RED' && (
                    <span className="px-2 py-1 bg-red-500 text-white rounded text-sm">Banned</span>
                  )}
                  {k.status === 'ORANGE' && k.recoveryUntil && (
                    <CountdownBadge recoveryUntil={k.recoveryUntil} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
