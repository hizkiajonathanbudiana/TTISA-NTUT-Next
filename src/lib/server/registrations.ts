import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { CmsEventRegistrationStatus, EventRegistrationContext } from '@/types/content';
import { coerceDate } from '@/lib/utils/dates';

const normalizeStatus = (value: unknown): CmsEventRegistrationStatus => {
  if (value === 'accepted' || value === 'rejected' || value === 'pending') {
    return value;
  }
  return 'pending';
};

const optionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const buildRegistrationContext = (
  id: string,
  data: Record<string, unknown>,
  attendanceId: string | null,
): EventRegistrationContext => ({
  id,
  eventId: (data.eventId ?? data.event_id ?? '').toString(),
  status: normalizeStatus(data.status),
  paymentProofUrl: optionalString(data.paymentProofUrl ?? data.payment_proof_url),
  createdAt: coerceDate(data.createdAt ?? data.created_at) ?? new Date(),
  attendanceId: attendanceId ?? null,
});

export const findRegistrationForUser = async (
  db: Firestore,
  eventId: string,
  userId: string,
): Promise<{
  doc: QueryDocumentSnapshot;
  context: EventRegistrationContext;
} | null> => {
  const snapshot = await db
    .collection('cms_event_registrations')
    .where('eventId', '==', eventId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  const docSnap = snapshot.docs[0];
  if (!docSnap) {
    return null;
  }

  const attendanceSnapshot = await db.collection('cms_event_attendances').doc(docSnap.id).get();
  const context = buildRegistrationContext(docSnap.id, docSnap.data() ?? {}, attendanceSnapshot.exists ? docSnap.id : null);
  return { doc: docSnap, context };
};
