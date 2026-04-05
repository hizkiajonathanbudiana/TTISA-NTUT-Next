import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/firebase/admin';
import { enqueueQueueJob, isQueueEnabled } from '@/lib/server/firestoreQueue';
import { processCheckin, CheckinError } from '@/lib/server/checkin';

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
    const idToken = authHeader.replace('Bearer ', '').trim();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    if (isQueueEnabled()) {
      await enqueueQueueJob({ path: '/api/queue/checkin', payload: { token, uid } });
      return NextResponse.json({ message: 'Check-in queued. Please wait a moment and refresh.' }, { status: 202 });
    }

    const result = await processCheckin({ token, uid });
    return NextResponse.json({ message: result.message });
  } catch (error) {
    if (error instanceof CheckinError) {
      return errorResponse(error.message, error.status);
    }
    const message = error instanceof Error ? error.message : 'Failed to complete check-in.';
    return errorResponse(message, 400);
  }
}
