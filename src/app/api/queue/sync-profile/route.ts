import { NextResponse } from 'next/server';
import { getQueueSecret } from '@/lib/server/firestoreQueue';
import { processSyncProfile } from '@/lib/server/syncProfile';

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
    const authUser = (payload?.authUser ?? {}) as { uid?: unknown; email?: unknown; name?: unknown };
    const uid = typeof authUser.uid === 'string' ? authUser.uid.trim() : '';
    const email = typeof authUser.email === 'string' ? authUser.email.trim() : null;
    const name = typeof authUser.name === 'string' ? authUser.name.trim() : null;

    if (!uid) {
      return errorResponse('Missing auth user.', 400);
    }

    const result = await processSyncProfile({ uid, email, name });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync user profile.';
    return errorResponse(message, 500);
  }
}
