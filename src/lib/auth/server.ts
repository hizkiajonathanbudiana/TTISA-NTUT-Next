import { cache } from 'react';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types/content';

export type SessionUser = {
  uid: string;
  email?: string | null;
  roles: string[];
  profile: UserProfile | null;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!adminAuth || !adminDb) {
    console.warn('Firebase Admin credentials are missing; session lookup is disabled.');
    return null;
  }

  const auth = adminAuth;
  const db = adminDb;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const snapshot = await db.collection('users').doc(decoded.uid).get();
    const data = snapshot.data();

    const roles = Array.isArray(data?.roles) && data.roles.length > 0 ? data.roles : ['member'];
    const profile: UserProfile | null = data?.profile ?? null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? data?.email ?? null,
      roles,
      profile,
    };
  } catch (error) {
    console.warn('Failed to verify session cookie', error);
    return null;
  }
});

export const requireSessionUser = async () => {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
};

export const requireAdminUser = async () => {
  const user = await requireSessionUser();
  if (!user.roles.includes('admin')) {
    throw new Error('Administrator role required');
  }
  return user;
};
