import { requireAdminAuth, requireAdminDb } from '@/lib/firebase/admin';

export class CheckinError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const parseExpiry = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

export const processCheckin = async ({ token, uid }: { token: string; uid: string }) => {
  const auth = requireAdminAuth();
  const db = requireAdminDb();

  const tokenSnapshot = await db
    .collection('cms_event_tokens')
    .where('token', '==', token)
    .limit(1)
    .get();

  const tokenDoc = tokenSnapshot.docs[0];
  if (!tokenDoc) {
    throw new CheckinError('Invalid or expired check-in token.', 400);
  }

  const tokenData = tokenDoc.data() ?? {};
  const eventId = (tokenData.eventId ?? tokenData.event_id ?? '').toString();
  if (!eventId) {
    throw new CheckinError('This token is missing its event reference. Please generate a new one.', 400);
  }

  const expiresAt = parseExpiry(tokenData.expiresAt ?? tokenData.expires_at);
  if (!expiresAt || expiresAt < new Date()) {
    throw new CheckinError('This check-in token has expired.', 400);
  }

  const registrationSnapshot = await db
    .collection('cms_event_registrations')
    .where('eventId', '==', eventId)
    .where('userId', '==', uid)
    .limit(1)
    .get();

  const registrationDoc = registrationSnapshot.docs[0];
  if (!registrationDoc) {
    throw new CheckinError('Registration not found. Please register for the event first.', 400);
  }

  const registrationData = registrationDoc.data() ?? {};
  const status = (registrationData.status ?? 'pending').toString();
  if (status !== 'accepted') {
    throw new CheckinError(`Your registration status is '${status}'. It must be 'accepted' to check in.`, 400);
  }

  const attendanceRef = db.collection('cms_event_attendances').doc(registrationDoc.id);
  try {
    await attendanceRef.create({
      registrationId: registrationDoc.id,
      eventId,
      userId: uid,
      tokenId: tokenDoc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
    const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
    if (code === '6' || code.toLowerCase().includes('already') || message.toLowerCase().includes('already')) {
      return { message: 'You have already checked in for this event.', status: 'already' as const };
    }
    throw error;
  }

  return { message: 'Welcome! You are now checked in.', status: 'success' as const };
};
