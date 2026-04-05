import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import type {
  CmsRole,
  UserProfileDetails,
  UserProfileResponse,
  UserEventRegistration,
  ProfileGender,
} from '@/types/content';
import { coerceDate } from '@/lib/utils/dates';

const PROFILE_COLLECTION = 'user_profiles';
const USERS_COLLECTION = 'cms_users';
const REGISTRATION_COLLECTION = 'cms_event_registrations';

const normalizeGender = (value: unknown): ProfileGender | null => {
  if (value === 'male' || value === 'female' || value === 'rather_not_say') {
    return value;
  }
  return null;
};

const optionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapProfileData = (data: DocumentData | undefined): UserProfileDetails | null => {
  if (!data) return null;
  return {
    englishName: optionalString(data.englishName ?? data.english_name),
    chineseName: optionalString(data.chineseName ?? data.chinese_name),
    department: optionalString(data.department),
    nationality: optionalString(data.nationality),
    studentId: optionalString(data.studentId ?? data.student_id),
    avatarUrl: optionalString(data.avatarUrl ?? data.avatar_url),
    birthDate: optionalString(data.birthDate ?? data.birth_date),
    gender: normalizeGender(data.gender ?? null),
    studentStatus: optionalString(data.studentStatus ?? data.student_status) as UserProfileDetails['studentStatus'],
  } satisfies UserProfileDetails;
};

const mapRegistrationDoc = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
): UserEventRegistration => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    eventSlug: data.eventSlug ?? data.event_slug ?? null,
    eventTitle: data.eventTitle ?? data.event_title ?? null,
    createdAt: coerceDate(data.createdAt ?? data.created_at) ?? new Date(),
    status: (data.status ?? 'pending') as UserEventRegistration['status'],
  } satisfies UserEventRegistration;
};

export const fetchFullProfile = async (uid: string): Promise<UserProfileResponse> => {
  if (!uid) {
    return { profile: null, role: null } satisfies UserProfileResponse;
  }

  try {
    const [profileSnap, userSnap] = await Promise.all([
      getDoc(doc(firebaseDb, PROFILE_COLLECTION, uid)),
      getDoc(doc(firebaseDb, USERS_COLLECTION, uid)),
    ]);

    let latestRegistrationData: DocumentData | undefined;
    try {
      const registrationsRef = collection(firebaseDb, REGISTRATION_COLLECTION);
      const registrationQuery = query(registrationsRef, where('userId', '==', uid), limit(20));
      const registrationSnap = await getDocs(registrationQuery);
      latestRegistrationData = registrationSnap.docs
        .map((snapshot) => snapshot.data())
        .sort((left, right) => {
          const leftTime = coerceDate(left.createdAt ?? left.created_at)?.getTime() ?? 0;
          const rightTime = coerceDate(right.createdAt ?? right.created_at)?.getTime() ?? 0;
          return rightTime - leftTime;
        })[0];
    } catch (registrationError) {
      console.warn('Failed to fetch latest registration for profile fallback', registrationError);
    }

    const profileData = profileSnap.exists() ? mapProfileData(profileSnap.data()) : null;
    const registrationFallback = latestRegistrationData
      ? {
          englishName: latestRegistrationData.englishName ?? latestRegistrationData.english_name ?? null,
          chineseName: latestRegistrationData.chineseName ?? latestRegistrationData.chinese_name ?? null,
          department: latestRegistrationData.department ?? null,
          nationality: latestRegistrationData.nationality ?? null,
          studentId: latestRegistrationData.studentId ?? latestRegistrationData.student_id ?? null,
          avatarUrl: null,
          birthDate: latestRegistrationData.birthday ?? latestRegistrationData.birthDate ?? null,
          gender: normalizeGender(latestRegistrationData.gender ?? null),
          studentStatus: latestRegistrationData.studentStatus ?? latestRegistrationData.student_status ?? null,
        }
      : null;
    const profile = profileData || registrationFallback
      ? {
          ...registrationFallback,
          ...profileData,
          avatarUrl: profileData?.avatarUrl ?? registrationFallback?.avatarUrl ?? null,
        }
      : null;
    const userData = userSnap.exists() ? userSnap.data() : null;
    const role = userData ? ((userData.role ?? 'member') as CmsRole) : null;
    const email = typeof userData?.email === 'string' ? userData.email : null;

    return { profile, role, email } satisfies UserProfileResponse;
  } catch (error) {
    console.warn('Failed to fetch profile', error);
    return { profile: null, role: null, email: null } satisfies UserProfileResponse;
  }
};

export const upsertUserProfile = async (uid: string, payload: UserProfileDetails) => {
  const ref = doc(firebaseDb, PROFILE_COLLECTION, uid);
  await setDoc(
    ref,
    {
      englishName: payload.englishName ?? null,
      chineseName: payload.chineseName ?? null,
      department: payload.department ?? null,
      nationality: payload.nationality ?? null,
      studentId: payload.studentId ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      birthDate: payload.birthDate ?? null,
      gender: payload.gender ?? null,
      studentStatus: payload.studentStatus ?? null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export interface UserRegistrationPage {
  data: UserEventRegistration[];
  cursor: Date | null;
}

export const fetchUserRegistrations = async (
  uid: string,
  pageSize = 5,
  cursor: Date | null = null,
): Promise<UserRegistrationPage> => {
  if (!uid) {
    return { data: [], cursor: null } satisfies UserRegistrationPage;
  }

  try {
    const constraints = [where('userId', '==', uid), orderBy('createdAt', 'desc')];
    const registrationsRef = collection(firebaseDb, REGISTRATION_COLLECTION);
    const registrationQuery = cursor
      ? query(registrationsRef, ...constraints, startAfter(cursor), limit(pageSize))
      : query(registrationsRef, ...constraints, limit(pageSize));

    const snapshot = await getDocs(registrationQuery);
    const items = snapshot.docs.map(mapRegistrationDoc);
    const nextCursor = items.length === pageSize ? items[items.length - 1]?.createdAt ?? null : null;
    return { data: items, cursor: nextCursor } satisfies UserRegistrationPage;
  } catch (error) {
    console.warn('Failed to fetch registrations', error);
    return { data: [], cursor: null } satisfies UserRegistrationPage;
  }
};

export const demoteUserRole = async (uid: string) => {
  if (!uid) return;
  await setDoc(
    doc(firebaseDb, USERS_COLLECTION, uid),
    { role: 'member', updatedAt: serverTimestamp() },
    { merge: true },
  );
};
