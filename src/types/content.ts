export type CmsRole = 'admin' | 'member' | 'developer' | 'organizer';

export interface CmsEvent {
  id: string;
  title: string;
  titleZhHant?: string | null;
  slug: string;
  summary?: string | null;
  summaryZhHant?: string | null;
  description?: string | null;
  descriptionZhHant?: string | null;
  coverImageUrl?: string | null;
  heroImageUrl?: string | null;
  mediaDriveUrl?: string | null;
  startDate: Date;
  endDate?: Date | null;
  location?: string | null;
  status: 'draft' | 'published' | 'archived';
  isPaid?: boolean;
  price?: number | null;
  ctaPostSlug?: string | null;
  ctaTextEn?: string | null;
  ctaTextZhHant?: string | null;
}

export interface CmsPost {
  id: string;
  title: string;
  titleZhHant?: string | null;
  slug: string;
  excerpt?: string | null;
  excerptZhHant?: string | null;
  body?: string | null;
  bodyZhHant?: string | null;
  coverImageUrl?: string | null;
  images?: string[];
  publishedAt?: Date | null;
  author?: string | null;
  ctaEventId?: string | null;
  ctaTextEn?: string | null;
  ctaTextZhHant?: string | null;
  status: 'draft' | 'published' | 'archived';
}

export interface CmsTeam {
  id: string;
  name: string;
  nameZhHant?: string | null;
  description?: string | null;
  descriptionZhHant?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId?: string | null;
  englishName?: string | null;
  avatarUrl?: string | null;
  positionEn?: string | null;
  positionZhHant?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CmsTestimonial {
  id: string;
  comment?: string | null;
  englishName?: string | null;
  avatarUrl?: string | null;
}

export interface SocialLink {
  id: string;
  platform: 'email' | 'instagram' | 'line' | 'facebook' | 'linkedin' | 'generic';
  url: string;
  label: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface CmsPaymentInstruction {
  id: string;
  methodName: string;
  instructionsEn: string;
  instructionsZhHant: string;
  isActive: boolean;
  displayOrder?: number;
}

export interface CmsProofContact {
  id: string;
  platform: 'line' | 'instagram' | 'email';
  contactInfo: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CmsContentBlock {
  id: string;
  key: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  locale: string;
  status: 'draft' | 'published';
  category?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  englishName?: string | null;
  studentId?: string | null;
  avatarUrl?: string | null;
  role: CmsRole;
}

export type ProfileGender = 'male' | 'female' | 'rather_not_say';

export interface UserProfileDetails {
  englishName?: string | null;
  chineseName?: string | null;
  department?: string | null;
  nationality?: string | null;
  studentId?: string | null;
  avatarUrl?: string | null;
  birthYear?: number | null;
  birthDate?: string | null;
  gender?: ProfileGender | null;
  studentStatus?: '本國生' | '僑生' | '陸生' | '外籍生' | 'exchange_student' | null;
}

export interface UserProfileResponse {
  profile: UserProfileDetails | null;
  role: CmsRole | null;
  email?: string | null;
}

export interface UserEventRegistration {
  id: string;
  eventSlug?: string | null;
  eventTitle?: string | null;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

export type CmsEventRegistrationStatus = 'pending' | 'accepted' | 'rejected';

export interface CmsEventRegistrationRecord {
  id: string;
  userId: string;
  englishName?: string | null;
  studentId?: string | null;
  department?: string | null;
  nationality?: string | null;
  email?: string | null;
  paymentProofUrl?: string | null;
  status: CmsEventRegistrationStatus;
  createdAt: Date;
}

export interface CmsEventReview {
  id: string;
  userId?: string | null;
  englishName?: string | null;
  avatarUrl?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}

export interface CmsEventToken {
  id: string;
  eventId: string;
  token: string;
  expiresAt: Date;
}

export interface EventRegistrationContext {
  id: string;
  eventId: string;
  status: CmsEventRegistrationStatus;
  paymentProofUrl?: string | null;
  createdAt: Date;
  attendanceId?: string | null;
}

export interface CmsStats {
  events: number;
  posts: number;
  users: number;
  teams: number;
}

export interface CmsDashboardOverview {
  totalUsers: number;
  pendingRegistrations: number;
  upcomingEvents: CmsEvent[];
}

export interface EventDetailPayload {
  event: CmsEvent;
  registration: EventRegistrationContext | null;
  reviews: CmsEventReview[];
  paymentInstructions: CmsPaymentInstruction[];
  proofContacts: CmsProofContact[];
}
