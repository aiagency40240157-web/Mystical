'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
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

interface Appointment {
  id: string;
  clientId: string;
  client: { firstName: string; lastName: string };
  service?: { name: string } | null;
  startTime: string;
  endTime: string;
  status: string;
}

interface FinancialSummary {
  income: { today: number; week: number; month: number; year: number };
  credits: { total: number; count: number; items: CreditItem[] };
}

interface CreditItem {
  id: string;
  client: { id: string; firstName: string; lastName: string };
  amount: number;
  paidAmount: number;
  balance: number;
  type: string;
  description?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pillStyle: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
};

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => new Date());
  const [role, setRole] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setRole(getRole() ?? '');
    const today = format(new Date(), 'yyyy-MM-dd');
    let pending = 2;
    const done = () => {
      if (--pending === 0) setLoading(false);
    };
    api
      .get<AnalyticsSummary>(`/analytics/summary?date=${today}`)
      .then(setSummary)
      .catch(() => {})
      .finally(done);
    api
      .get<Appointment[]>('/appointments')
      .then(setAppointments)
      .catch(() => setError('Unable to process this request at this time.'))
      .finally(done);
    // Financial summary only for manager
    const r = getRole();
    if (r === 'MANAGER') {
      api.get<FinancialSummary>('/financial/summary').then(setFinancial).catch(() => {});
    }
  }, []);

  // Active appointments grouped by local calendar day (yyyy-MM-dd).
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') continue;
      const key = format(new Date(a.startTime), 'yyyy-MM-dd');
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    map.forEach((list) => {
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });
    return map;
  }, [appointments]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month));
    const gridEnd = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const statCards = summary
    ? [
        { label: 'Appointments Today', value: summary.appointmentsToday },
        { label: 'No-Shows', value: summary.noShowsToday },
        { label: 'Occupancy Rate', value: `${summary.occupancyRate}%` },
        { label: 'Waitlist Count', value: summary.waitlistCount },
      ]
    : [];

  const today = new Date();
  const monthCount = appointments.filter(
    (a) =>
      a.status !== 'CANCELLED' &&
      a.status !== 'NO_SHOW' &&
      isSameMonth(new Date(a.startTime), month),
  ).length;

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

          {role === 'MANAGER' && financial && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Revenue</h2>
              <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
                {[
                  { label: 'Today', value: financial.income.today },
                  { label: 'This Week', value: financial.income.week },
                  { label: 'This Month', value: financial.income.month },
                  { label: 'This Year', value: financial.income.year },
                ].map((card) => (
                  <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">${card.value.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-8">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-800">
                    Outstanding Credits
                    {financial.credits.count > 0 && (
                      <span className="ml-2 text-sm font-normal text-red-600">
                        ${financial.credits.total.toFixed(2)} owed by {financial.credits.count} entr{financial.credits.count === 1 ? 'y' : 'ies'}
                      </span>
                    )}
                  </h2>
                  <a href="/credits" className="text-sm text-indigo-600 hover:underline">Manage credits →</a>
                </div>
                {financial.credits.items.length === 0 ? (
                  <p className="px-6 py-6 text-sm text-slate-400">No outstanding credits.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Paid</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {financial.credits.items.slice(0, 8).map((c) => (
                        <tr key={c.id}>
                          <td className="px-6 py-3 font-medium text-slate-900">{c.client.firstName} {c.client.lastName}</td>
                          <td className="px-6 py-3 text-slate-500 capitalize">{c.type}</td>
                          <td className="px-6 py-3 text-slate-700">${c.amount.toFixed(2)}</td>
                          <td className="px-6 py-3 text-green-600">${c.paidAmount.toFixed(2)}</td>
                          <td className="px-6 py-3 font-semibold text-red-600">${c.balance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{format(month, 'MMMM yyyy')}</h2>
                <span className="text-xs text-slate-500">
                  {monthCount} appointment{monthCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                  className="px-2.5 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <button
                  onClick={() => setMonth(new Date())}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Today
                </button>
                <button
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  className="px-2.5 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-100">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayAppts = byDay.get(key) ?? [];
                const inMonth = isSameMonth(day, month);
                const isToday = isSameDay(day, today);
                const hasAppts = dayAppts.length > 0;
                return (
                  <div
                    key={key}
                    onClick={() => hasAppts && setSelectedDay(key)}
                    className={`min-h-[7rem] border-b border-r border-slate-100 p-1.5 align-top transition-colors ${
                      inMonth ? 'bg-white' : 'bg-slate-50'
                    } ${hasAppts ? 'cursor-pointer hover:bg-indigo-50' : ''}`}
                  >
                    <div className="flex justify-end">
                      <span
                        className={`inline-flex items-center justify-center text-xs w-6 h-6 rounded-full ${
                          isToday
                            ? 'bg-indigo-600 text-white font-semibold'
                            : inMonth
                            ? 'text-slate-700'
                            : 'text-slate-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayAppts.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          title={`${a.client.firstName} ${a.client.lastName}${a.service ? ` · ${a.service.name}` : ''} · ${a.status.replace(/_/g, ' ')}`}
                          className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight font-medium ${
                            pillStyle[a.status] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {format(new Date(a.startTime), 'HH:mm')} {a.client.firstName} {a.client.lastName}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div className="text-[11px] font-medium text-indigo-500 px-1">+{dayAppts.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Confirmed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Pending payment
              </span>
            </div>
          </div>
        </>
      )}

      {selectedDay && (() => {
        const modalAppts = byDay.get(selectedDay) ?? [];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setSelectedDay(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-base">
                  {format(new Date(selectedDay + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
                {modalAppts.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="text-sm font-mono text-slate-500 w-10 pt-0.5 shrink-0">
                      {format(new Date(a.startTime), 'HH:mm')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {a.client.firstName} {a.client.lastName}
                      </p>
                      {a.service && (
                        <p className="text-xs text-slate-500 truncate">{a.service.name}</p>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${pillStyle[a.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {a.status.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => router.push(`/appointments?id=${a.id}`)}
                      className="text-indigo-500 hover:text-indigo-700 text-xs shrink-0"
                      title="View appointment"
                    >
                      →
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">{modalAppts.length} appointment{modalAppts.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => router.push(`/appointments/new?date=${selectedDay}`)}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  + New appointment
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}
