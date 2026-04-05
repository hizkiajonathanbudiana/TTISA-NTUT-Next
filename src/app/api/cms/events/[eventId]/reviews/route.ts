import { NextResponse } from 'next/server';
import { cmsErrorResponse } from '@/app/api/cms/utils';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminDb } from '@/lib/firebase/admin';
import { serializeReviewSnapshot } from '@/lib/cms/registrationUtils';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request);
    const { eventId } = await context.params;
    if (!eventId) {
      throw new CmsHttpError(400, 'Missing event id.');
    }

    const db = requireAdminDb();
    const reviewsSnap = await db
      .collection('cms_event_reviews')
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = reviewsSnap.docs.map(serializeReviewSnapshot);
    return NextResponse.json({ reviews });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
