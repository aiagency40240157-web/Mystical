'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';

interface Service {
  id: string;
  name: string;
  category: string;
  durationMins: number;
  price: number;
  isActive: boolean;
}

function formatPrice(cents: number) {
  if (cents === 0) return null;
  return `$${(cents / 100).toFixed(0)}`;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Service[]>('/services')
      .then(r => setServices(r))
      .catch(() => setError('No se pudieron cargar los servicios.'))
      .finally(() => setLoading(false));
  }, []);

  const byCategory = services.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Servicios</h1>
          <p className="text-slate-500 text-sm mt-1">Munay Bliss LLC — Love Life Coaching & Holistic Services</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando servicios...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No hay servicios registrados.</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">
                  {category}
                </h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                  {items.map(s => {
                    const priceLabel = formatPrice(s.price);
                    return (
                      <div key={s.id} className="flex items-center justify-between px-5 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{s.name}</p>
                          {s.durationMins > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">{s.durationMins} min</p>
                          )}
                        </div>
                        {priceLabel
                          ? <span className="text-lg font-bold text-indigo-600">{priceLabel}</span>
                          : <span className="text-sm text-slate-400 italic">Preguntar en oficina</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
