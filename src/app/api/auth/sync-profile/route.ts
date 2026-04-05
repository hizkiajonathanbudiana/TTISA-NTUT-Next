import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/auth';
import { processSyncProfile } from '@/lib/server/syncProfile';
import { enqueueQueueJob, isQueueEnabled } from '@/lib/server/firestoreQueue';

const optionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export async function POST(request: Request) {
  try {
    const authUser = await requireAuthUser(request);
    const payload = {
      uid: authUser.uid,
      email: optionalString(authUser.email) ?? null,
      name: optionalString(authUser.name) ?? null,
    };

    if (isQueueEnabled()) {
      await enqueueQueueJob({ path: '/api/queue/sync-profile', payload: { authUser: payload } });
      return NextResponse.json({ success: true, queued: true }, { status: 202 });
    }

    const result = await processSyncProfile(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync user profile.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
