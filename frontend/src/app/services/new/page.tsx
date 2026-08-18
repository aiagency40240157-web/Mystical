'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';

export default function NewServicePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [durationMins, setDurationMins] = useState('30');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/services', {
        name,
        category,
        durationMins: parseInt(durationMins, 10) || 0,
        price: Math.round((parseFloat(price) || 0) * 100),
      });
      router.push('/services');
    } catch {
      setError('No se pudo crear el servicio.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/services')} className="text-slate-400 hover:text-slate-600 text-sm">← Servicios</button>
          <span className="text-slate-300">/</span>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo Servicio</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
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
                placeholder="Ej: HOLISTIC SERVICES"
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
            <p className="text-xs text-slate-400">Deja el precio en 0 para mostrar &ldquo;Preguntar en oficina&rdquo;.</p>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                {loading ? 'Creando...' : 'Crear servicio'}
              </button>
              <button type="button" onClick={() => router.push('/services')}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
