import { NextResponse } from 'next/server';
import { requireAdminDb } from '@/lib/firebase/admin';
import { requireAuthUser } from '@/lib/server/auth';
import { buildRegistrationContext, findRegistrationForUser } from '@/lib/server/registrations';

const errorResponse = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return errorResponse('Missing event identifier.', 400);
    }

    const body = await request.json().catch(() => ({}));
    const proofUrl = typeof body?.proofUrl === 'string' ? body.proofUrl.trim() : '';
    if (!proofUrl) {
      return errorResponse('Payment proof URL is required.', 400);
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

    const registration = await findRegistrationForUser(db, eventDoc.id, authUser.uid);

    if (!registration) {
      return errorResponse('You have not registered for this event yet.', 404);
    }

    if (registration.context.status !== 'pending') {
      return errorResponse('This registration is no longer pending.', 400);
    }

    await registration.doc.ref.set({ paymentProofUrl: proofUrl, updatedAt: new Date() }, { merge: true });
    const refreshed = await registration.doc.ref.get();
    const contextPayload = buildRegistrationContext(
      registration.doc.id,
      refreshed.data() ?? {},
      registration.context.attendanceId ?? null,
    );

    return NextResponse.json({ registration: contextPayload });
  } catch (error) {
    console.error('Failed to upload payment proof', error);
    const message = error instanceof Error ? error.message : 'Unable to upload payment proof.';
    return errorResponse(message, 400);
  }
}
