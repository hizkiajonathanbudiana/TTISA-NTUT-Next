import { NextResponse } from 'next/server';
import { requireAdminDb } from '@/lib/firebase/admin';
import { requireAuthUser } from '@/lib/server/auth';
import { coerceDate } from '@/lib/utils/dates';
import { buildRegistrationContext, findRegistrationForUser } from '@/lib/server/registrations';

const errorResponse = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

type RouteContext = { params: Promise<{ slug: string }> };

const optionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return errorResponse('Missing event identifier.', 400);
    }

    const [authUser, db] = await Promise.all([requireAuthUser(request), Promise.resolve(requireAdminDb())]);
    const eventSnapshot = await db
      .collection('cms_events')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    const eventDoc = eventSnapshot.docs[0];
    if (!eventDoc) {
      return errorResponse('Event not found.', 404);
    }

    const eventData = eventDoc.data() ?? {};
    const eventId = eventDoc.id;
    if ((eventData.status ?? 'draft') !== 'published') {
      return errorResponse('This event is not open for registration.', 400);
    }

    const startDate = coerceDate(eventData.startDate ?? eventData.start_at);
    if (startDate && startDate < new Date()) {
      return errorResponse('This event has already started or ended.', 400);
    }

    const existing = await findRegistrationForUser(db, eventId, authUser.uid);
    if (existing) {
      return NextResponse.json({ registration: existing.context, alreadyRegistered: true });
    }

    const [userSnapshot, profileSnapshot] = await Promise.all([
      db.collection('cms_users').doc(authUser.uid).get(),
      db.collection('user_profiles').doc(authUser.uid).get(),
    ]);

    const userRecord = userSnapshot.data() ?? {};
    const profile = profileSnapshot.data() ?? {};

    const registrationData = {
      eventId,
      eventSlug: (eventData.slug ?? slug ?? eventDoc.id).toString(),
      eventTitle: (eventData.title ?? eventData.titleEn ?? 'Untitled Event').toString(),
      userId: authUser.uid,
      englishName:
        optionalString(profile.englishName ?? profile.english_name) ??
        optionalString(userRecord.englishName ?? userRecord.fullName) ??
        optionalString(authUser.name) ??
        null,
      studentId: optionalString(profile.studentId ?? profile.student_id ?? userRecord.studentId ?? userRecord.student_id),
      department: optionalString(profile.department ?? userRecord.department),
      nationality: optionalString(profile.nationality ?? userRecord.nationality),
      email: optionalString(userRecord.email ?? authUser.email) ?? authUser.email ?? null,
      paymentProofUrl: null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = db.collection('cms_event_registrations').doc();
    await docRef.set(registrationData);

    const contextPayload = buildRegistrationContext(docRef.id, registrationData, null);
    return NextResponse.json({ registration: contextPayload, alreadyRegistered: false });
  } catch (error) {
    console.error('Failed to register for event', error);
    const message = error instanceof Error ? error.message : 'Unable to register for this event.';
    return errorResponse(message, 400);
  }
}
