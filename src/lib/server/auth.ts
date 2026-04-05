import type { DecodedIdToken } from 'firebase-admin/auth';
import { requireAdminAuth } from '@/lib/firebase/admin';

const getAuthorizationHeader = (request: Request) =>
  request.headers.get('authorization') ?? request.headers.get('Authorization');

export const extractBearerToken = (request: Request): string | null => {
  const header = getAuthorizationHeader(request);
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.replace('Bearer ', '').trim();
};

export const getOptionalAuthUser = async (request: Request): Promise<DecodedIdToken | null> => {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  try {
    const auth = requireAdminAuth();
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.warn('Failed to verify auth token', error);
    return null;
  }
};

export const requireAuthUser = async (request: Request): Promise<DecodedIdToken> => {
  const token = extractBearerToken(request);
  if (!token) {
    throw new Error('Missing Authorization header. Please sign in again.');
  }
  const auth = requireAdminAuth();
  return auth.verifyIdToken(token);
};
