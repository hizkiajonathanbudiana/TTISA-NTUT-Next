import { NextResponse } from 'next/server';
import { cmsErrorResponse } from '@/app/api/cms/utils';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminDb } from '@/lib/firebase/admin';

type RouteContext = { params: Promise<{ eventId: string; registrationId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request, ['admin', 'developer', 'organizer']);

    const { eventId, registrationId } = await context.params;
    if (!eventId || !registrationId) {
      throw new CmsHttpError(400, 'Missing event or registration id.');
    }

    const db = requireAdminDb();
    const registrationRef = db.collection('cms_event_registrations').doc(registrationId);
    const registrationSnap = await registrationRef.get();

    if (!registrationSnap.exists) {
      throw new CmsHttpError(404, 'Registration not found.');
    }

    const registrationData = registrationSnap.data() ?? {};
    const registrationEventId = (registrationData.eventId ?? registrationData.event_id ?? '').toString();
    if (registrationEventId !== eventId) {
      throw new CmsHttpError(400, 'Registration does not belong to this event.');
    }

    const registrationStatus = (registrationData.status ?? 'pending').toString();
    if (registrationStatus !== 'accepted') {
      throw new CmsHttpError(400, 'Only accepted registrations can be checked in.');
    }

    const attendanceRef = db.collection('cms_event_attendances').doc(registrationId);
    const attendanceSnap = await attendanceRef.get();

    if (!attendanceSnap.exists) {
      await attendanceRef.set({
        registrationId,
        eventId,
        userId: (registrationData.userId ?? registrationData.user_id ?? '').toString(),
        tokenId: null,
        source: 'cms_manual',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request, ['admin', 'developer', 'organizer']);

    const { eventId, registrationId } = await context.params;
    if (!eventId || !registrationId) {
      throw new CmsHttpError(400, 'Missing event or registration id.');
    }

    const db = requireAdminDb();
    const registrationRef = db.collection('cms_event_registrations').doc(registrationId);
    const registrationSnap = await registrationRef.get();

    if (!registrationSnap.exists) {
      throw new CmsHttpError(404, 'Registration not found.');
    }

    const registrationData = registrationSnap.data() ?? {};
    const registrationEventId = (registrationData.eventId ?? registrationData.event_id ?? '').toString();
    if (registrationEventId !== eventId) {
      throw new CmsHttpError(400, 'Registration does not belong to this event.');
    }

    const attendanceRef = db.collection('cms_event_attendances').doc(registrationId);
    const attendanceSnap = await attendanceRef.get();
    if (!attendanceSnap.exists) {
      throw new CmsHttpError(404, 'Attendance record not found.');
    }

    await attendanceRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
