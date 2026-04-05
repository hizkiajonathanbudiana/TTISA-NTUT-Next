'use client';

import Link from 'next/link';
import { useTranslation } from '@/providers/LanguageProvider';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPaginatedEvents } from '@/lib/data/publicContent';
import InfiniteScroll from 'react-infinite-scroll-component';
import { motion } from 'framer-motion';
import { LoadingHamster } from '@/components/public/LoadingHamster';
import type { CmsEvent } from '@/types/content';

const EventCard = ({ event }: { event: CmsEvent }) => {
  const { language } = useTranslation();
  const eventDate = new Date(event.startDate);
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = eventDate.getDate();
  const title = language === 'zh-HANT' && event.titleZhHant ? event.titleZhHant : event.title;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="block h-full rounded-2xl border border-white/20 bg-white/50 p-4 shadow-md backdrop-blur-lg transition-shadow duration-300 hover:shadow-xl"
    >
      <div className="flex items-center">
        <div className="w-16 flex-shrink-0 text-center">
          <p className="text-sm font-bold text-secondary">{month}</p>
          <p className="text-3xl font-bold text-text-primary">{day}</p>
        </div>
        <div className="ml-4 border-l border-white/30 pl-4">
          <h3 className="font-bold leading-tight text-text-primary">{title}</h3>
          <p className="mt-1 text-xs text-text-secondary">{event.location ?? 'Location TBD'}</p>
        </div>
      </div>
    </Link>
  );
};

export default function EventsPage() {
  const { t } = useTranslation();

  const {
    data: upcomingData,
    fetchNextPage: fetchNextUpcoming,
    hasNextPage: hasNextUpcoming,
    isLoading: isLoadingUpcoming,
  } = useInfiniteQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: ({ pageParam }) => fetchPaginatedEvents('upcoming', 9, pageParam ?? null),
    initialPageParam: null as Date | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const {
    data: pastData,
    fetchNextPage: fetchNextPast,
    hasNextPage: hasNextPast,
    isLoading: isLoadingPast,
  } = useInfiniteQuery({
    queryKey: ['events', 'past'],
    queryFn: ({ pageParam }) => fetchPaginatedEvents('past', 9, pageParam ?? null),
    initialPageParam: null as Date | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const upcomingEvents = upcomingData?.pages.flatMap((page) => page.data) ?? [];
  const pastEvents = pastData?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="bg-background">
      <section className="relative pt-40 pb-20 text-center">
        <div className="absolute inset-0 z-0 opacity-50">
          <div className="absolute top-[5%] left-[10%] h-72 w-72 rounded-full bg-accent-blue blur-3xl" />
          <div className="absolute bottom-[10%] right-[5%] h-72 w-72 rounded-full bg-accent-green blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-4">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-4xl font-extrabold text-text-primary md:text-6xl">
            {t('events.pageTitle')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-4 text-lg text-text-secondary md:text-xl"
          >
            {t('events.pageSubtitle')}
          </motion.p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">{t('events.upcoming')}</h2>
        {isLoadingUpcoming ? (
          <LoadingHamster />
        ) : upcomingEvents.length > 0 ? (
          <InfiniteScroll
            dataLength={upcomingEvents.length}
            next={fetchNextUpcoming}
            hasMore={Boolean(hasNextUpcoming)}
            loader={<p className="py-8 text-center text-text-secondary">Loading more…</p>}
            endMessage={<p className="py-8 text-center text-text-secondary">{t('events.noUpcoming')}</p>}
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </InfiniteScroll>
        ) : (
          <div className="rounded-lg bg-white/30 p-12 text-center text-text-secondary backdrop-blur-sm">
            {t('events.noUpcoming')}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">{t('events.past')}</h2>
        {isLoadingPast ? (
          <LoadingHamster />
        ) : pastEvents.length > 0 ? (
          <InfiniteScroll
            dataLength={pastEvents.length}
            next={fetchNextPast}
            hasMore={Boolean(hasNextPast)}
            loader={<p className="py-8 text-center text-text-secondary">Loading more…</p>}
            endMessage={<p className="py-8 text-center text-text-secondary">No more past events.</p>}
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </InfiniteScroll>
        ) : (
          <div className="rounded-lg bg-white/30 p-12 text-center text-text-secondary backdrop-blur-sm">
            {t('events.noPast')}
          </div>
        )}
      </section>
    </div>
  );
}
