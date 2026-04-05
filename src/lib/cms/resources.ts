import { z } from 'zod';
import type { CmsRole } from '@/types/content';

export type CmsFieldType = 'text' | 'textarea' | 'select' | 'number' | 'datetime' | 'url' | 'boolean';

export interface CmsFieldConfig {
  name: string;
  label: string;
  type: CmsFieldType;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  options?: Array<{ label: string; value: string }>;
  table?: boolean;
}

export interface CmsResourceDefinition {
  title: string;
  description: string;
  collection: string;
  fields: CmsFieldConfig[];
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  defaults?: Record<string, unknown>;
  allowedRoles?: CmsRole[];
  useCustomIdField?: string;
}

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
];

const localeOptions = [
  { label: 'English', value: 'en' },
  { label: 'Traditional Chinese', value: 'zh-HANT' },
];

const dateValue = z
  .union([z.coerce.date(), z.string().length(0), z.null()])
  .optional()
  .transform((value) => {
    if (!value || value === '') {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    return null;
  });

const baseString = z.string().trim();

const nullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  });

const urlString = z.string().trim().url('Must be a valid URL');

const optionalUrl = z
  .union([z.string().url('Must be a valid URL'), z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return null;
  });

const cmsEventSchema = z.object({
  title: baseString.min(1, 'Title is required'),
  slug: baseString.min(1, 'Slug is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  summary: nullableString,
  description: nullableString,
  coverImageUrl: optionalUrl,
  mediaDriveUrl: optionalUrl,
  startDate: z.coerce.date(),
  endDate: dateValue.optional(),
  location: nullableString,
});

const cmsPostSchema = z.object({
  title: baseString.min(1, 'Title is required'),
  titleZhHant: nullableString,
  slug: baseString.min(1, 'Slug is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  excerpt: nullableString,
  excerptZhHant: nullableString,
  body: nullableString,
  bodyZhHant: nullableString,
  coverImageUrl: optionalUrl,
  images: z.array(urlString).min(1, 'At least one image is required'),
  publishedAt: dateValue.optional(),
  author: nullableString,
  ctaEventId: nullableString,
  ctaTextEn: nullableString,
  ctaTextZhHant: nullableString,
});

const cmsTeamSchema = z.object({
  name: baseString.min(1, 'English name is required'),
  nameZhHant: nullableString,
  description: nullableString,
  descriptionZhHant: nullableString,
  displayOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
});

const cmsTeamMemberSchema = z.object({
  teamId: baseString.min(1, 'Team is required'),
  englishName: baseString.min(1, 'English name is required'),
  positionEn: nullableString,
  positionZhHant: nullableString,
  avatarUrl: optionalUrl,
  displayOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
});

const cmsUserSchema = z.object({
  uid: baseString.min(1, 'Firebase UID is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'developer', 'organizer', 'member']).default('member'),
  englishName: nullableString,
  studentId: nullableString,
  avatarUrl: optionalUrl,
});

const cmsSocialSchema = z.object({
  platform: z.enum(['email', 'instagram', 'line', 'facebook', 'linkedin', 'generic']),
  label: baseString.min(1, 'Label is required'),
  url: urlString,
  displayOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
});

const cmsPaymentSchema = z.object({
  methodName: baseString.min(1, 'Method name is required'),
  instructionsEn: baseString.min(10, 'English instructions are required'),
  instructionsZhHant: baseString.min(5, 'Chinese instructions are required'),
  displayOrder: z.coerce.number().int().nonnegative().default(99),
  isActive: z.coerce.boolean().default(true),
});

const cmsProofContactSchema = z.object({
  platform: z.enum(['line', 'instagram', 'email']),
  contactInfo: baseString.min(1, 'Contact info is required'),
  displayOrder: z.coerce.number().int().nonnegative().default(99),
  isActive: z.coerce.boolean().default(true),
});

const cmsContentSchema = z.object({
  key: baseString.min(1, 'Content key is required'),
  title: baseString.min(1, 'Title is required'),
  body: baseString.min(1, 'Body content is required'),
  imageUrl: nullableString,
  locale: baseString.min(1, 'Locale is required'),
  status: z.enum(['draft', 'published']).default('draft'),
  category: nullableString,
});

const RESOURCE_DEFINITIONS = {
  users: {
    title: 'Users',
    description: 'Control roles and metadata for Firebase Auth users.',
    collection: 'cms_users',
    schema: cmsUserSchema,
    useCustomIdField: 'uid',
    fields: [
      { name: 'uid', label: 'Firebase UID', type: 'text', required: true, helper: 'Matches Authentication UID.', table: true },
      { name: 'email', label: 'Email', type: 'text', required: true, table: true },
      { name: 'studentId', label: 'Student ID', type: 'text', table: true },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Developer', value: 'developer' },
          { label: 'Organizer', value: 'organizer' },
          { label: 'Member', value: 'member' },
        ],
        required: true,
        table: true,
      },
      { name: 'englishName', label: 'Display Name', type: 'text' },
      { name: 'avatarUrl', label: 'Avatar URL', type: 'url' },
    ],
  },
  events: {
    title: 'Events',
    description: 'Create cultural or academic events surfaced publicly.',
    collection: 'cms_events',
    schema: cmsEventSchema,
    defaults: { status: 'draft' },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, table: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true, table: true },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true, table: true },
      { name: 'startDate', label: 'Start Date', type: 'datetime', required: true, table: true },
      { name: 'endDate', label: 'End Date', type: 'datetime' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'summary', label: 'Summary', type: 'textarea' },
      { name: 'description', label: 'Long Description', type: 'textarea' },
      { name: 'coverImageUrl', label: 'Cover Image URL', type: 'url' },
      { name: 'mediaDriveUrl', label: 'Google Drive Folder URL', type: 'url', helper: 'Public shared folder link for photo/video gallery.' },
    ],
  },
  teams: {
    title: 'Teams',
    description: 'Create and organize team groups before adding members.',
    collection: 'cms_teams',
    schema: cmsTeamSchema,
    defaults: { isActive: true, displayOrder: 0 },
    fields: [
      { name: 'name', label: 'Name (EN)', type: 'text', required: true, table: true },
      { name: 'nameZhHant', label: 'Name (ZH-HANT)', type: 'text' },
      { name: 'displayOrder', label: 'Display Order', type: 'number', table: true },
      { name: 'isActive', label: 'Active', type: 'boolean', table: true },
      { name: 'description', label: 'Description (EN)', type: 'textarea' },
      { name: 'descriptionZhHant', label: 'Description (ZH-HANT)', type: 'textarea' },
    ],
  },
  teamMembers: {
    title: 'Team Members',
    description: 'Assign members to teams and control display order.',
    collection: 'cms_team_members',
    schema: cmsTeamMemberSchema,
    defaults: { isActive: true, displayOrder: 0 },
    fields: [
      { name: 'teamId', label: 'Team ID', type: 'text', required: true, table: true },
      { name: 'englishName', label: 'English Name', type: 'text', required: true, table: true },
      { name: 'positionEn', label: 'Position (EN)', type: 'text', table: true },
      { name: 'positionZhHant', label: 'Position (ZH-HANT)', type: 'text' },
      { name: 'avatarUrl', label: 'Avatar URL', type: 'url' },
      { name: 'displayOrder', label: 'Display Order', type: 'number', table: true },
      { name: 'isActive', label: 'Active', type: 'boolean', table: true },
    ],
  },
  content: {
    title: 'Content Blocks',
    description: 'Localized hero blocks, FAQs, and static copy.',
    collection: 'cms_content_blocks',
    schema: cmsContentSchema,
    defaults: { status: 'draft', locale: 'en' },
    fields: [
      { name: 'key', label: 'Key', type: 'text', required: true, table: true },
      { name: 'title', label: 'Title', type: 'text', required: true, table: true },
      { name: 'imageUrl', label: 'Image URL', type: 'url' },
      { name: 'locale', label: 'Locale', type: 'select', options: localeOptions, required: true, table: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
        ],
        required: true,
        table: true,
      },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea', required: true },
    ],
  },
  payments: {
    title: 'Payment Instructions',
    description: 'Centralize tuition, membership, and donation steps.',
    collection: 'cms_payment_instructions',
    schema: cmsPaymentSchema,
    defaults: { isActive: true, displayOrder: 99 },
    fields: [
      { name: 'methodName', label: 'Method Name', type: 'text', required: true, table: true },
      { name: 'displayOrder', label: 'Display Order', type: 'number', table: true },
      { name: 'isActive', label: 'Active', type: 'boolean', table: true },
      { name: 'instructionsEn', label: 'Instructions (EN)', type: 'textarea' },
      { name: 'instructionsZhHant', label: 'Instructions (ZH-HANT)', type: 'textarea' },
    ],
  },
  paymentContacts: {
    title: 'Proof Contacts',
    description: 'LINE, Instagram, or email channels for payment confirmations.',
    collection: 'cms_payment_contacts',
    schema: cmsProofContactSchema,
    defaults: { isActive: true, displayOrder: 99 },
    fields: [
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        table: true,
        options: [
          { label: 'LINE', value: 'line' },
          { label: 'Instagram', value: 'instagram' },
          { label: 'Email', value: 'email' },
        ],
      },
      { name: 'contactInfo', label: 'Contact', type: 'text', required: true, table: true },
      { name: 'displayOrder', label: 'Display Order', type: 'number', table: true },
      { name: 'isActive', label: 'Active', type: 'boolean', table: true },
    ],
  },
  socials: {
    title: 'Social Links',
    description: 'Control footer and contact channels.',
    collection: 'cms_social_links',
    schema: cmsSocialSchema,
    defaults: { isActive: true },
    fields: [
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        table: true,
        options: [
          { label: 'Email', value: 'email' },
          { label: 'Instagram', value: 'instagram' },
          { label: 'LINE', value: 'line' },
          { label: 'Facebook', value: 'facebook' },
          { label: 'LinkedIn', value: 'linkedin' },
          { label: 'Generic', value: 'generic' },
        ],
      },
      { name: 'label', label: 'Label', type: 'text', required: true, table: true },
      { name: 'url', label: 'URL', type: 'url', required: true },
      { name: 'displayOrder', label: 'Display Order', type: 'number', table: true },
      { name: 'isActive', label: 'Active', type: 'boolean', table: true },
    ],
  },
} as const satisfies Record<string, CmsResourceDefinition>;

export type CmsResourceKey = keyof typeof RESOURCE_DEFINITIONS;

export const CMS_RESOURCE_MAP: Record<CmsResourceKey, CmsResourceDefinition> = RESOURCE_DEFINITIONS;
