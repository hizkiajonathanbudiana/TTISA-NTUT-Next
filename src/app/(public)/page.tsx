'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslation } from '@/providers/LanguageProvider';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPaginatedEvents,
  fetchHomepagePromoContent,
  fetchSocialLinks,
  fetchTestimonials,
} from '@/lib/data/publicContent';
import { WaveSeparator } from '@/components/public/WaveSeparator';
import { LoadingHamster } from '@/components/public/LoadingHamster';
import type { CmsEvent, CmsTestimonial } from '@/types/content';

const heroShapes = [
  'absolute top-[5%] left-[10%] w-72 h-72 lg:w-96 lg:h-96 bg-accent-blue rounded-full filter blur-3xl',
  'absolute bottom-[10%] right-[5%] w-72 h-72 lg:w-96 lg:h-96 bg-accent-green rounded-full filter blur-3xl',
  'absolute top-[20%] right-[15%] w-64 h-64 lg:w-80 lg:h-80 bg-accent-purple rounded-full filter blur-3xl',
];

const AnimatedSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.section
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.8, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.section>
);

const PromoCard = ({ imageUrl, title, copy }: { imageUrl?: string | null; title: string; copy: string }) => (
  <div className="h-full overflow-hidden rounded-2xl border border-white/20 bg-white/60 shadow-lg backdrop-blur-lg">
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm font-semibold text-text-secondary">
          Promotion Image
        </div>
      )}
    </div>
    <div className="p-6 text-left">
      <h3 className="text-xl font-bold text-text-primary">{title}</h3>
      <p className="mt-3 text-text-secondary">{copy}</p>
    </div>
  </div>
);

const formatEventDate = (date: Date) => {
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  return { month, day };
};

const EventCard = ({ event }: { event: CmsEvent }) => {
  const { month, day } = formatEventDate(event.startDate);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="flex h-full items-center rounded-2xl border border-white/20 bg-white/50 p-4 shadow-md transition-shadow duration-300 hover:shadow-xl backdrop-blur-lg"
    >
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-sm font-bold text-secondary">{month}</p>
        <p className="text-3xl font-bold text-text-primary">{day}</p>
      </div>
      <div className="ml-4 border-l border-white/30 pl-4">
        <h3 className="font-bold text-text-primary leading-tight">{event.title}</h3>
        <p className="mt-1 text-xs text-text-secondary">{event.location ?? 'Location TBD'}</p>
      </div>
    </Link>
  );
};

const TestimonialCard = ({ testimonial }: { testimonial: CmsTestimonial }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
  >
    <div className="h-full rounded-lg bg-white/50 p-6 text-left shadow-lg">
      <p className="text-text-secondary italic">“{testimonial.comment ?? ''}”</p>
      <div className="mt-4 flex items-center">
        <div className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-muted">
          {testimonial.avatarUrl ? (
            <Image src={testimonial.avatarUrl} alt={testimonial.englishName ?? ''} width={40} height={40} />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-text-primary">
              {(testimonial.englishName ?? 'TTISA')[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <p className="font-bold text-text-primary">{testimonial.englishName ?? 'TTISA Member'}</p>
      </div>
    </div>
  </motion.div>
);

export default function HomePage() {
  const { t, language } = useTranslation();

  const {
    data: homepagePromo,
  } = useQuery({
    queryKey: ['homepage-promo', language],
    queryFn: () => fetchHomepagePromoContent(language),
  });

  const {
    data: upcomingEventsData,
    isLoading: isLoadingUpcomingEvents,
  } = useQuery({
    queryKey: ['events', 'homepage', 'upcoming'],
    queryFn: () => fetchPaginatedEvents('upcoming', 3),
  });

  const {
    data: pastEventsData,
    isLoading: isLoadingPastEvents,
  } = useQuery({
    queryKey: ['events', 'homepage', 'past'],
    queryFn: () => fetchPaginatedEvents('past', 3),
  });

  const { data: socialLinks } = useQuery({
    queryKey: ['social_links', 'homepage'],
    queryFn: fetchSocialLinks,
  });

  const {
    data: testimonials,
    isLoading: isLoadingTestimonials,
  } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => fetchTestimonials(6),
  });

  const isLoadingHome = isLoadingUpcomingEvents || isLoadingPastEvents || isLoadingTestimonials;
  const upcomingEvents = upcomingEventsData?.data ?? [];
  const pastEvents = pastEventsData?.data ?? [];
  const instagramLink = socialLinks?.find((item) => item.platform === 'instagram')?.url ?? null;

  const fallbackPromoCards = [
    {
      title: t('homepage.featureCulturalTitle'),
      body: t('homepage.featureCulturalText'),
      imageUrl: null,
    },
    {
      title: t('homepage.featureAcademicTitle'),
      body: t('homepage.featureAcademicText'),
      imageUrl: null,
    },
    {
      title: t('homepage.featureSocialTitle'),
      body: t('homepage.featureSocialText'),
      imageUrl: null,
    },
  ];

  const promoTitle = homepagePromo?.title || t('homepage.whatWeDoTitle');
  const promoSubtitle = homepagePromo?.subtitle || t('homepage.whatWeDoSubtitle');
  const promoCards = homepagePromo?.cards.length
    ? homepagePromo.cards
    : fallbackPromoCards;

  return (
    <div className="bg-background">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 text-center">
        <div className="absolute inset-0 z-0">
          {heroShapes.map((shape, idx) => (
            <div
              key={idx}
              className={shape}
              style={{ animation: `aura-pulse ${8 + idx * 2}s infinite alternate${idx % 2 ? '-reverse' : ''}` }}
            />
          ))}
        </div>
        <div className="relative z-10 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-text-primary md:text-6xl"
          >
            {t('homepage.heroTitle')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl text-lg text-text-secondary md:text-xl"
          >
            {t('homepage.heroSubtitle')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link
              href="/events"
              className="inline-flex items-center rounded-full bg-text-primary px-8 py-4 text-lg font-bold text-background shadow-xl transition-transform duration-300 hover:scale-105 hover:bg-neutral-700"
            >
              {t('homepage.heroButton')}
            </Link>
          </motion.div>
        </div>
      </section>

      <AnimatedSection className="bg-white/30 py-20 backdrop-blur-sm">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-text-primary">{promoTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-text-secondary">{promoSubtitle}</p>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {promoCards.map((card, idx) => (
              <PromoCard
                key={`${card.title}-${idx}`}
                imageUrl={card.imageUrl}
                title={card.title}
                copy={card.body}
              />
            ))}
          </div>
        </div>
      </AnimatedSection>

      {isLoadingHome ? (
        <LoadingHamster />
      ) : (
        <>
          <>
            <WaveSeparator />
            <AnimatedSection className="py-20">
              <div className="container mx-auto px-4">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-text-primary">{t('homepage.eventsTitle')}</h2>
                </div>
                {upcomingEvents.length > 0 ? (
                  <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.map((event, idx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                      >
                        <EventCard event={event} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-10 text-center text-sm text-text-secondary">{t('events.noUpcoming')}</p>
                )}
                <div className="mt-12 text-center">
                  <Link href="/events" className="font-bold text-primary hover:underline">
                    {t('homepage.eventsButton')} →
                  </Link>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection className="py-20 pt-0">
              <div className="container mx-auto px-4">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-text-primary">{t('homepage.pastEventsTitle')}</h2>
                </div>
                {pastEvents.length > 0 ? (
                  <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {pastEvents.map((event, idx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                      >
                        <EventCard event={event} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-10 text-center text-sm text-text-secondary">{t('events.noPast')}</p>
                )}
                <div className="mt-12 text-center">
                  <Link href="/events" className="font-bold text-primary hover:underline">
                    {t('homepage.pastEventsButton')} →
                  </Link>
                </div>
              </div>
            </AnimatedSection>
          </>

          {instagramLink && (
            <AnimatedSection className="bg-white/30 py-20 backdrop-blur-sm">
              <div className="container mx-auto px-4">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-text-primary">{t('homepage.instagramTitle')}</h2>
                  <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
                    {t('homepage.instagramSubtitle')}
                  </p>
                </div>
                <div className="mt-12 text-center">
                  <a
                    href={instagramLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-primary-hover"
                  >
                    {t('homepage.instagramButton')}
                  </a>
                </div>
              </div>
            </AnimatedSection>
          )}

          {testimonials && testimonials.length > 0 && (
            <AnimatedSection className="py-20">
              <div className="container mx-auto px-6 text-center">
                <h2 className="mb-12 text-3xl font-bold text-text-primary">{t('homepage.reviewsTitle')}</h2>
                <div className="grid gap-8 md:grid-cols-3">
                  {testimonials.map((testimonial) => (
                    <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                  ))}
                </div>
              </div>
            </AnimatedSection>
          )}
        </>
      )}
    </div>
  );
}
