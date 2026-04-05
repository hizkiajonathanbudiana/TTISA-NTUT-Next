import { NextResponse } from 'next/server';
import { getQueueSecret } from '@/lib/server/firestoreQueue';
import { parseRegistrationInput, saveRegistrationSubmission, type RegistrationAuthUser } from '@/lib/server/registrationForm';

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
    const slug = typeof payload?.slug === 'string' ? payload.slug.trim() : '';
    const authUser = (payload?.authUser ?? {}) as RegistrationAuthUser;
    const inputBody = payload?.body ?? {};

    if (!slug || !authUser?.uid) {
      return errorResponse('Missing registration payload.', 400);
    }

    const input = parseRegistrationInput(inputBody);
    const result = await saveRegistrationSubmission(slug, authUser, input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save registration.';
    return errorResponse(message, 500);
  }
}
