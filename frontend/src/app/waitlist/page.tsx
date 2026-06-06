'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/api';

interface WaitlistEntry {
  id: string;
  clientId: string;
  client: { firstName: string; lastName: string };
  requestedTime: string;
  priority: string;
  createdAt: string;
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<WaitlistEntry[]>('/waitlist')
      .then(setEntries)
      .catch(() => setError('Unable to process this request at this time.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Waitlist</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Client Name</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Requested Time</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Priority</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No entries in waitlist.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {entry.client.firstName} {entry.client.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {format(new Date(entry.requestedTime), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.priority} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
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
