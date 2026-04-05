import { NextResponse } from 'next/server';
import { getQueueSecret } from '@/lib/server/firestoreQueue';
import { processCheckin, CheckinError } from '@/lib/server/checkin';

const errorResponse = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const secret = getQueueSecret();
    if (secret) {
      const header = request.headers.get('x-queue-secret');
      if (header !== secret) {
        return errorResponse('Unauthorized.', 401);
      }
    }

    const payload = await request.json().catch(() => ({}));
    const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
    const uid = typeof payload?.uid === 'string' ? payload.uid.trim() : '';

    if (!token || !uid) {
      return errorResponse('Missing token or uid.', 400);
    }

    const result = await processCheckin({ token, uid });
    return NextResponse.json({ message: result.message });
  } catch (error) {
    if (error instanceof CheckinError) {
      return NextResponse.json({ error: error.message }, { status: 200 });
    }

    const message = error instanceof Error ? error.message : 'Failed to complete check-in.';
    return errorResponse(message, 500);
  }
}
