import { requireAdminAuth, requireAdminDb } from '@/lib/firebase/admin';
import type { CmsRole } from '@/types/content';

export class CmsHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface VerifiedCmsRequest {
  uid: string;
  role: CmsRole;
}

const DEFAULT_ALLOWED_ROLES: CmsRole[] = ['admin', 'developer', 'organizer'];

export const verifyCmsRequest = async (
  request: Request,
  allowedRoles: CmsRole[] = DEFAULT_ALLOWED_ROLES,
): Promise<VerifiedCmsRequest> => {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new CmsHttpError(401, 'Missing or invalid Authorization header. Include a Firebase ID token.');
  }

  try {
    const auth = requireAdminAuth();
    const db = requireAdminDb();
    const idToken = authHeader.replace('Bearer ', '').trim();
    const decoded = await auth.verifyIdToken(idToken);
    const profileSnap = await db.collection('cms_users').doc(decoded.uid).get();
    const role = (profileSnap.data()?.role ?? 'member') as CmsRole;

    if (!allowedRoles.includes(role)) {
      throw new CmsHttpError(403, 'You do not have permission to perform this action.');
    }

    return { uid: decoded.uid, role } satisfies VerifiedCmsRequest;
  } catch (error) {
    if (error instanceof CmsHttpError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('Firebase Admin')) {
      throw new CmsHttpError(500, error.message);
    }
    throw new CmsHttpError(401, 'Failed to verify Firebase ID token.');
  }
};
