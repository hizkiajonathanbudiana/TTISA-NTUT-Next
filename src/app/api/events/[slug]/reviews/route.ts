import { NextResponse } from 'next/server';
import { requireAdminDb } from '@/lib/firebase/admin';
import { requireAuthUser } from '@/lib/server/auth';
import { findRegistrationForUser } from '@/lib/server/registrations';
import { coerceDate } from '@/lib/utils/dates';
import { mapEventReviewRecord } from '@/lib/mappers/public';

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

    const body = await request.json().catch(() => ({}));
    const rating = typeof body?.rating === 'number' ? body.rating : Number(body?.rating);
    const comment = optionalString(body?.comment);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return errorResponse('Rating must be between 1 and 5.', 400);
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
    const endDate = coerceDate(eventData.endDate ?? eventData.end_at ?? eventData.startDate ?? eventData.start_at);
    if (!endDate || endDate > new Date()) {
      return errorResponse('Reviews are only available after the event ends.', 400);
    }

    const registration = await findRegistrationForUser(db, eventId, authUser.uid);
    if (!registration || !registration.context.attendanceId) {
      return errorResponse('You must attend the event before leaving a review.', 400);
    }

    const existingReview = await db
      .collection('cms_event_reviews')
      .where('eventId', '==', eventId)
      .where('userId', '==', authUser.uid)
      .limit(1)
      .get();

    if (!existingReview.empty) {
      return errorResponse('You have already submitted a review for this event.', 400);
    }

    const [userSnapshot, profileSnapshot] = await Promise.all([
      db.collection('cms_users').doc(authUser.uid).get(),
      db.collection('user_profiles').doc(authUser.uid).get(),
    ]);

    const userRecord = userSnapshot.data() ?? {};
    const profile = profileSnapshot.data() ?? {};

    const reviewData = {
      eventId,
      userId: authUser.uid,
      englishName:
        optionalString(profile.englishName ?? profile.english_name) ??
        optionalString(userRecord.englishName ?? userRecord.fullName) ??
        optionalString(authUser.name) ??
        null,
      avatarUrl: optionalString(
        profile.avatarUrl ?? profile.avatar_url ?? userRecord.avatarUrl ?? userRecord.photoUrl ?? authUser.picture ?? null,
      ),
      rating,
      comment: comment ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const reviewRef = db.collection('cms_event_reviews').doc();
    await reviewRef.set(reviewData);

    const payload = mapEventReviewRecord(reviewRef.id, reviewData);
    return NextResponse.json({ review: payload });
  } catch (error) {
    console.error('Failed to submit review', error);
    const message = error instanceof Error ? error.message : 'Unable to submit review.';
    return errorResponse(message, 400);
  }
}
