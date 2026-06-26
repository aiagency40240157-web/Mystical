'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getRole } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', roles: ['MANAGER', 'AGENT', 'ASSISTANT'] },
  { href: '/appointments', label: 'Appointments', roles: ['MANAGER', 'AGENT', 'ASSISTANT'] },
  { href: '/appointments/new', label: '+ New Appointment', roles: ['MANAGER', 'AGENT', 'ASSISTANT'] },
  { href: '/clients', label: 'Clients', roles: ['MANAGER', 'AGENT', 'ASSISTANT'] },
  { href: '/services', label: 'Services', roles: ['MANAGER', 'AGENT', 'ASSISTANT'] },
  { href: '/waitlist', label: 'Waitlist', roles: ['MANAGER', 'AGENT', 'ASSISTANT'] },
  { href: '/analytics', label: 'Analytics', roles: ['MANAGER', 'ASSISTANT'] },
  { href: '/audit', label: 'Audit Logs', roles: ['MANAGER', 'ASSISTANT'] },
  { href: '/credits', label: 'Credits', roles: ['MANAGER', 'AGENT'] },
  { href: '/relationships', label: 'Relationships', roles: ['MANAGER'] },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState('');

  useEffect(() => {
    setRole(getRole() ?? '');
  }, []);

  function logout() {
    clearAuth();
    router.push('/login');
  }

  const visible = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-60 bg-slate-900 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-white font-bold text-lg tracking-tight">Mystical</span>
        <p className="text-slate-400 text-xs mt-0.5">{role}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
