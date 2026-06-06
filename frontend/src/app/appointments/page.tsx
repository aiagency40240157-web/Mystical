'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/api';

interface Appointment {
  id: string;
  clientId: string;
  client: { firstName: string; lastName: string };
  startTime: string;
  endTime: string;
  status: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await api.get<Appointment[]>('/appointments');
      setAppointments(data.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
    } catch {
      setError('Unable to process this request at this time.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await api.post(`/appointments/${id}/cancel`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a))
      );
    } catch {
      setError('Unable to process this request at this time.');
    }
  }

  const cancellable = (status: string) =>
    status === 'PENDING_PAYMENT' || status === 'CONFIRMED';

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
        <Link
          href="/appointments/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + New Appointment
        </Link>
      </div>

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
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Time</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No appointments found.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {appt.client.firstName} {appt.client.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {format(new Date(appt.startTime), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {format(new Date(appt.startTime), 'HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      {cancellable(appt.status) && (
                        <button
                          onClick={() => handleCancel(appt.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                      <Link
                        href={`/appointments/new?reschedule=${appt.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Reschedule
                      </Link>
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
