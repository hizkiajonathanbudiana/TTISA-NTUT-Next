"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { User } from 'firebase/auth';
import type {
  CmsEventReview,
  EventDetailPayload,
} from '@/types/content';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslation } from '@/providers/LanguageProvider';
import { LoadingHamster } from '@/components/public/LoadingHamster';

interface EventDetailClientProps {
  slug: string;
}

interface ReviewResponse {
  review: CmsEventReview;
}

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating.').max(5, 'Rating must be at most 5.'),
  comment: z.string().max(500, 'Comment is too long.').optional().or(z.literal('')),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

const StatusMessage = ({ message }: { message: string }) => (
  <div className="container py-20 text-center text-sm text-text-secondary">{message}</div>
);

const formatDateRange = (start?: Date, end?: Date | null) => {
  if (!start) return '—';
  const startText = start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  if (!end) {
    return startText;
  }
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${startText} · ${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }
  const endText = end.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startText} → ${endText}`;
};

const formatTimeRange = (start?: Date, end?: Date | null) => {
  if (!start) return '—';
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!end) return startTime;
  return `${startTime} – ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};

const reviveEventPayload = (payload: EventDetailPayload): EventDetailPayload => ({
  event: {
    ...payload.event,
    startDate: new Date(payload.event.startDate),
    endDate: payload.event.endDate ? new Date(payload.event.endDate) : null,
  },
  registration: payload.registration
    ? {
        ...payload.registration,
        createdAt: new Date(payload.registration.createdAt),
      }
    : null,
  paymentInstructions: payload.paymentInstructions,
  proofContacts: payload.proofContacts,
  reviews: payload.reviews.map((review) => ({
    ...review,
    createdAt: new Date(review.createdAt),
  })),
});

const withAuthHeaders = async (user: User | null): Promise<HeadersInit> => {
  if (!user) {
    throw new Error('Please sign in to continue.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  } satisfies HeadersInit;
};

const fetchEventDetail = async (slug: string, user: User | null): Promise<EventDetailPayload> => {
  const headers: HeadersInit = user ? await withAuthHeaders(user).catch(() => ({})) : {};
  const response = await fetch(`/api/events/${slug}`, {
    headers,
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const reason = typeof payload.error === 'string' ? payload.error : 'Unable to load this event.';
    throw new Error(reason);
  }
  const data = (await response.json()) as EventDetailPayload;
  return reviveEventPayload(data);
};

async function postWithAuth<T>(url: string, user: User | null, body: Record<string, unknown> = {}) {
  const headers = await withAuthHeaders(user);
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const reason = typeof payload.error === 'string' ? payload.error : 'Request failed.';
    throw new Error(reason);
  }
  return response.json() as Promise<T>;
}

const isNextImageAllowed = (src: string) => {
  try {
    const url = new URL(src);
    return ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com', 'api.dicebear.com', 'res.cloudinary.com'].includes(url.hostname);
  } catch {
    return src.startsWith('/');
  }
};

const extractGoogleDriveFolderId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const folderMatch = parsed.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch?.[1]) {
      return folderMatch[1];
    }
    const queryId = parsed.searchParams.get('id');
    if (queryId) {
      return queryId;
    }
    return null;
  } catch {
    return null;
  }
};

const toDriveEmbedUrl = (url: string): string | null => {
  const folderId = extractGoogleDriveFolderId(url);
  if (!folderId) {
    return null;
  }
  return `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#grid`;
};

export const EventDetailClient = ({ slug }: EventDetailClientProps) => {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [showShareQr, setShowShareQr] = useState(false);
  const [origin, setOrigin] = useState('');
  const shareQrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const detailQuery = useQuery({
    queryKey: ['event-detail', slug, user?.uid ?? 'anon'],
    queryFn: () => fetchEventDetail(slug, user ?? null),
    enabled: Boolean(slug),
  });

  const event = detailQuery.data?.event;
  const registration = detailQuery.data?.registration ?? null;
  const reviews = detailQuery.data?.reviews ?? [];

  const localizedTitle = language === 'zh-HANT' && event?.titleZhHant ? event.titleZhHant : event?.title;
  const localizedSummary = language === 'zh-HANT' && event?.summaryZhHant ? event.summaryZhHant : event?.summary;
  const localizedDescription = language === 'zh-HANT' && event?.descriptionZhHant ? event.descriptionZhHant : event?.description;
  const localizedCtaText = language === 'zh-HANT' && event?.ctaTextZhHant ? event.ctaTextZhHant : event?.ctaTextEn;
  const driveEmbedUrl = useMemo(() => {
    if (!event?.mediaDriveUrl) {
      return null;
    }
    return toDriveEmbedUrl(event.mediaDriveUrl);
  }, [event?.mediaDriveUrl]);

  const dateRange = useMemo(() => (event ? formatDateRange(event.startDate, event.endDate) : '—'), [event]);
  const timeRange = useMemo(() => (event ? formatTimeRange(event.startDate, event.endDate) : '—'), [event]);
  const priceLabel = typeof event?.price === 'number' ? `NT$ ${event.price.toLocaleString()}` : t('events.details.freeLabel');
  const isPaidEvent = Boolean(event?.isPaid || typeof event?.price === 'number');
  const eventShareUrl = useMemo(() => {
    const path = `/events/${slug}`;
    return origin ? `${origin}${path}` : path;
  }, [origin, slug]);

  const hasReviewed = Boolean(user && reviews.some((review) => review.userId === user.uid));
  const canReview = Boolean(
    event &&
      registration?.attendanceId &&
      event.endDate &&
      event.endDate < new Date() &&
      !hasReviewed,
  );

  const invalidateEvent = async () => {
    await queryClient.invalidateQueries({ queryKey: ['event-detail', slug, user?.uid ?? 'anon'] });
  };

  const requireEvent = () => {
    if (!event) {
      throw new Error('Event is unavailable.');
    }
    return event;
  };

  const reviewMutation = useMutation({
    mutationFn: (values: ReviewFormValues) => {
      const currentEvent = requireEvent();
      return postWithAuth<ReviewResponse>(`/api/events/${currentEvent.slug}/reviews`, user, values);
    },
    onSuccess: async () => {
      toast.success(t('events.detail.reviewSuccess'));
      await invalidateEvent();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('events.detail.reviewError'));
    },
  });

  const handleShare = async () => {
    setShowShareQr(true);
    try {
      if (navigator.share && event) {
        await navigator.share({
          title: localizedTitle ?? 'TTISA Event',
          text: localizedSummary ?? undefined,
          url: eventShareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(eventShareUrl);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2500);
    } catch (error) {
      console.warn('Share failed', error);
      toast.error(t('events.detail.shareError'));
    }
  };

  const handleSaveShareQr = () => {
    const svg = shareQrRef.current?.querySelector('svg');
    if (!svg) {
      toast.error('QR code is not ready yet.');
      return;
    }

    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-${slug}-qr.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (detailQuery.isLoading) {
    return (
      <div className="container py-20 text-center">
        <LoadingHamster />
      </div>
    );
  }

  if (detailQuery.isError) {
    return <StatusMessage message={t('events.errorDetail')} />;
  }

  if (!event) {
    return (
      <div className="container py-20 text-center">
        <p className="text-2xl font-bold text-text-primary">{t('events.notFound.title')}</p>
        <p className="mt-2 text-text-secondary">{t('events.notFound.description')}</p>
        <Link href="/events" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          ← {t('events.backToEvents')}
        </Link>
      </div>
    );
  }

  const heroImage = event.heroImageUrl ?? event.coverImageUrl ?? null;

  const handleRegisterClick = () => {
    router.push(`/events/${slug}/register`);
  };

  return (
    <div className="bg-background pt-[80px]">
      <section className="relative isolate overflow-hidden">
        {heroImage && (
          isNextImageAllowed(heroImage) ? (
            <Image
              src={heroImage}
              alt={localizedTitle ?? event.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
          )
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/30" />
        <div className="container relative z-10 flex flex-col gap-6 px-4 py-24 text-white md:px-0">
          <Link href="/events" className="text-sm font-semibold text-white/80 hover:text-white">
            ← {t('events.backToEvents')}
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">TTISA EVENT</p>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">{localizedTitle ?? event.title}</h1>
            <p className="max-w-3xl text-base text-white/80">
              {localizedSummary ?? t('events.details.descriptionFallback')}
            </p>
          </motion.div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">{dateRange}</span>
            <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">{timeRange}</span>
            <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">{event.location ?? t('events.details.locationFallback')}</span>
          </div>
        </div>
      </section>

      <div className="container grid gap-6 px-4 py-16 md:px-0 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-3xl border border-white/10 bg-white/70 p-6 text-base leading-relaxed shadow-sm shadow-black/10 backdrop-blur md:p-8">
          <h2 className="text-2xl font-bold text-text-primary">{t('events.detailsTitle')}</h2>
          <p className="mt-4 whitespace-pre-wrap text-text-secondary">
            {localizedDescription ?? localizedSummary ?? t('events.details.descriptionFallback')}
          </p>
          {event.mediaDriveUrl && (
            <section className="mt-8 rounded-2xl border border-border bg-white/70 p-4">
              <h3 className="text-lg font-semibold text-text-primary">Drive photo/video here</h3>
              <a
                href={event.mediaDriveUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Open Google Drive folder
              </a>
              {driveEmbedUrl && (
                <iframe
                  src={driveEmbedUrl}
                  title="Event media from Google Drive"
                  className="mt-4 h-[420px] w-full rounded-xl border border-border"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
            </section>
          )}
          {event.ctaPostSlug && localizedCtaText && (
            <CallToAction slug={event.ctaPostSlug} text={localizedCtaText} title={t('events.detail.relatedPost')} />
          )}
          {canReview && (
            <ReviewForm
              isSubmitting={reviewMutation.isPending}
              onSubmit={(values) => reviewMutation.mutate(values)}
              t={t}
            />
          )}
          <ReviewList reviews={reviews} t={t} />
        </article>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-border bg-white/80 p-6 shadow-sm shadow-black/10 backdrop-blur">
            <RegistrationButton
              status={registration?.status ?? null}
              isPaid={isPaidEvent}
              onClick={handleRegisterClick}
              t={t}
              eventEnded={Boolean(event.endDate && event.endDate < new Date())}
            />
          </div>

          <div className="rounded-3xl border border-border bg-white/80 p-6 shadow-sm shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">{t('events.details.metaTitle')}</h3>
              {typeof event.price === 'number' && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{priceLabel}</span>
              )}
            </div>
            <dl className="mt-4 space-y-4 text-sm">
              <MetaRow label={t('events.details.dateLabel')} value={dateRange} />
              <MetaRow label={t('events.details.timeLabel')} value={timeRange} />
              <MetaRow label={t('events.details.locationLabel')} value={event.location ?? t('events.details.locationFallback')} />
              <MetaRow label={t('events.details.statusLabel')} value={event.status} highlight />
            </dl>
            <button
              type="button"
              onClick={handleShare}
              className="mt-6 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {shareState === 'copied' ? t('events.details.shareSuccess') : t('events.details.shareLabel')}
            </button>
            {showShareQr && (
              <div className="mt-4 rounded-2xl border border-border bg-white p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
                  {t('events.details.shareQrLabel')}
                </p>
                <div ref={shareQrRef} className="mt-3 flex justify-center">
                  <QRCodeSVG value={eventShareUrl} size={140} />
                </div>
                <button
                  type="button"
                  onClick={handleSaveShareQr}
                  className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary hover:text-primary"
                >
                  Save QR
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

const MetaRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex flex-col gap-1 border-b border-border/70 pb-4 last:border-b-0 last:pb-0">
    <dt className="text-xs uppercase tracking-[0.3em] text-text-secondary">{label}</dt>
    <dd className={clsx('font-semibold', highlight && 'text-primary capitalize')}>{value}</dd>
  </div>
);

const CallToAction = ({ slug, text, title }: { slug: string; text: string; title: string }) => {
  const [showQr, setShowQr] = useState(false);
  const href = `/posts/${slug}`;
  const fullLink = typeof window !== 'undefined' ? `${window.location.origin}${href}` : href;

  return (
    <div className="mt-8 border-t border-white/40 pt-6 text-center">
      <h3 className="text-xl font-bold text-text-primary">{title}</h3>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <Link
          href={href}
          className="rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-secondary/40"
        >
          {text}
        </Link>
        <button
          type="button"
          onClick={() => setShowQr((prev) => !prev)}
          className="rounded-full border border-white/50 p-3 text-white/80 transition hover:border-white hover:text-white"
        >
          QR
        </button>
      </div>
      {showQr && (
        <div className="mt-4 inline-flex rounded-2xl bg-white p-4 shadow-lg">
          <QRCodeSVG value={fullLink} size={120} />
        </div>
      )}
    </div>
  );
};

const RegistrationButton = ({
  status,
  isPaid,
  onClick,
  t,
  eventEnded,
}: {
  status: string | null;
  isPaid: boolean;
  onClick: () => void;
  t: (key: string) => string;
  eventEnded: boolean;
}) => {
  if (eventEnded && !status) {
    return (
      <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-center text-sm font-semibold text-text-secondary">
        {t('events.detail.eventEnded')}
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="rounded-2xl bg-secondary px-4 py-3 text-center text-sm font-semibold text-white">
        {t('events.detail.accepted')}
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="rounded-2xl bg-system-danger/90 px-4 py-3 text-center text-sm font-semibold text-white">
        {t('events.detail.rejected')}
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800"
      >
        {isPaid ? t('events.detail.pendingPayment') : t('events.detail.pending')}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
      onClick={onClick}
    >
      {t('events.detail.register')}
      {isPaid && <span className="ml-2 text-xs uppercase tracking-[0.3em]">{t('events.detail.paidLabel')}</span>}
    </button>
  );
};

const ReviewForm = ({
  isSubmitting,
  onSubmit,
  t,
}: {
  isSubmitting: boolean;
  onSubmit: (values: ReviewFormValues) => void;
  t: (key: string) => string;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, comment: '' },
  });

  const submitHandler = (values: ReviewFormValues) => {
    onSubmit({ ...values, rating: Number(values.rating) });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="mt-8 space-y-4 rounded-2xl border border-white/40 bg-white/60 p-4">
      <h3 className="text-lg font-semibold text-text-primary">{t('events.detail.reviewForm.title')}</h3>
      <label className="flex flex-col gap-2 text-sm font-medium text-text-secondary">
        {t('events.detail.reviewForm.ratingLabel')}
        <select
          {...register('rating', { valueAsNumber: true })}
          className="rounded-2xl border border-border px-3 py-2"
        >
          <option value="">{t('events.detail.reviewForm.ratingPlaceholder')}</option>
          {[5, 4, 3, 2, 1].map((score) => (
            <option key={score} value={score}>
              {score} ⭐
            </option>
          ))}
        </select>
        {errors.rating && <span className="text-xs text-system-danger">{t('events.detail.reviewForm.ratingError')}</span>}
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-text-secondary">
        {t('events.detail.reviewForm.commentLabel')}
        <textarea
          {...register('comment')}
          rows={3}
          className="rounded-2xl border border-border px-3 py-2"
        />
        {errors.comment && <span className="text-xs text-system-danger">{t('events.detail.reviewForm.commentError')}</span>}
      </label>
      <button
        type="submit"
        className="w-full rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? t('events.detail.reviewForm.submitting') : t('events.detail.reviewForm.submit')}
      </button>
    </form>
  );
};

const ReviewList = ({ reviews, t }: { reviews: CmsEventReview[]; t: (key: string) => string }) => {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-6">
      <h3 className="text-lg font-semibold text-text-primary">{t('events.detail.reviewList.title')}</h3>
      {reviews.map((review) => (
        <div key={review.id} className="flex gap-4 rounded-2xl border border-white/30 bg-white/50 p-4">
          <Image
            src={review.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(review.englishName ?? 'TTISA')}`}
            alt={review.englishName ?? t('events.detail.reviewList.avatarAlt')}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full border border-white/60 object-cover"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold text-text-primary">{review.englishName ?? t('events.detail.reviewList.anonymous')}</p>
              <span className="text-sm text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">{review.comment ?? t('events.detail.reviewList.commentFallback')}</p>
            <p className="mt-2 text-xs text-text-secondary/70">{review.createdAt.toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
