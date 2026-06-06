import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mystical Scheduling',
  description: 'Privacy-aware therapy scheduling platform',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
