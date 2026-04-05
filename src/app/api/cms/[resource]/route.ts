import { NextResponse } from 'next/server';
import { requireAdminDb } from '@/lib/firebase/admin';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { cmsErrorResponse, formatZodError, getResourceDefinition, serializeDoc, stripUndefined } from '@/app/api/cms/utils';

type ResourceContext = { params: Promise<{ resource: string }> };

export async function GET(request: Request, context: ResourceContext) {
  try {
    const params = await context.params;
    const definition = getResourceDefinition(params.resource);
    await verifyCmsRequest(request, definition.allowedRoles);

    const db = requireAdminDb();
    const collectionRef = db.collection(definition.collection);
    const snapshot = await collectionRef.orderBy('updatedAt', 'desc').get();
    const payload = snapshot.docs.map((doc) => serializeDoc(doc.id, doc.data()));
    return NextResponse.json(payload);
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function POST(request: Request, context: ResourceContext) {
  try {
    const params = await context.params;
    const definition = getResourceDefinition(params.resource);
    await verifyCmsRequest(request, definition.allowedRoles);

    const body = await request.json();
    const parsed = definition.schema.safeParse(body);

    if (!parsed.success) {
      throw new CmsHttpError(400, formatZodError(parsed.error));
    }

    const now = new Date();
    const data = stripUndefined({
      ...definition.defaults,
      ...parsed.data,
      updatedAt: now,
      createdAt: now,
    });

    let createdId: string;

    const db = requireAdminDb();
    if (definition.useCustomIdField) {
      const customId = String(parsed.data[definition.useCustomIdField]);
      await db.collection(definition.collection).doc(customId).set(data, { merge: false });
      createdId = customId;
    } else {
      const docRef = await db.collection(definition.collection).add(data);
      createdId = docRef.id;
    }

    return NextResponse.json(serializeDoc(createdId, data), { status: 201 });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
