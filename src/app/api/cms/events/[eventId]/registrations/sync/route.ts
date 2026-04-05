import { NextResponse } from 'next/server';
import { cmsErrorResponse } from '@/app/api/cms/utils';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminDb } from '@/lib/firebase/admin';
import { ensurePrivilegedRoleRegistrations, requireEventSummary } from '@/lib/cms/registrationUtils';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request, ['admin', 'developer', 'organizer']);

    const { eventId } = await context.params;
    if (!eventId) {
      throw new CmsHttpError(400, 'Missing event id.');
    }

    const db = requireAdminDb();
    const event = await requireEventSummary(db, eventId);
    const result = await ensurePrivilegedRoleRegistrations(db, {
      id: event.id,
      title: event.title,
      slug: event.slug ?? null,
    });

    return NextResponse.json({ success: true, created: result.created });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
