import { NextResponse } from 'next/server';
import { cmsErrorResponse } from '@/app/api/cms/utils';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminDb } from '@/lib/firebase/admin';
import { isRegistrationStatus, serializeRegistrationSnapshot } from '@/lib/cms/registrationUtils';

type RouteContext = { params: Promise<{ eventId: string; registrationId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request);
    const { eventId, registrationId } = await context.params;
    if (!eventId || !registrationId) {
      throw new CmsHttpError(400, 'Missing event or registration id.');
    }

    const body = await request.json().catch(() => ({}));
    const nextStatus = body?.status;
    if (!isRegistrationStatus(nextStatus)) {
      throw new CmsHttpError(400, 'Invalid registration status.');
    }

    const db = requireAdminDb();
    const docRef = db.collection('cms_event_registrations').doc(registrationId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new CmsHttpError(404, 'Registration not found.');
    }

    const data = snapshot.data() ?? {};
    const registrationEventId = (data.eventId ?? data.event_id ?? '').toString();
    if (registrationEventId !== eventId) {
      throw new CmsHttpError(400, 'Registration does not belong to the requested event.');
    }

    await docRef.set({ status: nextStatus, updatedAt: new Date() }, { merge: true });
    const nextSnapshot = await docRef.get();

    return NextResponse.json({ registration: serializeRegistrationSnapshot(nextSnapshot) });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
