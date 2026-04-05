'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { uploadCmsAsset } from '@/lib/firebase/storage';
import { useCmsCollection } from '@/hooks/useCmsCollection';
import type { CmsContentBlock } from '@/types/content';

const HEADER_KEY = 'homepage-what-we-do-header';
const CARD_KEYS = ['homepage-what-we-do-card-1', 'homepage-what-we-do-card-2', 'homepage-what-we-do-card-3'] as const;

type Locale = 'en' | 'zh-HANT';

type ContentRecord = CmsContentBlock & { imageUrl?: string | null };

const promoSchema = z.object({
  headerTitle: z.string().trim().min(1, 'Section title is required'),
  headerSubtitle: z.string().trim().min(1, 'Section subtitle is required'),
  card1Title: z.string().trim().min(1, 'Card 1 title is required'),
  card1Body: z.string().trim().min(1, 'Card 1 description is required'),
  card1ImageUrl: z.string().trim().url('Card 1 image must be a valid URL').or(z.literal('')),
  card2Title: z.string().trim().min(1, 'Card 2 title is required'),
  card2Body: z.string().trim().min(1, 'Card 2 description is required'),
  card2ImageUrl: z.string().trim().url('Card 2 image must be a valid URL').or(z.literal('')),
  card3Title: z.string().trim().min(1, 'Card 3 title is required'),
  card3Body: z.string().trim().min(1, 'Card 3 description is required'),
  card3ImageUrl: z.string().trim().url('Card 3 image must be a valid URL').or(z.literal('')),
});

type PromoFormValues = z.infer<typeof promoSchema>;

const defaultContentByLocale: Record<Locale, PromoFormValues> = {
  en: {
    headerTitle: 'What We Do',
    headerSubtitle: 'We are here to make your journey at NTUT unforgettable.',
    card1Title: 'Cultural Events',
    card1Body:
      'Experience diverse cultures through festivals, food fairs, and international celebrations right here on campus.',
    card1ImageUrl: '',
    card2Title: 'Academic Support',
    card2Body:
      'Get help with your studies, find resources, and connect with senior students through our workshops and mentoring programs.',
    card2ImageUrl: '',
    card3Title: 'Social Networking',
    card3Body: 'Make friends from all over the globe at our parties, sports events, and casual meetups.',
    card3ImageUrl: '',
  },
  'zh-HANT': {
    headerTitle: '?????',
    headerSubtitle: '??????????????????',
    card1Title: '????',
    card1Body: '???????????????,??????????',
    card1ImageUrl: '',
    card2Title: '????',
    card2Body: '?????????????,???????????,??????????',
    card2ImageUrl: '',
    card3Title: '????',
    card3Body: '?????????????????,????????????',
    card3ImageUrl: '',
  },
};

const TabButton = ({
  locale,
  active,
  onClick,
}: {
  locale: Locale;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'flex-1 rounded-2xl px-4 py-2 text-sm font-semibold',
      active ? 'bg-primary text-white shadow-primary/30' : 'bg-white text-text-secondary',
    )}
  >
    {locale === 'en' ? 'English' : '????'}
  </button>
);

export default function CmsContentPage() {
  const { items, isLoading, createItem, updateItem } = useCmsCollection<ContentRecord>('content');
  const [activeLocale, setActiveLocale] = useState<Locale>('en');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: defaultContentByLocale.en,
  });

  const blocksByLocale = useMemo(() => {
    return items.filter((item) => item.locale === activeLocale);
  }, [items, activeLocale]);

  const getBlock = (key: string) => blocksByLocale.find((item) => item.key === key);

  useEffect(() => {
    const header = getBlock(HEADER_KEY);
    const card1 = getBlock(CARD_KEYS[0]);
    const card2 = getBlock(CARD_KEYS[1]);
    const card3 = getBlock(CARD_KEYS[2]);

    reset({
      headerTitle: header?.title ?? defaultContentByLocale[activeLocale].headerTitle,
      headerSubtitle: header?.body ?? defaultContentByLocale[activeLocale].headerSubtitle,
      card1Title: card1?.title ?? defaultContentByLocale[activeLocale].card1Title,
      card1Body: card1?.body ?? defaultContentByLocale[activeLocale].card1Body,
      card1ImageUrl: card1?.imageUrl ?? defaultContentByLocale[activeLocale].card1ImageUrl,
      card2Title: card2?.title ?? defaultContentByLocale[activeLocale].card2Title,
      card2Body: card2?.body ?? defaultContentByLocale[activeLocale].card2Body,
      card2ImageUrl: card2?.imageUrl ?? defaultContentByLocale[activeLocale].card2ImageUrl,
      card3Title: card3?.title ?? defaultContentByLocale[activeLocale].card3Title,
      card3Body: card3?.body ?? defaultContentByLocale[activeLocale].card3Body,
      card3ImageUrl: card3?.imageUrl ?? defaultContentByLocale[activeLocale].card3ImageUrl,
    });
  }, [activeLocale, blocksByLocale, reset]);

  const upsertBlock = async (
    key: string,
    title: string,
    body: string,
    imageUrl: string | null = null,
  ) => {
    const existing = getBlock(key);
    const payload = {
      key,
      title,
      body,
      imageUrl,
      locale: activeLocale,
      category: 'homepage',
      status: 'published' as const,
    };

    if (existing) {
      await updateItem(existing.id, payload);
    } else {
      await createItem(payload);
    }
  };

  const uploadCardImage = async (fieldName: keyof PromoFormValues, file: File) => {
    const toastId = toast.loading('Uploading image...');
    try {
      const url = await uploadCmsAsset(file, { folder: 'cms/homepage-what-we-do' });
      setValue(fieldName, url, { shouldDirty: true });
      toast.success('Image uploaded', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed', { id: toastId });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await Promise.all([
        upsertBlock(HEADER_KEY, values.headerTitle, values.headerSubtitle),
        upsertBlock(CARD_KEYS[0], values.card1Title, values.card1Body, values.card1ImageUrl || null),
        upsertBlock(CARD_KEYS[1], values.card2Title, values.card2Body, values.card2ImageUrl || null),
        upsertBlock(CARD_KEYS[2], values.card3Title, values.card3Body, values.card3ImageUrl || null),
      ]);
      toast.success('Homepage promotion section updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save content');
    }
  });

  const cardConfigs = [
    { index: 1, titleField: 'card1Title', bodyField: 'card1Body', imageField: 'card1ImageUrl' },
    { index: 2, titleField: 'card2Title', bodyField: 'card2Body', imageField: 'card2ImageUrl' },
    { index: 3, titleField: 'card3Title', bodyField: 'card3Body', imageField: 'card3ImageUrl' },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-white to-indigo-50 p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">Content</p>
        <h1 className="mt-2 text-3xl font-black text-text-primary">Homepage Promotion: What We Do</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Edit this section to show promotional cards with image + text on the homepage.
        </p>
      </section>

      <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <div className="flex gap-3">
          <TabButton locale="en" active={activeLocale === 'en'} onClick={() => setActiveLocale('en')} />
          <TabButton locale="zh-HANT" active={activeLocale === 'zh-HANT'} onClick={() => setActiveLocale('zh-HANT')} />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-text-primary">Section Header</h2>
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-text-secondary">
              Title
              <input {...register('headerTitle')} className="mt-2 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-text-primary" />
              {errors.headerTitle && <span className="mt-1 block text-xs text-system-danger">{errors.headerTitle.message}</span>}
            </label>
            <label className="text-sm font-semibold text-text-secondary">
              Subtitle
              <textarea {...register('headerSubtitle')} rows={3} className="mt-2 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-text-primary" />
              {errors.headerSubtitle && <span className="mt-1 block text-xs text-system-danger">{errors.headerSubtitle.message}</span>}
            </label>
          </div>
        </div>

        {cardConfigs.map((card) => (
          <div key={card.index} className="rounded-3xl border border-border bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-text-primary">Card {card.index}</h3>
            <div className="mt-4 grid gap-4">
              <label className="text-sm font-semibold text-text-secondary">
                Title
                <input {...register(card.titleField)} className="mt-2 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-text-primary" />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Description
                <textarea {...register(card.bodyField)} rows={4} className="mt-2 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-text-primary" />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Image URL
                <input {...register(card.imageField)} className="mt-2 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-text-primary" />
              </label>
              <div className="rounded-2xl border border-dashed border-border p-4">
                <p className="text-xs text-text-secondary">Upload image directly</p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadCardImage(card.imageField, file);
                    }
                    event.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-3 rounded-3xl border border-dashed border-border bg-white p-4 shadow-card">
          <button
            type="submit"
            disabled={isSubmitting || (isLoading ? true : !isDirty)}
            className="rounded-2xl bg-primary px-6 py-2 font-semibold text-white shadow-primary/40 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving�' : 'Save section'}
          </button>
        </div>
      </form>
    </div>
  );
}

