import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { serverEnv } from '@/lib/env.server';

export const SESSION_COOKIE_NAME = 'session';

const SESSION_MAX_AGE_DAYS = serverEnv?.SESSION_COOKIE_MAX_AGE_DAYS ?? 5;

export const getSessionCookieOptions = (maxAge = SESSION_MAX_AGE_DAYS * 24 * 60 * 60) => ({
  name: SESSION_COOKIE_NAME,
  value: '',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

export const createSessionCookie = async (idToken: string) => {
  if (!adminAuth) {
    throw new Error('Firebase Admin credentials are missing; cannot create session cookies.');
  }
  const expiresIn = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return adminAuth.createSessionCookie(idToken, { expiresIn });
};

export const setSessionCookie = async (sessionCookie: string) => {
  const cookieStore = await cookies();
  cookieStore.set({
    ...getSessionCookieOptions(),
    value: sessionCookie,
  });
};

export const clearSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
};
