import { NextResponse } from 'next/server';
import { cmsErrorResponse } from '@/app/api/cms/utils';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminDb } from '@/lib/firebase/admin';

type RouteContext = { params: Promise<{ eventId: string; reviewId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request);
    const { eventId, reviewId } = await context.params;
    if (!eventId || !reviewId) {
      throw new CmsHttpError(400, 'Missing event or review id.');
    }

    const db = requireAdminDb();
    const docRef = db.collection('cms_event_reviews').doc(reviewId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new CmsHttpError(404, 'Review not found.');
    }

    const data = snapshot.data() ?? {};
    const reviewEventId = (data.eventId ?? data.event_id ?? '').toString();
    if (reviewEventId !== eventId) {
      throw new CmsHttpError(400, 'Review does not belong to the requested event.');
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
