'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchCmsDashboardOverview } from '@/lib/data/publicContent';

const statCards: Array<{ label: string; href: string; key: 'totalUsers' | 'pendingRegistrations' | 'upcomingEvents' }> = [
  { label: 'Total Users', href: '/cms/users', key: 'totalUsers' },
  { label: 'Pending Registrations', href: '/cms/events', key: 'pendingRegistrations' },
  { label: 'Upcoming Events', href: '/cms/events', key: 'upcomingEvents' },
];

const formatEventDate = (date?: Date) => {
  if (!date) return 'TBA';
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
};

export default function CmsDashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['cms-dashboard-overview'],
    queryFn: fetchCmsDashboardOverview,
    staleTime: 1000 * 60,
  });

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-border bg-surface p-8 shadow-card">
        <p className="text-sm font-semibold text-primary">TTISA NTUT CMS</p>
        <h1 className="mt-2 text-3xl font-black text-text-primary">Dashboard</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Track real-time membership growth, approvals, and the next events queued to publish.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {statCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-surface to-surface p-6 shadow-card transition hover:-translate-y-1"
          >
            <p className="text-sm font-semibold text-text-secondary">{card.label}</p>
            <p className="mt-4 text-4xl font-black text-text-primary">
              {isLoading
                ? '—'
                : card.key === 'upcomingEvents'
                ? overview?.upcomingEvents.length ?? 0
                : overview?.[card.key] ?? 0}
            </p>
            <span className="mt-2 inline-flex items-center text-xs font-semibold text-primary">
              View details →
            </span>
          </Link>
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">Next 3 Upcoming Events</h2>
          <p className="text-sm text-text-secondary">Synced from the same Firebase collection that powers the public site.</p>
        </div>
        {isLoading ? (
          <div className="px-6 py-10 text-sm text-text-secondary">Loading upcoming events…</div>
        ) : overview && overview.upcomingEvents.length ? (
          <ul className="divide-y divide-border">
            {overview.upcomingEvents.map((event) => (
              <li key={event.id} className="px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-text-primary">{event.title}</p>
                    <p className="text-sm text-text-secondary">Slug: {event.slug}</p>
                  </div>
                  <p className="text-sm font-semibold text-text-secondary">{formatEventDate(event.startDate)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-10 text-sm text-text-secondary">No upcoming events scheduled.</div>
        )}
      </section>

      <section className="rounded-3xl border border-dashed border-border p-8 text-sm text-text-secondary">
        Need deeper analytics? Hook this dashboard to Cloud Functions that aggregate registrations, check-ins, and payments for a full parity experience.
      </section>
    </div>
  );
}

