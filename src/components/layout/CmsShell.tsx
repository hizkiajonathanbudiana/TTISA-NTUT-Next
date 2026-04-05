'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { RoleGate } from '@/components/auth/RoleGate';
import { Icon } from '@/components/Icon';
import { fetchUserProfile } from '@/lib/data/publicContent';
import { useAuth } from '@/providers/AuthProvider';

const navItems = [
  { href: '/cms', label: 'Dashboard', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5' },
  { href: '/cms/users', label: 'Users', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.67c.12-.14.237-.28.347-.42zM9.75 7.5a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z' },
  { href: '/cms/events', label: 'Events', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18' },
  { href: '/cms/teams', label: 'Teams', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.952a3 3 0 00-4.682 2.72 9.094 9.094 0 003.741.479m7.5-13.447a3 3 0 00-4.682-2.72 9.094 9.094 0 00-3.741-.479m-4.682 2.72a3 3 0 000 5.441m8.364-5.441a3 3 0 000 5.441' },
  { href: '/cms/content', label: 'Pages', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
  { href: '/cms/payments', label: 'Payments', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z' },
  { href: '/cms/socials', label: 'Socials', icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244' },
  { href: '/cms/emails', label: 'Emails', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
];

const getCmsPageTitle = (pathname: string) => {
  if (pathname === '/cms') return 'Dashboard';
  if (pathname === '/cms/users') return 'Users';
  if (/^\/cms\/users\/[^/]+$/.test(pathname)) return 'User Profile';
  if (pathname === '/cms/events') return 'Events';
  if (/^\/cms\/events\/[^/]+\/registrations$/.test(pathname)) return 'Event Registrations';
  if (pathname === '/cms/teams') return 'Teams';
  if (/^\/cms\/teams\/[^/]+$/.test(pathname)) return 'Team Members';
  if (pathname === '/cms/content') return 'Pages';
  if (pathname === '/cms/payments') return 'Payments';
  if (pathname === '/cms/socials') return 'Socials';
  if (pathname === '/cms/emails') return 'Emails';
  return 'CMS';
};

const SidebarContent = ({ pathname, closeSidebar }: { pathname: string; closeSidebar?: () => void }) => (
  <>
    <div className="flex items-center justify-between border-b border-border px-4 py-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">TTISA</p>
        <p className="text-xl font-black text-primary">Content Hub</p>
      </div>
      {closeSidebar && (
        <button type="button" onClick={closeSidebar} aria-label="Close menu" className="rounded-lg p-2 text-text-secondary hover:bg-neutral-100">
          <Icon path="M6 18L18 6M6 6l12 12" className="h-5 w-5" />
        </button>
      )}
    </div>
    <nav className="flex flex-1 flex-col gap-1 p-4 text-sm">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={closeSidebar}
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2 font-semibold transition-colors',
            pathname === item.href ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-neutral-100',
          )}
        >
          <Icon path={item.icon} className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  </>
);

export const CmsShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const title = getCmsPageTitle(pathname ?? '/cms');
    document.title = `${title} - TTISA NTUT`;
  }, [pathname]);

  const { data: profile } = useQuery({
    queryKey: ['cms-profile', user?.uid],
    enabled: Boolean(user?.uid),
    queryFn: async () => (user ? fetchUserProfile(user.uid) : null),
    staleTime: 1000 * 60 * 5,
  });

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <RoleGate allowedRoles={['admin', 'developer', 'organizer']} fallback={<div className="p-8 text-sm">Redirecting…</div>}>
      <div className="min-h-screen bg-neutral-100 lg:flex">
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-white shadow-xl transition-transform duration-300 lg:static lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarContent pathname={pathname} closeSidebar={closeSidebar} />
          <div className="border-t border-border p-4">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-danger px-3 py-2 text-sm font-semibold text-danger"
            >
              <Icon path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>
        {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeSidebar} />}

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-border bg-white/90 px-4 py-4 shadow-sm backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="rounded-lg p-2 text-text-secondary hover:bg-neutral-100 lg:hidden"
                aria-label="Open menu"
              >
                <Icon path="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" className="h-6 w-6" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">CMS</p>
                <p className="text-lg font-bold text-text-primary">Content Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-text-secondary">Welcome</p>
                <p className="text-sm font-bold text-text-primary">{profile?.englishName ?? user?.email ?? 'Admin'}</p>
              </div>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-primary/40 transition hover:bg-primary-hover lg:inline-flex"
              >
                View public site
                <span aria-hidden>↗</span>
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </RoleGate>
  );
};
