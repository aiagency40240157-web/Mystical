'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { getRole } from '@/lib/auth';

interface Relationship {
  id: string;
  clientA: { id: string; firstName: string; lastName: string };
  clientB: { id: string; firstName: string; lastName: string };
  confidence: number;
  confirmed: boolean;
  createdAt: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

export default function RelationshipsPage() {
  const router = useRouter();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add form state
  const [clientAId, setClientAId] = useState('');
  const [clientBId, setClientBId] = useState('');
  const [confidence, setConfidence] = useState('0.85');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    const role = getRole();
    if (role !== 'MANAGER') {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    load();
    loadClients();
  }, []);

  async function load() {
    try {
      const data = await api.get<Relationship[]>('/relationships');
      setRelationships(data);
    } catch {
      setError('Unable to process this request at this time.');
    } finally {
      setLoading(false);
    }
  }

  async function loadClients() {
    try {
      const data = await api.get<Client[]>('/clients');
      setClients(data);
    } catch {
      // silently fail — dropdowns will be empty
    }
  }

  async function handleConfirm(id: string) {
    try {
      await api.patch(`/relationships/${id}/confirm`);
      setRelationships((prev) =>
        prev.map((r) => (r.id === id ? { ...r, confirmed: true } : r))
      );
    } catch {
      setError('Unable to process this request at this time.');
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    const conf = parseFloat(confidence);
    if (isNaN(conf) || conf < 0 || conf > 1) {
      setAddError('Confidence must be a number between 0 and 1.');
      return;
    }
    setAddLoading(true);
    try {
      const newRel = await api.post<Relationship>('/relationships', {
        clientAId,
        clientBId,
        confidence: conf,
      });
      setRelationships((prev) => [...prev, newRel]);
      setClientAId('');
      setClientBId('');
      setConfidence('0.85');
    } catch {
      setAddError('Unable to process this request at this time.');
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Relationships</h1>

      {/* Add Relationship Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Add Relationship</h2>
        {addError && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4">
            <p className="text-red-700 text-sm">{addError}</p>
          </div>
        )}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente A</label>
            <select
              required
              value={clientAId}
              onChange={(e) => setClientAId(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52 bg-white"
            >
              <option value="">Buscar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente B</label>
            <select
              required
              value={clientBId}
              onChange={(e) => setClientBId(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52 bg-white"
            >
              <option value="">Buscar cliente...</option>
              {clients
                .filter((c) => c.id !== clientAId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confianza (0–1)</label>
            <input
              type="number"
              required
              min="0"
              max="1"
              step="0.01"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              placeholder="0.85"
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
            />
          </div>
          <button
            type="submit"
            disabled={addLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {addLoading ? 'Adding...' : 'Add'}
          </button>
        </form>
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
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Client A</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Client B</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Confidence</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Confirmed</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Created</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {relationships.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No relationships found.
                  </td>
                </tr>
              ) : (
                relationships.map((rel) => (
                  <tr key={rel.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {rel.clientA.firstName} {rel.clientA.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {rel.clientB.firstName} {rel.clientB.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(rel.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rel.confirmed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {format(new Date(rel.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {!rel.confirmed && (
                        <button
                          onClick={() => handleConfirm(rel.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        >
                          Confirm
                        </button>
                      )}
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
