'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';

interface Service {
  id: string;
  name: string;
  durationMins: number;
}
interface Appointment {
  id: string;
  serviceId: string | null;
  startTime: string;
  client: { firstName: string; lastName: string } | null;
}

function EditAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') as string;

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Appointment>(`/appointments/${id}`),
      api.get<Service[]>('/services'),
    ])
      .then(([a, s]) => {
        setAppt(a);
        setServices(s);
        setServiceId(a.serviceId ?? '');
      })
      .catch(() => setError('No se pudo cargar la cita.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch(`/appointments/${id}`, { serviceId: serviceId || null });
      setSuccess(true);
      setTimeout(() => router.push('/appointments'), 900);
    } catch {
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-slate-500 text-sm">Cargando...</div>;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/appointments')} className="text-slate-400 hover:text-slate-600 text-sm">← Citas</button>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-bold text-slate-900">Editar Cita</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 mb-4">
          <p className="text-green-700 text-sm">Cambios guardados correctamente.</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              {appt?.client ? `${appt.client.firstName} ${appt.client.lastName}` : '—'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Servicio</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Sin servicio —</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.durationMins ? ` (${s.durationMins} min)` : ''}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">Para cambiar la fecha/hora usa &ldquo;Reschedule&rdquo; en la lista de citas.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => router.push('/appointments')}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditAppointmentPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="text-slate-500 text-sm">Cargando...</div>}>
        <EditAppointmentForm />
      </Suspense>
    </AppLayout>
  );
}
