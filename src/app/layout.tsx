import type { Metadata } from 'next';
import { AppProviders } from '@/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'TTISA NTUT',
    template: '%s - TTISA NTUT',
  },
  description: 'Next.js + Firebase rewrite that unifies CMS and public site for TTISA NTUT.',
  icons: {
    icon: '/ttisa-logo.png',
    shortcut: '/ttisa-logo.png',
    apple: '/ttisa-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
