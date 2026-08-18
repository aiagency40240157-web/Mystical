'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';

interface ServiceData {
  id: string;
  name: string;
  category: string;
  durationMins: number;
  price: number;
}

function EditServiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') as string;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [durationMins, setDurationMins] = useState('30');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get<ServiceData>(`/services/${id}`)
      .then(s => {
        setName(s.name);
        setCategory(s.category);
        setDurationMins(String(s.durationMins));
        setPrice(s.price ? String(s.price / 100) : '');
      })
      .catch(() => setError('No se pudo cargar el servicio.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch(`/services/${id}`, {
        name,
        category,
        durationMins: parseInt(durationMins, 10) || 0,
        price: Math.round((parseFloat(price) || 0) * 100),
      });
      setSuccess(true);
      setTimeout(() => router.push('/services'), 900);
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
        <button onClick={() => router.push('/services')} className="text-slate-400 hover:text-slate-600 text-sm">← Servicios</button>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-bold text-slate-900">Editar Servicio</h1>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <input type="text" required value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
              <input type="number" min="0" required value={durationMins} onChange={e => setDurationMins(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio ($)</label>
              <input type="number" min="0" step="1" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0 = preguntar"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Precio 0 muestra &ldquo;Preguntar en oficina&rdquo;.</p>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => router.push('/services')}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditServicePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="text-slate-500 text-sm">Cargando...</div>}>
        <EditServiceForm />
      </Suspense>
    </AppLayout>
  );
}
