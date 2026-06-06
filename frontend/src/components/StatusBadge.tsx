'use client';

const colors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-red-100 text-red-800',
  WAITLIST: 'bg-blue-100 text-blue-800',
  WAITLISTED: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  LOW: 'bg-slate-100 text-slate-600',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
