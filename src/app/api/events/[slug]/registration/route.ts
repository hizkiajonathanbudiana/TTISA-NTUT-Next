import { NextResponse } from 'next/server';
import { requireAdminDb } from '@/lib/firebase/admin';
import { requireAuthUser } from '@/lib/server/auth';
import { coerceDate } from '@/lib/utils/dates';
import { enqueueQueueJob, isQueueEnabled } from '@/lib/server/firestoreQueue';
import {
  mapProfile,
  mapRegistration,
  parseRegistrationInput,
  resolveEvent,
  saveRegistrationSubmission,
} from '@/lib/server/registrationForm';

const errorResponse = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

type RouteContext = { params: Promise<{ slug: string }> };

type PaymentMethod = 'cash' | 'transfer';

const optionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
    const input = parseRegistrationInput(body);

    if (isQueueEnabled()) {
      await enqueueQueueJob({
        path: '/api/queue/registration',
        payload: {
          slug,
          authUser: {
            uid: authUser.uid,
            email: authUser.email ?? null,
            name: authUser.name ?? null,
          },
          body,
        },
      });

      return NextResponse.json({ canEdit: true, queued: true }, { status: 202 });
    }

    const result = await saveRegistrationSubmission(slug, {
      uid: authUser.uid,
      email: authUser.email ?? null,
      name: authUser.name ?? null,
    }, input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to save event registration form', error);
    const message = error instanceof Error ? error.message : 'Unable to save registration form.';
    return errorResponse(message, 400);
  }
}
