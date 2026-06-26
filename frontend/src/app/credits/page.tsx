'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';

interface ClientRef {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface CreditEntry {
  id: string;
  client: ClientRef;
  amount: number;
  paidAmount: number;
  balance: number;
  type: string;
  description?: string;
  createdBy: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  appointment: 'Appointment',
  product: 'Product',
};

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [clients, setClients] = useState<ClientRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clientId: '',
    amount: '',
    type: 'appointment',
    description: '',
  });

  useEffect(() => {
    Promise.all([
      api.get<CreditEntry[]>('/financial/credits'),
      api.get<ClientRef[]>('/clients'),
    ])
      .then(([c, cl]) => {
        setCredits(c);
        setClients(cl);
      })
      .catch(() => setError('Unable to load data.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddCredit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.amount) return;
    setSaving(true);
    try {
      const created = await api.post<CreditEntry>('/financial/credits', {
        clientId: form.clientId,
        amount: parseFloat(form.amount),
        type: form.type,
        description: form.description || undefined,
      });
      setCredits((prev) => [{ ...created, balance: created.amount - created.paidAmount }, ...prev]);
      setForm({ clientId: '', amount: '', type: 'appointment', description: '' });
      setShowForm(false);
    } catch {
      setError('Failed to save credit.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePayment(id: string) {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    const entry = credits.find((c) => c.id === id);
    if (!entry) return;
    setSaving(true);
    try {
      const updated = await api.patch<CreditEntry>(`/financial/credits/${id}`, {
        paidAmount: Math.min(entry.paidAmount + amount, entry.amount),
      });
      setCredits((prev) =>
        prev.map((c) =>
          c.id === id ? { ...updated, balance: updated.amount - updated.paidAmount } : c,
        ),
      );
      setPayingId(null);
      setPayAmount('');
    } catch {
      setError('Failed to update payment.');
    } finally {
      setSaving(false);
    }
  }

  const outstanding = credits.filter((c) => c.balance > 0.001);
  const paid = credits.filter((c) => c.balance <= 0.001);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Client Credits</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
        >
          + Add Credit
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">New Credit Entry</h2>
          <form onSubmit={handleAddCredit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Client</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                required
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="appointment">Appointment</option>
                <option value="product">Product</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional note"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                Outstanding ({outstanding.length})
              </h2>
            </div>
            {outstanding.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No outstanding credits.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Credit</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Paid</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Note</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outstanding.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {c.client.firstName} {c.client.lastName}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {TYPE_LABELS[c.type] ?? c.type}
                      </td>
                      <td className="px-6 py-3 text-slate-900">${c.amount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-green-700">${c.paidAmount.toFixed(2)}</td>
                      <td className="px-6 py-3 font-semibold text-red-600">${c.balance.toFixed(2)}</td>
                      <td className="px-6 py-3 text-slate-500 text-xs">{c.description ?? '—'}</td>
                      <td className="px-6 py-3">
                        {payingId === c.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                              placeholder="Amount"
                              className="w-24 border border-slate-300 rounded px-2 py-1 text-xs"
                            />
                            <button
                              onClick={() => handlePayment(c.id)}
                              disabled={saving}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => { setPayingId(null); setPayAmount(''); }}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPayingId(c.id)}
                            className="text-xs px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
                          >
                            Register payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {paid.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">Paid ({paid.length})</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paid.map((c) => (
                    <tr key={c.id} className="opacity-60">
                      <td className="px-6 py-3 text-slate-700">{c.client.firstName} {c.client.lastName}</td>
                      <td className="px-6 py-3 text-slate-500">{TYPE_LABELS[c.type] ?? c.type}</td>
                      <td className="px-6 py-3 text-slate-700">${c.amount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-slate-400 text-xs">{c.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
