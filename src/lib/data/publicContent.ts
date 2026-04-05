import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import type {
  CmsContentBlock,
  CmsDashboardOverview,
  CmsEvent,
  CmsPaymentInstruction,
  CmsPost,
  CmsProofContact,
  CmsRole,
  CmsStats,
  CmsTeam,
  CmsTestimonial,
  SocialLink,
  UserProfile,
} from '@/types/content';
import { coerceDate } from '@/lib/utils/dates';
import {
  mapEventRecord,
  mapPaymentInstructionRecord,
  mapProofContactRecord,
} from '@/lib/mappers/public';

const mapEventDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): CmsEvent =>
  mapEventRecord(snapshot.id, snapshot.data());

const mapPostDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): CmsPost => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title ?? 'Untitled Post',
    titleZhHant: data.titleZhHant ?? data.title_zh_hant ?? null,
    slug: data.slug ?? snapshot.id,
    excerpt: data.excerpt ?? data.summary ?? null,
    excerptZhHant: data.excerptZhHant ?? data.excerpt_zh_hant ?? null,
    body: data.body ?? data.content ?? null,
    bodyZhHant: data.bodyZhHant ?? data.content_zh_hant ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
    images: Array.isArray(data.images)
      ? (data.images as string[])
      : Array.isArray(data.gallery)
      ? (data.gallery as string[])
      : undefined,
    publishedAt: coerceDate(data.publishedAt),
    author: data.author ?? data.publishedBy ?? null,
    ctaEventId: data.ctaEventId ?? data.cta_event_id ?? null,
    ctaTextEn: data.ctaTextEn ?? data.cta_text_en ?? null,
    ctaTextZhHant: data.ctaTextZhHant ?? data.cta_text_zh_hant ?? null,
    status: data.status ?? 'draft',
  } satisfies CmsPost;
};

const mapTeamDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): CmsTeam => {
  const data = snapshot.data();
  const members = Array.isArray(data.members) ? data.members : [];
  return {
    id: snapshot.id,
    name: data.name ?? data.name_en ?? 'Team Member',
    nameZhHant: data.nameZhHant ?? data.name_zh_hant ?? null,
    description: data.description ?? data.description_en ?? data.bio ?? null,
    descriptionZhHant: data.descriptionZhHant ?? data.description_zh_hant ?? null,
    avatarUrl: data.avatarUrl ?? data.photoUrl ?? null,
    role: data.role ?? data.position ?? null,
    displayOrder: data.displayOrder ?? 0,
    isActive: data.isActive ?? data.is_active ?? true,
    members: members.map((member: Record<string, unknown>, index: number) => ({
      id: (typeof member.id === 'string' && member.id) || `${snapshot.id}-${index}`,
      englishName:
        (typeof member.englishName === 'string' && member.englishName) ||
        (typeof member.english_name === 'string' && member.english_name) ||
        (typeof member.name === 'string' && member.name) ||
        null,
      avatarUrl:
        (typeof member.avatarUrl === 'string' && member.avatarUrl) ||
        (typeof member.avatar_url === 'string' && member.avatar_url) ||
        null,
      positionEn:
        (typeof member.positionEn === 'string' && member.positionEn) ||
        (typeof member.position_en === 'string' && member.position_en) ||
        (typeof member.position === 'string' && member.position) ||
        null,
      positionZhHant:
        (typeof member.positionZhHant === 'string' && member.positionZhHant) ||
        (typeof member.position_zh_hant === 'string' && member.position_zh_hant) ||
        null,
    })),
  } satisfies CmsTeam;
};

const mapTestimonialDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): CmsTestimonial => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    comment: data.comment ?? data.quote ?? null,
    englishName: data.englishName ?? data.name ?? null,
    avatarUrl: data.avatarUrl ?? data.photoUrl ?? null,
  } satisfies CmsTestimonial;
};

const mapContentBlockDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): CmsContentBlock => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    key: data.key ?? data.slug ?? snapshot.id,
    title: data.title ?? 'Content Block',
    body: data.body ?? data.content ?? '',
    imageUrl: data.imageUrl ?? data.image_url ?? null,
    locale: data.locale ?? 'en',
    status: data.status ?? 'draft',
    category: data.category ?? data.section ?? null,
  } satisfies CmsContentBlock;
};

const HOMEPAGE_PROMO_HEADER_KEY = 'homepage-what-we-do-header';
const HOMEPAGE_PROMO_CARD_KEYS = [
  'homepage-what-we-do-card-1',
  'homepage-what-we-do-card-2',
  'homepage-what-we-do-card-3',
] as const;

export interface HomepagePromoCard {
  key: string;
  title: string;
  body: string;
  imageUrl: string | null;
}

export interface HomepagePromoContent {
  title: string;
  subtitle: string;
  cards: HomepagePromoCard[];
}

interface PaginatedResult<T> {
  data: T[];
  nextCursor: Date | null;
}

export const fetchPublishedEvents = async (limitCount = 3): Promise<CmsEvent[]> => {
  try {
    const eventsRef = collection(firebaseDb, 'cms_events');
    const q = query(
      eventsRef,
      where('status', '==', 'published'),
      orderBy('startDate', 'asc'),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapEventDoc);
  } catch (error) {
    console.warn('Failed to fetch events', error);
    return [];
  }
};

export const fetchAllPublishedEvents = async (): Promise<CmsEvent[]> => {
  try {
    const eventsRef = collection(firebaseDb, 'cms_events');
    const q = query(eventsRef, where('status', '==', 'published'), orderBy('startDate', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapEventDoc);
  } catch (error) {
    console.warn('Failed to fetch full event list', error);
    return [];
  }
};

export const fetchPublishedPosts = async (limitCount = 3): Promise<CmsPost[]> => {
  try {
    const postsRef = collection(firebaseDb, 'cms_posts');
    const q = query(
      postsRef,
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapPostDoc);
  } catch (error) {
    console.warn('Failed to fetch posts', error);
    return [];
  }
};

export const fetchTeams = async (): Promise<CmsTeam[]> => {
  try {
    const [teamSnap, teamMembersSnap] = await Promise.all([
      getDocs(query(collection(firebaseDb, 'cms_teams'), orderBy('displayOrder', 'asc'))),
      getDocs(query(collection(firebaseDb, 'cms_team_members'), orderBy('displayOrder', 'asc'))),
    ]);

    if (!teamMembersSnap.empty) {
      const membersByTeamId = new Map<string, CmsTeam['members']>();

      teamMembersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isActive === false) {
          return;
        }
        const teamId = typeof data.teamId === 'string' ? data.teamId : null;
        if (!teamId) {
          return;
        }
        const member = {
          id: docSnap.id,
          teamId,
          englishName:
            (typeof data.englishName === 'string' && data.englishName) ||
            (typeof data.name === 'string' && data.name) ||
            null,
          avatarUrl:
            (typeof data.avatarUrl === 'string' && data.avatarUrl) ||
            (typeof data.avatar_url === 'string' && data.avatar_url) ||
            null,
          positionEn:
            (typeof data.positionEn === 'string' && data.positionEn) ||
            (typeof data.position_en === 'string' && data.position_en) ||
            null,
          positionZhHant:
            (typeof data.positionZhHant === 'string' && data.positionZhHant) ||
            (typeof data.position_zh_hant === 'string' && data.position_zh_hant) ||
            null,
          displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 0,
          isActive: data.isActive !== false,
        };

        const existing = membersByTeamId.get(teamId) ?? [];
        existing.push(member);
        membersByTeamId.set(teamId, existing);
      });

      return teamSnap.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name ?? data.name_en ?? 'Team',
            nameZhHant: data.nameZhHant ?? data.name_zh_hant ?? null,
            description: data.description ?? data.description_en ?? null,
            descriptionZhHant: data.descriptionZhHant ?? data.description_zh_hant ?? null,
            displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 0,
            isActive: data.isActive !== false,
            members: (membersByTeamId.get(docSnap.id) ?? []).sort(
              (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
            ),
          } satisfies CmsTeam;
        })
        .filter((team) => team.isActive !== false);
    }

    const mappedTeams = teamSnap.docs.map(mapTeamDoc).filter((team) => team.isActive !== false);
    if (mappedTeams.length > 0) {
      return mappedTeams;
    }

    const fallbackMembers = teamSnap.docs
      .map((docSnap) => {
        const data = docSnap.data();
        if (data.isActive === false) {
          return null;
        }
        return {
          id: docSnap.id,
          englishName:
            (typeof data.name === 'string' && data.name) ||
            (typeof data.englishName === 'string' && data.englishName) ||
            null,
          avatarUrl: (typeof data.avatarUrl === 'string' && data.avatarUrl) || null,
          positionEn:
            (typeof data.role === 'string' && data.role) ||
            (typeof data.positionEn === 'string' && data.positionEn) ||
            null,
          positionZhHant: (typeof data.positionZhHant === 'string' && data.positionZhHant) || null,
          displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 0,
        };
      })
      .filter((member): member is NonNullable<typeof member> => Boolean(member))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    if (fallbackMembers.length > 0) {
      return [
        {
          id: 'legacy-team',
          name: 'TTISA Team',
          nameZhHant: 'TTISA 團隊',
          description: null,
          descriptionZhHant: null,
          isActive: true,
          displayOrder: 0,
          members: fallbackMembers,
        } satisfies CmsTeam,
      ];
    }

    return [];
  } catch (error) {
    console.warn('Failed to fetch teams', error);
    return [];
  }
};

export const fetchSocialLinks = async (): Promise<SocialLink[]> => {
  try {
    const linksRef = collection(firebaseDb, 'cms_social_links');
    const q = query(linksRef, where('isActive', '==', true), orderBy('displayOrder', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        platform: data.platform ?? 'generic',
        url: data.url ?? data.link_url ?? '#',
        label: data.label ?? data.display_text ?? 'Follow us',
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder ?? 0,
      } satisfies SocialLink;
    });
  } catch (error) {
    console.warn('Failed to fetch social links', error);
    return [];
  }
};

export const fetchTestimonials = async (limitCount = 6): Promise<CmsTestimonial[]> => {
  try {
    const testimonialsRef = collection(firebaseDb, 'cms_testimonials');
    const q = query(testimonialsRef, orderBy('englishName', 'asc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapTestimonialDoc);
  } catch (error) {
    console.warn('Failed to fetch testimonials', error);
    return [];
  }
};

export const fetchPaginatedEvents = async (
  filter: 'upcoming' | 'past',
  pageSize = 9,
  cursor: Date | null = null,
): Promise<PaginatedResult<CmsEvent>> => {
  const now = Timestamp.fromDate(new Date());
  try {
    const eventsRef = collection(firebaseDb, 'cms_events');
    const constraints: QueryConstraint[] = [where('status', '==', 'published')];

    if (filter === 'upcoming') {
      constraints.push(where('startDate', '>=', now));
      constraints.push(orderBy('startDate', 'asc'));
    } else {
      constraints.push(where('startDate', '<', now));
      constraints.push(orderBy('startDate', 'desc'));
    }

    if (cursor) {
      constraints.push(startAfter(cursor));
    }

    constraints.push(limit(pageSize));

    const q = query(eventsRef, ...constraints);
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(mapEventDoc);
    const nextCursor = items.length === pageSize ? items[items.length - 1]?.startDate ?? null : null;
    return { data: items, nextCursor } satisfies PaginatedResult<CmsEvent>;
  } catch (error) {
    console.warn('Failed to fetch paginated events', error);
    return { data: [], nextCursor: null } satisfies PaginatedResult<CmsEvent>;
  }
};

export const fetchPaginatedPosts = async (
  pageSize = 9,
  cursor: Date | null = null,
): Promise<PaginatedResult<CmsPost>> => {
  try {
    const postsRef = collection(firebaseDb, 'cms_posts');
    const constraints: QueryConstraint[] = [
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
    ];
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(pageSize));
    const q = query(postsRef, ...constraints);
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(mapPostDoc);
    const nextCursor = items.length === pageSize ? items[items.length - 1]?.publishedAt ?? null : null;
    return { data: items, nextCursor } satisfies PaginatedResult<CmsPost>;
  } catch (error) {
    console.warn('Failed to fetch paginated posts', error);
    return { data: [], nextCursor: null } satisfies PaginatedResult<CmsPost>;
  }
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(firebaseDb, 'cms_users', userId);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data();
    return {
      id: snapshot.id,
      email: data.email ?? '',
      englishName: data.englishName ?? data.fullName ?? null,
      avatarUrl: data.avatarUrl ?? data.photoUrl ?? null,
      role: (data.role ?? 'member') as CmsRole,
    } satisfies UserProfile;
  } catch (error) {
    console.warn('Failed to fetch user profile', error);
    return null;
  }
};

export const fetchCmsStats = async (): Promise<CmsStats> => {
  try {
    const [eventSnap, postSnap, userSnap, teamSnap] = await Promise.all([
      getCountFromServer(collection(firebaseDb, 'cms_events')),
      getCountFromServer(collection(firebaseDb, 'cms_posts')),
      getCountFromServer(collection(firebaseDb, 'cms_users')),
      getCountFromServer(collection(firebaseDb, 'cms_teams')),
    ]);

    return {
      events: eventSnap.data().count,
      posts: postSnap.data().count,
      users: userSnap.data().count,
      teams: teamSnap.data().count,
    } satisfies CmsStats;
  } catch (error) {
    console.warn('Failed to fetch CMS stats', error);
    return { events: 0, posts: 0, users: 0, teams: 0 } satisfies CmsStats;
  }
};

export const fetchCmsDashboardOverview = async (): Promise<CmsDashboardOverview> => {
  try {
    const now = Timestamp.fromDate(new Date());
    const [userSnap, pendingRegistrationsSnap, upcomingEventsSnap] = await Promise.all([
      getCountFromServer(collection(firebaseDb, 'cms_users')),
      getCountFromServer(query(collection(firebaseDb, 'cms_event_registrations'), where('status', '==', 'pending'))),
      getDocs(
        query(
          collection(firebaseDb, 'cms_events'),
          where('status', '==', 'published'),
          where('startDate', '>=', now),
          orderBy('startDate', 'asc'),
          limit(3),
        ),
      ),
    ]);

    return {
      totalUsers: userSnap.data().count,
      pendingRegistrations: pendingRegistrationsSnap.data().count,
      upcomingEvents: upcomingEventsSnap.docs.map(mapEventDoc),
    } satisfies CmsDashboardOverview;
  } catch (error) {
    console.warn('Failed to fetch dashboard overview', error);
    return { totalUsers: 0, pendingRegistrations: 0, upcomingEvents: [] } satisfies CmsDashboardOverview;
  }
};

export const fetchEventBySlug = async (slug: string): Promise<CmsEvent | null> => {
  if (!slug) return null;
  try {
    const eventsRef = collection(firebaseDb, 'cms_events');
    const q = query(eventsRef, where('slug', '==', slug), where('status', '==', 'published'), limit(1));
    const snapshot = await getDocs(q);
    const docSnap = snapshot.docs[0];
    return docSnap ? mapEventDoc(docSnap) : null;
  } catch (error) {
    console.warn('Failed to fetch event by slug', error);
    return null;
  }
};

export const fetchPostBySlug = async (slug: string): Promise<CmsPost | null> => {
  if (!slug) return null;
  try {
    const postsRef = collection(firebaseDb, 'cms_posts');
    const q = query(postsRef, where('slug', '==', slug), where('status', '==', 'published'), limit(1));
    const snapshot = await getDocs(q);
    const docSnap = snapshot.docs[0];
    return docSnap ? mapPostDoc(docSnap) : null;
  } catch (error) {
    console.warn('Failed to fetch post by slug', error);
    return null;
  }
};

export const fetchPaymentInstructions = async (): Promise<CmsPaymentInstruction[]> => {
  try {
    const ref = collection(firebaseDb, 'cms_payment_instructions');
    const q = query(ref, where('isActive', '==', true), orderBy('displayOrder', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => mapPaymentInstructionRecord(docSnap.id, docSnap.data()));
  } catch (error) {
    console.warn('Failed to fetch payment instructions', error);
    return [];
  }
};

export const fetchProofContacts = async (): Promise<CmsProofContact[]> => {
  try {
    const ref = collection(firebaseDb, 'cms_payment_contacts');
    const q = query(ref, where('isActive', '==', true), orderBy('displayOrder', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => mapProofContactRecord(docSnap.id, docSnap.data()));
  } catch (error) {
    console.warn('Failed to fetch proof contacts', error);
    return [];
  }
};

export const fetchContentBlock = async (key: string, locale: string = 'en'): Promise<CmsContentBlock | null> => {
  try {
    const ref = collection(firebaseDb, 'cms_content_blocks');
    const q = query(ref, where('key', '==', key), where('locale', '==', locale), where('status', '==', 'published'), limit(1));
    const snapshot = await getDocs(q);
    const docSnap = snapshot.docs[0];
    if (!docSnap && locale !== 'en') {
      return fetchContentBlock(key, 'en');
    }
    return docSnap ? mapContentBlockDoc(docSnap) : null;
  } catch (error) {
    console.warn(`Failed to fetch content block for ${key}`, error);
    return null;
  }
};

export const fetchHomepagePromoContent = async (locale: string = 'en'): Promise<HomepagePromoContent | null> => {
  try {
    const [header, ...cards] = await Promise.all([
      fetchContentBlock(HOMEPAGE_PROMO_HEADER_KEY, locale),
      ...HOMEPAGE_PROMO_CARD_KEYS.map((key) => fetchContentBlock(key, locale)),
    ]);

    const availableCards = cards
      .filter((block): block is CmsContentBlock => Boolean(block))
      .map((block) => ({
        key: block.key,
        title: block.title,
        body: block.body,
        imageUrl: block.imageUrl ?? null,
      }));

    if (!header && availableCards.length === 0) {
      return null;
    }

    return {
      title: header?.title ?? 'What We Do',
      subtitle: header?.body ?? '',
      cards: availableCards,
    };
  } catch (error) {
    console.warn('Failed to fetch homepage promo content', error);
    return null;
  }
};
