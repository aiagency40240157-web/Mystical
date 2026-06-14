'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface BookingResult {
  status: string;
  message?: string;
  options?: string[];
}

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Client[]>('/clients')
      .then(setClients)
      .catch(() => setError('Unable to process this request at this time.'));
    api.get<Service[]>('/services')
      .then(setServices)
      .catch(() => { /* service catalog is optional for booking */ });
  }, []);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setSelectedSlot('');
      return;
    }
    setSlotsLoading(true);
    setSelectedSlot('');
    api.get<string[]>(`/appointments/availability?date=${date}`)
      .then(setSlots)
      .catch(() => setError('Unable to process this request at this time.'))
      .finally(() => setSlotsLoading(false));
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      setError('Please select a time slot.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (rescheduleId) {
        const res = await api.post<BookingResult>(
          `/appointments/${rescheduleId}/reschedule`,
          { newStartTime: selectedSlot },
        );
        // The backend always replies 200; the real outcome is in res.status.
        if (res.status === 'RESCHEDULED') {
          router.push('/appointments');
        } else {
          setResult(res);
        }
      } else {
        if (!clientId) {
          setError('Please select a client.');
          setLoading(false);
          return;
        }
        const res = await api.post<BookingResult>('/appointments', {
          clientId,
          startTime: selectedSlot,
          ...(serviceId ? { serviceId } : {}),
        });
        setResult(res);
      }
    } catch {
      setError('Unable to process this request at this time.');
    } finally {
      setLoading(false);
    }
  }

  function renderResult() {
    if (!result) return null;
    switch (result.status) {
      case 'PENDING_PAYMENT':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-3 mt-4">
            <p className="text-yellow-800 text-sm font-medium">
              Appointment booked! Payment required to confirm.
            </p>
          </div>
        );
      case 'ALTERNATIVES':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-4 mt-4">
            <p className="text-blue-800 text-sm font-medium mb-3">
              That time is not available. Available alternatives:
            </p>
            <div className="flex flex-wrap gap-2">
              {result.options?.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSelectedSlot(opt)}
                  className="bg-white border border-blue-300 text-blue-700 px-3 py-1.5 rounded-md text-sm hover:bg-blue-100 transition-colors"
                >
                  {format(new Date(opt), 'MMM d, HH:mm')}
                </button>
              ))}
            </div>
          </div>
        );
      case 'WAITLIST':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 mt-4">
            <p className="text-blue-800 text-sm font-medium">Added to waitlist.</p>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mt-4">
            <p className="text-red-700 text-sm font-medium">That slot is not available.</p>
          </div>
        );
      default:
        return (
          <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 mt-4">
            <p className="text-green-800 text-sm font-medium">Appointment booked successfully.</p>
          </div>
        );
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {rescheduleId ? 'Reschedule Appointment' : 'New Appointment'}
        </h1>

        {rescheduleId && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-md px-4 py-3 mb-6">
            <p className="text-indigo-700 text-sm">
              Rescheduling appointment #{rescheduleId}. Select a new date and time.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!rescheduleId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!rescheduleId && services.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No service selected</option>
                  {Array.from(new Set(services.map((s) => s.category))).map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {services
                        .filter((s) => s.category === cat)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — ${(s.price / 100).toFixed(0)}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {date && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Available Time Slots</label>
                {slotsLoading ? (
                  <p className="text-slate-500 text-sm">Loading slots...</p>
                ) : slots.length === 0 ? (
                  <p className="text-slate-500 text-sm">No available slots for this date.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                          selectedSlot === slot
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                      >
                        {format(new Date(slot), 'HH:mm')}
                      </button>
                    ))}
                  </div>
                )}
                {selectedSlot && (
                  <p className="text-indigo-600 text-sm mt-2 font-medium">
                    Selected: {format(new Date(selectedSlot), 'MMM d, yyyy HH:mm')}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedSlot}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {loading ? 'Processing...' : rescheduleId ? 'Reschedule' : 'Book Appointment'}
            </button>
          </form>

          {renderResult()}
        </div>
      </div>
    </AppLayout>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}>
      <NewAppointmentForm />
    </Suspense>
  );
}
