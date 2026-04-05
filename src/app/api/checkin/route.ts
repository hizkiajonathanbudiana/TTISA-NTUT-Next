import { NextResponse } from 'next/server';
import { requireAdminAuth, requireAdminDb } from '@/lib/firebase/admin';

const errorResponse = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Missing Authorization header. Please sign in again.', 401);
    }

    const payload = await request.json().catch(() => null);
    const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
    if (!token) {
      return errorResponse('Check-in token is required.');
    }

    const auth = requireAdminAuth();
    const db = requireAdminDb();
    const idToken = authHeader.replace('Bearer ', '').trim();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const tokenSnapshot = await db
      .collection('cms_event_tokens')
      .where('token', '==', token)
      .limit(1)
      .get();

    const tokenDoc = tokenSnapshot.docs[0];
    if (!tokenDoc) {
      return errorResponse('Invalid or expired check-in token.');
    }

    const tokenData = tokenDoc.data() ?? {};
    const eventId = (tokenData.eventId ?? tokenData.event_id ?? '').toString();
    if (!eventId) {
      return errorResponse('This token is missing its event reference. Please generate a new one.');
    }
    const expiresAtValue = tokenData.expiresAt ?? tokenData.expires_at;
    const expiresAt = (() => {
      if (!expiresAtValue) return null;
      if (expiresAtValue instanceof Date) return expiresAtValue;
      if (typeof expiresAtValue === 'object' && 'toDate' in expiresAtValue && typeof expiresAtValue.toDate === 'function') {
        return expiresAtValue.toDate();
      }
      const parsed = new Date(expiresAtValue);
      return Number.isNaN(parsed.valueOf()) ? null : parsed;
    })();
    if (!expiresAt || expiresAt < new Date()) {
      return errorResponse('This check-in token has expired.');
    }

    const registrationSnapshot = await db
      .collection('cms_event_registrations')
      .where('eventId', '==', eventId)
      .where('userId', '==', uid)
      .limit(1)
      .get();

    const registrationDoc = registrationSnapshot.docs[0];
    if (!registrationDoc) {
      return errorResponse('Registration not found. Please register for the event first.');
    }

    const registrationData = registrationDoc.data() ?? {};
    const status = (registrationData.status ?? 'pending').toString();
    if (status !== 'accepted') {
      return errorResponse(`Your registration status is '${status}'. It must be 'accepted' to check in.`);
    }

    const attendanceRef = db.collection('cms_event_attendances').doc(registrationDoc.id);
    const attendanceSnapshot = await attendanceRef.get();
    if (attendanceSnapshot.exists) {
      return NextResponse.json({ message: 'You have already checked in for this event.' });
    }

    await attendanceRef.set({
      registrationId: registrationDoc.id,
      eventId,
      userId: uid,
      tokenId: tokenDoc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: 'Welcome! You are now checked in.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete check-in.';
    return errorResponse(message, 400);
  }
}
