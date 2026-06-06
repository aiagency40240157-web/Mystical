'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';

interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  groupColor: string | null;
  isVip: boolean;
  isKnownRelation: boolean;
  knownRelationNote: string | null;
}

function EditClientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') as string;

  const [firstName, setFirstName]         = useState('');
  const [lastName, setLastName]           = useState('');
  const [phone, setPhone]                 = useState('');
  const [email, setEmail]                 = useState('');
  const [groupColor, setGroupColor]       = useState('');
  const [isVip, setIsVip]                 = useState(false);
  const [isKnownRelation, setIsKnownRelation] = useState(false);
  const [knownRelationNote, setKnownRelationNote] = useState('');
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);

  useEffect(() => {
    api.get<ClientData>(`/clients/${id}`)
      .then(c => {
        setFirstName(c.firstName);
        setLastName(c.lastName);
        setPhone(c.phone ?? '');
        setEmail(c.email ?? '');
        setGroupColor(c.groupColor?.toUpperCase() ?? '');
        setIsVip(c.isVip);
        setIsKnownRelation(c.isKnownRelation);
        setKnownRelationNote(c.knownRelationNote ?? '');
      })
      .catch(() => setError('No se pudo cargar el cliente.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch(`/clients/${id}`, {
        firstName,
        lastName,
        phone: phone || undefined,
        email: email || undefined,
        groupColor: groupColor || undefined,
        isVip,
        isKnownRelation,
        knownRelationNote: knownRelationNote || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push('/clients'), 1000);
    } catch {
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-slate-500 text-sm">Cargando...</div>
    );
  }

  return (
    <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/clients')}
            className="text-slate-400 hover:text-slate-600 text-sm"
          >
            ← Clientes
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-2xl font-bold text-slate-900">Editar Cliente</h1>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Grupo de Color</label>
              <select
                value={groupColor}
                onChange={e => setGroupColor(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Sin grupo</option>
                <option value="RED">Rojo</option>
                <option value="BLUE">Azul</option>
                <option value="YELLOW">VIP (Amarillo)</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={e => setIsVip(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">Cliente VIP</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isKnownRelation}
                  onChange={e => setIsKnownRelation(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">Conocido entre clientes 🔗</span>
              </label>

              {isKnownRelation && (
                <div className="ml-7">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ¿Con quién se conoce?
                  </label>
                  <input
                    type="text"
                    value={knownRelationNote}
                    onChange={e => setKnownRelationNote(e.target.value)}
                    placeholder="Ej: María García, Juan López..."
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/clients')}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}

export default function EditClientPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="text-slate-500 text-sm">Cargando...</div>}>
        <EditClientForm />
      </Suspense>
    </AppLayout>
  );
}
