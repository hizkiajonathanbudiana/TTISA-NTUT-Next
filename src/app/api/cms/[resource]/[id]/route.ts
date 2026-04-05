import { NextResponse } from 'next/server';
import { requireAdminDb } from '@/lib/firebase/admin';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import {
  cmsErrorResponse,
  formatZodError,
  getResourceDefinition,
  serializeDoc,
  stripUndefined,
} from '@/app/api/cms/utils';

type ResourceWithIdContext = { params: Promise<{ resource: string; id: string }> };

const getDocumentRefs = async (collection: string, id: string) => {
  const db = requireAdminDb();
  const docRef = db.collection(collection).doc(id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new CmsHttpError(404, 'Record not found.');
  }
  return { docRef, snapshot } as const;
};

export async function GET(request: Request, context: ResourceWithIdContext) {
  try {
    const params = await context.params;
    const definition = getResourceDefinition(params.resource);
    await verifyCmsRequest(request, definition.allowedRoles);
    const { snapshot } = await getDocumentRefs(definition.collection, params.id);
    return NextResponse.json(serializeDoc(snapshot.id, snapshot.data() ?? {}));
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: ResourceWithIdContext) {
  try {
    const params = await context.params;
    const definition = getResourceDefinition(params.resource);
    await verifyCmsRequest(request, definition.allowedRoles);
    const { docRef } = await getDocumentRefs(definition.collection, params.id);

    const body = await request.json();
    const parsed = definition.schema.partial().safeParse(body);

    if (!parsed.success) {
      throw new CmsHttpError(400, formatZodError(parsed.error));
    }

    const data = stripUndefined({ ...parsed.data, updatedAt: new Date() });
    await docRef.set(data, { merge: true });
    const nextSnapshot = await docRef.get();
    return NextResponse.json(serializeDoc(nextSnapshot.id, nextSnapshot.data() ?? {}));
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: ResourceWithIdContext) {
  try {
    const params = await context.params;
    const definition = getResourceDefinition(params.resource);
    await verifyCmsRequest(request, definition.allowedRoles);
    const { docRef } = await getDocumentRefs(definition.collection, params.id);
    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
