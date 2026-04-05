import type { DocumentData, DocumentSnapshot, Firestore, Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { CmsHttpError } from '@/lib/cms/auth';
import type { CmsEventRegistrationStatus } from '@/types/content';

const statusValues: CmsEventRegistrationStatus[] = ['pending', 'accepted', 'rejected'];

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toIsoString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    const asDate = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(asDate.valueOf()) ? null : asDate.toISOString();
  }
  return null;
};

export const isRegistrationStatus = (value: unknown): value is CmsEventRegistrationStatus =>
  typeof value === 'string' && statusValues.includes(value as CmsEventRegistrationStatus);

export const normalizeStatus = (value: unknown): CmsEventRegistrationStatus => {
  if (isRegistrationStatus(value)) {
    return value;
  }
  return 'pending';
};

export const serializeRegistrationSnapshot = (snapshot: DocumentSnapshot<DocumentData>) => {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    userId: (data.userId ?? data.user_id ?? '').toString(),
    role: toOptionalString(data.role),
    englishName: toOptionalString(data.englishName ?? data.english_name),
    chineseName: toOptionalString(data.chineseName ?? data.chinese_name),
    studentId: toOptionalString(data.studentId ?? data.student_id),
    department: toOptionalString(data.department),
    nationality: toOptionalString(data.nationality),
    birthday: toOptionalString(data.birthday ?? data.birthDate ?? data.birth_date),
    gender: toOptionalString(data.gender),
    studentStatus: toOptionalString(data.studentStatus ?? data.student_status),
    paymentMethod: toOptionalString(data.paymentMethod ?? data.payment_method),
    eventSlug: toOptionalString(data.eventSlug ?? data.event_slug),
    eventTitle: toOptionalString(data.eventTitle ?? data.event_title),
    email: toOptionalString(data.email),
    paymentProofUrl: toOptionalString(data.paymentProofUrl ?? data.payment_proof_url),
    status: normalizeStatus(data.status),
    createdAt: toIsoString(data.createdAt ?? data.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(data.updatedAt ?? data.updated_at),
  };
};

export const serializeReviewSnapshot = (snapshot: QueryDocumentSnapshot<DocumentData>) => {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    userId: toOptionalString(data.userId ?? data.user_id ?? data.uid),
    englishName: toOptionalString(data.englishName ?? data.english_name),
    avatarUrl: toOptionalString(data.avatarUrl ?? data.avatar_url),
    rating: Number(data.rating ?? data.score ?? 0),
    comment: toOptionalString(data.comment),
    createdAt: toIsoString(data.createdAt ?? data.created_at) ?? new Date().toISOString(),
  };
};

export const serializeTokenSnapshot = (snapshot: DocumentSnapshot<DocumentData>) => {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    eventId: (data.eventId ?? data.event_id ?? '').toString(),
    token: (data.token ?? '').toString(),
    expiresAt: toIsoString(data.expiresAt ?? data.expires_at) ?? new Date().toISOString(),
  };
};

export const buildRegistrationQuery = (
  db: Firestore,
  eventId: string,
  statusFilter: CmsEventRegistrationStatus | 'all',
): Query<DocumentData> => {
  let queryRef: Query<DocumentData> = db.collection('cms_event_registrations').where('eventId', '==', eventId);
  if (statusFilter !== 'all') {
    queryRef = queryRef.where('status', '==', statusFilter);
  }
  return queryRef.orderBy('createdAt', 'desc');
};

export const requireEventSummary = async (db: Firestore, eventId: string) => {
  const snapshot = await db.collection('cms_events').doc(eventId).get();
  if (!snapshot.exists) {
    throw new CmsHttpError(404, 'Event not found.');
  }
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    title: (data.title ?? data.title_en ?? 'Untitled Event').toString(),
    slug: toOptionalString(data.slug),
    startDate: toIsoString(data.startDate ?? data.start_at),
  };
};

const PRIVILEGED_REGISTRATION_ROLES = ['admin', 'developer', 'organizer'] as const;

export const ensurePrivilegedRoleRegistrations = async (
  db: Firestore,
  event: { id: string; title: string; slug: string | null },
) => {
  const privilegedUsersSnap = await db
    .collection('cms_users')
    .where('role', 'in', PRIVILEGED_REGISTRATION_ROLES)
    .get();

  if (privilegedUsersSnap.empty) {
    return { created: 0 };
  }

  const existingRegistrationsSnap = await db
    .collection('cms_event_registrations')
    .where('eventId', '==', event.id)
    .get();
  const existingUserIds = new Set(
    existingRegistrationsSnap.docs
      .map((docSnap) => (docSnap.data().userId ?? docSnap.data().user_id ?? '').toString())
      .filter(Boolean),
  );

  const profileSnapshots = await Promise.all(
    privilegedUsersSnap.docs.map((docSnap) => db.collection('user_profiles').doc(docSnap.id).get()),
  );

  const batch = db.batch();
  const now = new Date();
  let created = 0;

  privilegedUsersSnap.docs.forEach((userDoc, index) => {
    const uid = userDoc.id;
    if (existingUserIds.has(uid)) {
      return;
    }

    const userData = userDoc.data() ?? {};
    const profileData = profileSnapshots[index]?.data() ?? {};
    const englishName =
      toOptionalString(profileData.englishName ?? profileData.english_name) ??
      toOptionalString(userData.englishName ?? userData.english_name) ??
      toOptionalString(userData.email?.split('@')?.[0]) ??
      'Staff';

    const registrationRef = db.collection('cms_event_registrations').doc();
    batch.set(registrationRef, {
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      userId: uid,
      role: toOptionalString(userData.role),
      englishName,
      chineseName: toOptionalString(profileData.chineseName ?? profileData.chinese_name),
      studentId: toOptionalString(profileData.studentId ?? profileData.student_id ?? userData.studentId ?? userData.student_id),
      department: toOptionalString(profileData.department ?? userData.department),
      nationality: toOptionalString(profileData.nationality ?? userData.nationality),
      birthday: toOptionalString(profileData.birthDate ?? profileData.birth_date),
      gender: toOptionalString(profileData.gender),
      studentStatus: toOptionalString(profileData.studentStatus ?? profileData.student_status),
      email: toOptionalString(userData.email),
      paymentMethod: null,
      paymentProofUrl: null,
      autoAssignedByRole: true,
      status: 'accepted',
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  });

  if (created > 0) {
    await batch.commit();
  }

  return { created };
};
