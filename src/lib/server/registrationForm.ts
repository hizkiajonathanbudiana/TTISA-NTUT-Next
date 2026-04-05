import { requireAdminDb } from '@/lib/firebase/admin';
import { coerceDate } from '@/lib/utils/dates';

type PaymentMethod = 'cash' | 'transfer';

type RegistrationInput = {
  englishName: string;
  chineseName: string | null;
  department: string;
  nationality: string;
  studentId: string;
  birthday: string;
  gender: string;
  studentStatus: string;
  paymentMethod: PaymentMethod;
  paymentProofUrl: string | null;
};

export type RegistrationAuthUser = {
  uid: string;
  email?: string | null;
  name?: string | null;
};

export const STUDENT_STATUS_OPTIONS = new Set(['本國生', '僑生', '陸生', '外籍生', 'exchange_student']);
export const GENDER_OPTIONS = new Set(['male', 'female', 'rather_not_say']);

export const optionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeBirthday = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

export const parseRegistrationInput = (body: Record<string, unknown>): RegistrationInput => {
  const englishName = optionalString(body.englishName);
  const chineseName = optionalString(body.chineseName);
  const department = optionalString(body.department);
  const nationality = optionalString(body.nationality);
  const studentId = optionalString(body.studentId);
  const birthday = normalizeBirthday(body.birthday);
  const gender = optionalString(body.gender);
  const studentStatus = optionalString(body.studentStatus);
  const paymentMethod = optionalString(body.paymentMethod) as PaymentMethod | null;
  const paymentProofUrl = optionalString(body.paymentProofUrl);

  if (!englishName || !department || !nationality || !studentId || !birthday || !gender || !studentStatus || !paymentMethod) {
    throw new Error('Please complete all required fields.');
  }

  if (!GENDER_OPTIONS.has(gender)) {
    throw new Error('Invalid gender value.');
  }

  if (!STUDENT_STATUS_OPTIONS.has(studentStatus)) {
    throw new Error('Invalid student status value.');
  }

  if (paymentMethod !== 'cash' && paymentMethod !== 'transfer') {
    throw new Error('Invalid payment method.');
  }

  if (paymentMethod === 'transfer' && !paymentProofUrl) {
    throw new Error('Proof of payment is required for transfer.');
  }

  return {
    englishName,
    chineseName,
    department,
    nationality,
    studentId,
    birthday,
    gender,
    studentStatus,
    paymentMethod,
    paymentProofUrl,
  };
};

export const mapRegistration = (id: string, data: Record<string, unknown>) => {
  const birthday = normalizeBirthday(data.birthday ?? data.birthDate ?? data.birth_date);
  const status = (data.status ?? 'pending').toString();

  return {
    id,
    status: status === 'accepted' || status === 'rejected' ? status : 'pending',
    englishName: optionalString(data.englishName ?? data.english_name),
    chineseName: optionalString(data.chineseName ?? data.chinese_name),
    department: optionalString(data.department),
    nationality: optionalString(data.nationality),
    studentId: optionalString(data.studentId ?? data.student_id),
    birthday,
    gender: optionalString(data.gender),
    studentStatus: optionalString(data.studentStatus ?? data.student_status),
    paymentMethod: optionalString(data.paymentMethod ?? data.payment_method),
    paymentProofUrl: optionalString(data.paymentProofUrl ?? data.payment_proof_url),
    createdAt: coerceDate(data.createdAt ?? data.created_at)?.toISOString() ?? new Date().toISOString(),
    updatedAt: coerceDate(data.updatedAt ?? data.updated_at)?.toISOString() ?? null,
    statusLabelEn:
      status === 'accepted' ? 'Accepted' : status === 'rejected' ? 'Rejected' : 'Pending',
    statusLabelZhHant:
      status === 'accepted' ? '已通過' : status === 'rejected' ? '已拒絕' : '審核中',
  };
};

export const mapProfile = (profileData: Record<string, unknown>, userData: Record<string, unknown>) => {
  const birthday = normalizeBirthday(profileData.birthDate ?? profileData.birth_date);
  return {
    englishName: optionalString(profileData.englishName ?? profileData.english_name ?? userData.englishName ?? userData.fullName),
    chineseName: optionalString(profileData.chineseName ?? profileData.chinese_name),
    department: optionalString(profileData.department ?? userData.department),
    nationality: optionalString(profileData.nationality ?? userData.nationality),
    studentId: optionalString(profileData.studentId ?? profileData.student_id ?? userData.studentId ?? userData.student_id),
    birthday,
    gender: optionalString(profileData.gender),
    studentStatus: optionalString(profileData.studentStatus ?? profileData.student_status),
  };
};

export const resolveEvent = async (slug: string) => {
  const db = requireAdminDb();
  const snapshot = await db
    .collection('cms_events')
    .where('slug', '==', slug)
    .where('status', '==', 'published')
    .limit(1)
    .get();

  const eventDoc = snapshot.docs[0];
  if (!eventDoc) {
    throw new Error('Event not found.');
  }

  return { db, eventDoc };
};

export const saveRegistrationSubmission = async (
  slug: string,
  authUser: RegistrationAuthUser,
  input: RegistrationInput,
) => {
  const { db, eventDoc } = await resolveEvent(slug);
  const eventData = eventDoc.data() ?? {};
  const eventId = eventDoc.id;

  const startDate = coerceDate(eventData.startDate ?? eventData.start_at);
  if (startDate && startDate < new Date()) {
    throw new Error('This event has already started or ended.');
  }

  const [userSnap, registrationSnap] = await Promise.all([
    db.collection('cms_users').doc(authUser.uid).get(),
    db
      .collection('cms_event_registrations')
      .where('eventId', '==', eventId)
      .where('userId', '==', authUser.uid)
      .limit(1)
      .get(),
  ]);

  const userData = userSnap.data() ?? {};
  const email = optionalString(userData.email ?? authUser.email) ?? authUser.email ?? null;

  await db.collection('user_profiles').doc(authUser.uid).set(
    {
      englishName: input.englishName,
      chineseName: input.chineseName,
      department: input.department,
      nationality: input.nationality,
      studentId: input.studentId,
      gender: input.gender,
      birthDate: input.birthday,
      studentStatus: input.studentStatus,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  const existingDoc = registrationSnap.docs[0];
  if (existingDoc) {
    const existingData = existingDoc.data() ?? {};
    const existingStatus = (existingData.status ?? 'pending').toString();
    if (existingStatus !== 'pending') {
      throw new Error('This registration is already reviewed and can no longer be edited.');
    }

    await existingDoc.ref.set(
      {
        englishName: input.englishName,
        chineseName: input.chineseName,
        department: input.department,
        nationality: input.nationality,
        studentId: input.studentId,
        birthday: input.birthday,
        gender: input.gender,
        studentStatus: input.studentStatus,
        paymentMethod: input.paymentMethod,
        paymentProofUrl: input.paymentMethod === 'transfer' ? input.paymentProofUrl : null,
        email,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    const refreshed = await existingDoc.ref.get();
    return {
      registration: mapRegistration(refreshed.id, refreshed.data() ?? {}),
      canEdit: true,
    };
  }

  const docRef = db.collection('cms_event_registrations').doc();
  const registrationData = {
    eventId,
    eventSlug: (eventData.slug ?? slug ?? eventDoc.id).toString(),
    eventTitle: (eventData.title ?? eventData.titleEn ?? 'Untitled Event').toString(),
    userId: authUser.uid,
    englishName: input.englishName,
    chineseName: input.chineseName,
    department: input.department,
    nationality: input.nationality,
    studentId: input.studentId,
    birthday: input.birthday,
    gender: input.gender,
    studentStatus: input.studentStatus,
    paymentMethod: input.paymentMethod,
    paymentProofUrl: input.paymentMethod === 'transfer' ? input.paymentProofUrl : null,
    email,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await docRef.set(registrationData);

  return {
    registration: mapRegistration(docRef.id, registrationData),
    canEdit: true,
  };
};
