'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { getRole } from '@/lib/auth';

interface AuditLog {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const role = getRole();
    if (role !== 'MANAGER' && role !== 'ASSISTANT') {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    api.get<AuditLog[]>('/audit')
      .then(setLogs)
      .catch(() => setError('Unable to process this request at this time.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Audit Logs</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Action</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Details</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono max-w-md truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
