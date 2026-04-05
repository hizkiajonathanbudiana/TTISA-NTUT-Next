import { NextResponse } from 'next/server';
import { cmsErrorResponse } from '@/app/api/cms/utils';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminDb } from '@/lib/firebase/admin';
import { requireEventSummary, serializeTokenSnapshot } from '@/lib/cms/registrationUtils';

const TOKEN_LIFETIME_HOURS = 24;

const generateSixDigitToken = () => Math.floor(100000 + Math.random() * 900000).toString();

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request);
    const { eventId } = await context.params;
    if (!eventId) {
      throw new CmsHttpError(400, 'Missing event id.');
    }

    const db = requireAdminDb();
    await requireEventSummary(db, eventId);

    const now = new Date();
    const snapshot = await db
      .collection('cms_event_tokens')
      .where('eventId', '==', eventId)
      .where('expiresAt', '>=', now)
      .orderBy('expiresAt', 'desc')
      .limit(1)
      .get();

    const tokenDoc = snapshot.docs[0];
    return NextResponse.json({ token: tokenDoc ? serializeTokenSnapshot(tokenDoc) : null });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request);
    const { eventId } = await context.params;
    if (!eventId) {
      throw new CmsHttpError(400, 'Missing event id.');
    }

    const db = requireAdminDb();
    await requireEventSummary(db, eventId);

    const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_HOURS * 60 * 60 * 1000);
    const docRef = await db.collection('cms_event_tokens').add({
      eventId,
      token: generateSixDigitToken(),
      expiresAt,
      createdAt: new Date(),
    });

    const snapshot = await docRef.get();
    return NextResponse.json({ token: serializeTokenSnapshot(snapshot) }, { status: 201 });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
