import { NextResponse } from 'next/server';
import { cmsErrorResponse } from '@/app/api/cms/utils';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminDb } from '@/lib/firebase/admin';
import {
  buildRegistrationQuery,
  ensurePrivilegedRoleRegistrations,
  isRegistrationStatus,
  requireEventSummary,
  serializeRegistrationSnapshot,
} from '@/lib/cms/registrationUtils';
import type { CmsEventRegistrationStatus } from '@/types/content';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request);
    const { eventId } = await context.params;
    if (!eventId) {
      throw new CmsHttpError(400, 'Missing event id.');
    }

    const url = new URL(request.url);
    const rawStatus = (url.searchParams.get('status') ?? 'all').toLowerCase();
    let statusFilter: CmsEventRegistrationStatus | 'all' = 'all';

    if (rawStatus !== 'all') {
      if (!isRegistrationStatus(rawStatus)) {
        throw new CmsHttpError(400, 'Invalid status filter.');
      }
      statusFilter = rawStatus;
    }

    const db = requireAdminDb();
    const event = await requireEventSummary(db, eventId);

    await ensurePrivilegedRoleRegistrations(db, {
      id: event.id,
      title: event.title,
      slug: event.slug ?? null,
    });

    const registrationsSnap = await buildRegistrationQuery(db, eventId, statusFilter).get();
    const attendanceSnap = await db
      .collection('cms_event_attendances')
      .where('eventId', '==', eventId)
      .get();

    const attendanceByRegistrationId = new Map(
      attendanceSnap.docs.map((docSnap) => {
        const data = docSnap.data() ?? {};
        const registrationId = (data.registrationId ?? '').toString() || docSnap.id;
        const createdAt = data.createdAt;
        const checkedInAt =
          createdAt instanceof Date
            ? createdAt.toISOString()
            : createdAt && typeof createdAt === 'object' && 'toDate' in createdAt && typeof (createdAt as { toDate: () => Date }).toDate === 'function'
            ? (createdAt as { toDate: () => Date }).toDate().toISOString()
            : null;
        return [registrationId, checkedInAt] as const;
      }),
    );

    const registrations = registrationsSnap.docs.map((docSnap) => {
      const base = serializeRegistrationSnapshot(docSnap);
      const checkedInAt = attendanceByRegistrationId.get(base.id) ?? null;
      return {
        ...base,
        checkedIn: Boolean(checkedInAt),
        checkedInAt,
      };
    });

    return NextResponse.json({ event, registrations });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
