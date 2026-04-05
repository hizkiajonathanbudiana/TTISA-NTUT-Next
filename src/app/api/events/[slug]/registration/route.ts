import { NextResponse } from 'next/server';
import { requireAdminDb } from '@/lib/firebase/admin';
import { requireAuthUser } from '@/lib/server/auth';
import { coerceDate } from '@/lib/utils/dates';

const errorResponse = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

type RouteContext = { params: Promise<{ slug: string }> };

type PaymentMethod = 'cash' | 'transfer';

const STUDENT_STATUS_OPTIONS = new Set(['本國生', '僑生', '陸生', '外籍生', 'exchange_student']);
const GENDER_OPTIONS = new Set(['male', 'female', 'rather_not_say']);

const optionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeBirthday = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const mapRegistration = (id: string, data: Record<string, unknown>) => {
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

const mapProfile = (profileData: Record<string, unknown>, userData: Record<string, unknown>) => {
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

const resolveEvent = async (slug: string) => {
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

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!slug) return errorResponse('Missing event identifier.', 400);

    const authUser = await requireAuthUser(request);
    const { db, eventDoc } = await resolveEvent(slug);
    const eventData = eventDoc.data() ?? {};

    const [userSnap, profileSnap, registrationSnap, methodsSnap, contactsSnap] = await Promise.all([
      db.collection('cms_users').doc(authUser.uid).get(),
      db.collection('user_profiles').doc(authUser.uid).get(),
      db
        .collection('cms_event_registrations')
        .where('eventId', '==', eventDoc.id)
        .where('userId', '==', authUser.uid)
        .limit(1)
        .get(),
      db
        .collection('cms_payment_instructions')
        .where('isActive', '==', true)
        .orderBy('displayOrder', 'asc')
        .get(),
      db
        .collection('cms_payment_contacts')
        .where('isActive', '==', true)
        .orderBy('displayOrder', 'asc')
        .get(),
    ]);

    const userData = userSnap.data() ?? {};
    const profileData = profileSnap.data() ?? {};

    const registrationDoc = registrationSnap.docs[0];
    const registration = registrationDoc ? mapRegistration(registrationDoc.id, registrationDoc.data() ?? {}) : null;

    const paymentMethods = methodsSnap.docs.map((docSnap) => {
      const data = docSnap.data() ?? {};
      return {
        id: docSnap.id,
        methodName: (data.methodName ?? data.method_name ?? 'Payment Method').toString(),
        instructionsEn: optionalString(data.instructionsEn ?? data.instructions_en) ?? '',
        instructionsZhHant:
          optionalString(data.instructionsZhHant ?? data.instructions_zh_hant) ??
          optionalString(data.instructionsEn ?? data.instructions_en) ??
          '',
      };
    });

    const proofContacts = contactsSnap.docs.map((docSnap) => {
      const data = docSnap.data() ?? {};
      return {
        id: docSnap.id,
        platform: (data.platform ?? 'line').toString(),
        contactInfo: optionalString(data.contactInfo ?? data.contact_info) ?? '',
      };
    });

    return NextResponse.json({
      event: {
        id: eventDoc.id,
        slug: (eventData.slug ?? slug).toString(),
        title: (eventData.title ?? eventData.titleEn ?? 'Untitled Event').toString(),
        titleZhHant: optionalString(eventData.titleZhHant ?? eventData.title_zh_hant),
        summary: optionalString(eventData.summary ?? eventData.summaryEn),
        summaryZhHant: optionalString(eventData.summaryZhHant ?? eventData.summary_zh_hant),
        description: optionalString(eventData.description ?? eventData.descriptionEn ?? eventData.details),
        descriptionZhHant: optionalString(eventData.descriptionZhHant ?? eventData.description_zh_hant),
        location: optionalString(eventData.location),
        startDate: coerceDate(eventData.startDate ?? eventData.start_at)?.toISOString() ?? null,
        endDate: coerceDate(eventData.endDate ?? eventData.end_at)?.toISOString() ?? null,
        isPaid: Boolean(eventData.isPaid),
        price:
          typeof eventData.price === 'number'
            ? eventData.price
            : typeof eventData.fee === 'number'
            ? eventData.fee
            : null,
      },
      profile: mapProfile(profileData, userData),
      registration,
      canEdit: registration ? registration.status === 'pending' : true,
      paymentMethods,
      proofContacts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load registration form.';
    return errorResponse(message, 400);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!slug) return errorResponse('Missing event identifier.', 400);

    const authUser = await requireAuthUser(request);
    const body = await request.json().catch(() => ({} as Record<string, unknown>));

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

    if (!englishName || !chineseName || !department || !nationality || !studentId || !birthday || !gender || !studentStatus || !paymentMethod) {
      return errorResponse('Please complete all required fields.', 400);
    }

    if (!GENDER_OPTIONS.has(gender)) {
      return errorResponse('Invalid gender value.', 400);
    }

    if (!STUDENT_STATUS_OPTIONS.has(studentStatus)) {
      return errorResponse('Invalid student status value.', 400);
    }

    if (paymentMethod !== 'cash' && paymentMethod !== 'transfer') {
      return errorResponse('Invalid payment method.', 400);
    }

    if (paymentMethod === 'transfer' && !paymentProofUrl) {
      return errorResponse('Proof of payment is required for transfer.', 400);
    }

    const { db, eventDoc } = await resolveEvent(slug);
    const eventData = eventDoc.data() ?? {};
    const eventId = eventDoc.id;

    const startDate = coerceDate(eventData.startDate ?? eventData.start_at);
    if (startDate && startDate < new Date()) {
      return errorResponse('This event has already started or ended.', 400);
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
        englishName,
        chineseName,
        department,
        nationality,
        studentId,
        gender,
        birthDate: birthday,
        studentStatus,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    const existingDoc = registrationSnap.docs[0];
    if (existingDoc) {
      const existingData = existingDoc.data() ?? {};
      const existingStatus = (existingData.status ?? 'pending').toString();
      if (existingStatus !== 'pending') {
        return errorResponse('This registration is already reviewed and can no longer be edited.', 400);
      }

      await existingDoc.ref.set(
        {
          englishName,
          chineseName,
          department,
          nationality,
          studentId,
          birthday,
          gender,
          studentStatus,
          paymentMethod,
          paymentProofUrl: paymentMethod === 'transfer' ? paymentProofUrl : null,
          email,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      const refreshed = await existingDoc.ref.get();
      return NextResponse.json({
        registration: mapRegistration(refreshed.id, refreshed.data() ?? {}),
        canEdit: true,
      });
    }

    const docRef = db.collection('cms_event_registrations').doc();
    const registrationData = {
      eventId,
      eventSlug: (eventData.slug ?? slug ?? eventDoc.id).toString(),
      eventTitle: (eventData.title ?? eventData.titleEn ?? 'Untitled Event').toString(),
      userId: authUser.uid,
      englishName,
      chineseName,
      department,
      nationality,
      studentId,
      birthday,
      gender,
      studentStatus,
      paymentMethod,
      paymentProofUrl: paymentMethod === 'transfer' ? paymentProofUrl : null,
      email,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await docRef.set(registrationData);

    return NextResponse.json({
      registration: mapRegistration(docRef.id, registrationData),
      canEdit: true,
    });
  } catch (error) {
    console.error('Failed to save event registration form', error);
    const message = error instanceof Error ? error.message : 'Unable to save registration form.';
    return errorResponse(message, 400);
  }
}
