'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { getRole } from '@/lib/auth';

interface AnalyticsSummary {
  appointmentsToday: number;
  noShowsToday: number;
  occupancyRate: number;
  waitlistCount: number;
  weeklyTotal: number;
  weeklyNoShows: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const role = getRole();
    if (role !== 'MANAGER' && role !== 'ASSISTANT') {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get<AnalyticsSummary>(`/analytics/summary?date=${date}`)
      .then(setSummary)
      .catch(() => setError('Unable to process this request at this time.'))
      .finally(() => setLoading(false));
  }, [date]);

  const statCards = summary
    ? [
        { label: 'Occupancy Rate', value: `${summary.occupancyRate}%`, highlight: true },
        { label: 'Appointments Today', value: summary.appointmentsToday },
        { label: 'No-Shows Today', value: summary.noShowsToday },
        { label: 'Waitlist Count', value: summary.waitlistCount },
        { label: 'Weekly Total', value: summary.weeklyTotal },
        { label: 'Weekly No-Shows', value: summary.weeklyNoShows },
      ]
    : [];

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Analytics</h1>

      <div className="mb-6 flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-3">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Occupancy Rate</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-indigo-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(summary.occupancyRate, 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 w-12 text-right">
                {summary.occupancyRate}%
              </span>
            </div>
          </div>
        </>
      ) : null}
    </AppLayout>
  );
}
