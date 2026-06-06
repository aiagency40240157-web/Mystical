'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Nav from './Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Nav />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
