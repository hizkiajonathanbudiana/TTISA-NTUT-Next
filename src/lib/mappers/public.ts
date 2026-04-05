import type {
  CmsEvent,
  CmsEventReview,
  CmsPaymentInstruction,
  CmsProofContact,
} from '@/types/content';
import { coerceDate } from '@/lib/utils/dates';

const optionalString = (value: unknown, fallback: string | null = null): string | null => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const optionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const mapEventRecord = (id: string, record: Record<string, unknown>): CmsEvent => {
  const startDate = coerceDate(record.startDate ?? record.start_at);
  return {
    id,
    title: (record.title ?? record.titleEn ?? 'Untitled Event') as string,
    titleZhHant: optionalString(record.titleZhHant ?? record.title_zh_hant),
    slug: optionalString(record.slug, id) ?? id,
    summary: optionalString(record.summary ?? record.summaryEn),
    summaryZhHant: optionalString(record.summaryZhHant ?? record.summary_zh_hant),
    description: optionalString(record.description ?? record.descriptionEn ?? record.details),
    descriptionZhHant: optionalString(record.descriptionZhHant ?? record.description_zh_hant),
    coverImageUrl: optionalString(record.coverImageUrl ?? record.bannerUrl ?? record.banner_url ?? record.heroImageUrl),
    heroImageUrl: optionalString(record.heroImageUrl ?? record.bannerUrl ?? record.banner_url),
    mediaDriveUrl: optionalString(record.mediaDriveUrl ?? record.driveFolderUrl ?? record.galleryDriveUrl),
    startDate: startDate ?? new Date(),
    endDate: coerceDate(record.endDate ?? record.end_at),
    location: optionalString(record.location),
    status: (record.status ?? 'draft') as CmsEvent['status'],
    isPaid: Boolean(record.isPaid ?? record.is_paid),
    price:
      optionalNumber(record.price ?? record.fee ?? record.amount),
    ctaPostSlug: optionalString(record.ctaPostSlug ?? record.cta_post_slug),
    ctaTextEn: optionalString(record.ctaTextEn ?? record.cta_text_en),
    ctaTextZhHant: optionalString(record.ctaTextZhHant ?? record.cta_text_zh_hant),
  } satisfies CmsEvent;
};

export const mapPaymentInstructionRecord = (
  id: string,
  record: Record<string, unknown>,
): CmsPaymentInstruction => ({
  id,
  methodName: (record.methodName ?? record.method_name ?? 'Payment Method') as string,
  instructionsEn: optionalString(record.instructionsEn ?? record.instructions_en ?? '') ?? '',
  instructionsZhHant:
    optionalString(record.instructionsZhHant ?? record.instructions_zh_hant) ??
    optionalString(record.instructionsEn ?? record.instructions_en) ??
    '',
  isActive: Boolean(record.isActive ?? record.is_active ?? true),
  displayOrder: optionalNumber(record.displayOrder ?? record.display_order ?? 99) ?? 99,
});

export const mapProofContactRecord = (
  id: string,
  record: Record<string, unknown>,
): CmsProofContact => ({
  id,
  platform: (record.platform ?? 'line') as CmsProofContact['platform'],
  contactInfo: optionalString(record.contactInfo ?? record.contact_info ?? '') ?? '',
  displayOrder: optionalNumber(record.displayOrder ?? record.display_order ?? 99) ?? 99,
  isActive: Boolean(record.isActive ?? record.is_active ?? true),
});

export const mapEventReviewRecord = (
  id: string,
  record: Record<string, unknown>,
): CmsEventReview => ({
  id,
  userId: optionalString(record.userId ?? record.user_id ?? record.uid),
  englishName: optionalString(record.englishName ?? record.english_name),
  avatarUrl: optionalString(record.avatarUrl ?? record.avatar_url),
  rating: optionalNumber(record.rating ?? record.score) ?? 0,
  comment: optionalString(record.comment),
  createdAt: coerceDate(record.createdAt ?? record.created_at) ?? new Date(),
});
