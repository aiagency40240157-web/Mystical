'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/api';

interface AnalyticsSummary {
  appointmentsToday: number;
  noShowsToday: number;
  occupancyRate: number;
  waitlistCount: number;
  weeklyTotal: number;
  weeklyNoShows: number;
}

interface Appointment {
  id: string;
  clientId: string;
  client: { firstName: string; lastName: string };
  startTime: string;
  endTime: string;
  status: string;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const [sum, appts] = await Promise.all([
          api.get<AnalyticsSummary>(`/analytics/summary?date=${today}`),
          api.get<Appointment[]>('/appointments'),
        ]);
        setSummary(sum);
        const todayAppts = appts
          .filter((a) => a.startTime.startsWith(today))
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setAppointments(todayAppts);
      } catch {
        setError('Unable to process this request at this time.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = summary
    ? [
        { label: 'Appointments Today', value: summary.appointmentsToday },
        { label: 'No-Shows', value: summary.noShowsToday },
        { label: 'Occupancy Rate', value: `${summary.occupancyRate}%` },
        { label: 'Waitlist Count', value: summary.waitlistCount },
      ]
    : [];

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                Today&apos;s Appointments
              </h2>
            </div>
            {appointments.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">
                No appointments scheduled for today.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Client</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Time</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {appt.client.firstName} {appt.client.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {format(new Date(appt.startTime), 'HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
