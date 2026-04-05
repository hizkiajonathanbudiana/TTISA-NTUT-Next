import { NextResponse } from 'next/server';
import { requireAdminDb } from '@/lib/firebase/admin';
import { getOptionalAuthUser } from '@/lib/server/auth';
import {
  mapEventRecord,
  mapEventReviewRecord,
  mapPaymentInstructionRecord,
  mapProofContactRecord,
} from '@/lib/mappers/public';
import { findRegistrationForUser } from '@/lib/server/registrations';
import type { EventDetailPayload, EventRegistrationContext } from '@/types/content';

const errorResponse = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return errorResponse('Missing event slug.', 400);
    }

    const db = requireAdminDb();
    const eventSnapshot = await db
      .collection('cms_events')
      .where('slug', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    const eventDoc = eventSnapshot.docs[0];
    if (!eventDoc) {
      return errorResponse('Event not found.', 404);
    }

    const event = mapEventRecord(eventDoc.id, eventDoc.data() ?? {});

    const authUser = await getOptionalAuthUser(request);
    let registration: EventRegistrationContext | null = null;
    if (authUser) {
      const existing = await findRegistrationForUser(db, eventDoc.id, authUser.uid);
      if (existing) {
        registration = existing.context;
      }
    }

    const [instructionsSnap, contactsSnap, reviewsSnap] = await Promise.all([
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
      db
        .collection('cms_event_reviews')
        .where('eventId', '==', eventDoc.id)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get(),
    ]);

    const payload: EventDetailPayload = {
      event,
      registration,
      paymentInstructions: instructionsSnap.docs.map((docSnap) =>
        mapPaymentInstructionRecord(docSnap.id, docSnap.data() ?? {}),
      ),
      proofContacts: contactsSnap.docs.map((docSnap) => mapProofContactRecord(docSnap.id, docSnap.data() ?? {})),
      reviews: reviewsSnap.docs.map((docSnap) => mapEventReviewRecord(docSnap.id, docSnap.data() ?? {})),
    } satisfies EventDetailPayload;

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to load event detail', error);
    return errorResponse('Unable to load this event.', 500);
  }
}
