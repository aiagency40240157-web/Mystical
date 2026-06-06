'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  groupColor: string | null;
  isVip: boolean;
  isKnownRelation: boolean;
  noShowCount: number;
}

// Privacy rule: yellow (VIP) is NEVER rendered in the same section as red/blue.
// Red and blue may appear together.
const COLOR = {
  yellow: { border: 'border-l-yellow-400', dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800', row: 'hover:bg-yellow-50', label: 'VIP' },
  red:    { border: 'border-l-red-400',    dot: 'bg-red-400',    badge: 'bg-red-100 text-red-700',       row: 'hover:bg-red-50',    label: 'Rojo' },
  blue:   { border: 'border-l-blue-400',   dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700',     row: 'hover:bg-slate-50',  label: 'Azul' },
} as const;

type ColorKey = keyof typeof COLOR;

function colorOf(c: Client): ColorKey {
  const g = c.groupColor?.toLowerCase();
  if (g === 'yellow' || c.isVip) return 'yellow';
  if (g === 'red') return 'red';
  return 'blue';
}

function Avatar({ client }: { client: Client }) {
  const cm = COLOR[colorOf(client)];
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0 ${cm.dot}`}>
      {client.firstName[0]}{client.lastName[0]}
    </span>
  );
}

function ClientTable({ clients, filter }: { clients: Client[]; filter: ColorKey | 'all' }) {
  const router = useRouter();
  const shown = filter === 'all' ? clients : clients.filter(c => colorOf(c) === filter);

  if (shown.length === 0) return (
    <p className="text-slate-400 text-sm text-center py-6">Sin resultados.</p>
  );

  // Within "all" view, sub-group by color (red then blue, no yellow here)
  const rows = filter === 'all'
    ? [...shown].sort((a, b) => {
        const order: Record<ColorKey, number> = { yellow: 0, red: 1, blue: 2 };
        return order[colorOf(a)] - order[colorOf(b)];
      })
    : shown;

  let lastColor: ColorKey | null = null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {rows.map((client, i) => {
        const col = colorOf(client);
        const cm = COLOR[col];
        const showDivider = filter === 'all' && col !== lastColor && i > 0;
        lastColor = col;

        return (
          <div key={client.id}>
            {showDivider && <div className="h-px bg-slate-100 mx-4" />}
            <div
              className={`flex items-center gap-4 px-4 py-3 border-l-4 ${cm.border} ${cm.row} transition-colors ${
                i < rows.length - 1 && !showDivider ? 'border-b border-slate-100' : ''
              }`}
            >
              <Avatar client={client} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {client.firstName} {client.lastName}
                  {client.isKnownRelation && (
                    <span className="ml-1 text-slate-400 text-xs" title="Conocidos entre sí">🔗</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 truncate">{client.phone || '—'}</p>
                {client.email && (
                  <p className="text-xs text-slate-300 truncate">{client.email}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {client.isVip && (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">VIP ★</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cm.badge}`}>
                  {cm.label}
                </span>
                {client.noShowCount > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      client.noShowCount >= 3 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {client.noShowCount} no-show{client.noShowCount > 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={() => router.push(`/clients/edit?id=${client.id}`)}
                  className="text-slate-400 hover:text-indigo-600 text-xs px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                  title="Editar cliente"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get<Client[]>('/clients')
      .then(setClients)
      .catch(() => setError('No se pudieron cargar los clientes.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const vipClients     = filtered.filter(c => colorOf(c) === 'yellow');
  const regularClients = filtered.filter(c => colorOf(c) !== 'yellow');
  const redCount  = regularClients.filter(c => colorOf(c) === 'red').length;
  const blueCount = regularClients.filter(c => colorOf(c) === 'blue').length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {clients.length} total · {vipClients.length} VIP · {regularClients.length} regulares
          </p>
        </div>
        <Link
          href="/clients/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Nuevo Cliente
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-sm"
        />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-8">

          {/* ── VIP section (yellow) — privacy wall ─────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <h2 className="text-sm font-semibold text-slate-700">
                VIP — Confidencial
              </h2>
              <span className="text-xs text-slate-400">({vipClients.length})</span>
              <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-full">
                🔒 Sección privada
              </span>
              <div className="flex-1 h-px bg-yellow-100 ml-1" />
            </div>
            <ClientTable clients={vipClients} filter="yellow" />
          </section>

          {/* Privacy divider — hard separation between VIP and regular */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-dashed border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-3 text-xs text-slate-400 font-medium tracking-wide uppercase">
                Clientes Regulares — visibilidad cruzada permitida
              </span>
            </div>
          </div>

          {/* ── Regular section (red + blue together) ───────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm font-semibold text-slate-700">Rojo</span>
                <span className="text-xs text-slate-400">({redCount})</span>
              </div>
              <span className="text-slate-300">+</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-400" />
                <span className="text-sm font-semibold text-slate-700">Azul</span>
                <span className="text-xs text-slate-400">({blueCount})</span>
              </div>
              <div className="flex-1 h-px bg-slate-100 ml-1" />
            </div>
            <ClientTable clients={regularClients} filter="all" />
          </section>

        </div>
      )}
    </AppLayout>
  );
}
