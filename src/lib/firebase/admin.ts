import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { serverEnv, hasServerEnv } from '@/lib/env.server';

const app = hasServerEnv && serverEnv
  ? getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: serverEnv.FIREBASE_PROJECT_ID,
          clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
          privateKey: serverEnv.FIREBASE_PRIVATE_KEY,
        }),
        projectId: serverEnv.FIREBASE_PROJECT_ID,
        storageBucket: serverEnv.FIREBASE_STORAGE_BUCKET,
        databaseURL: serverEnv.FIREBASE_DATABASE_URL,
      })
  : null;

export const adminApp = app;
export const adminAuth = app ? getAuth(app) : null;
export const adminDb = app ? getFirestore(app) : null;

export const requireAdminDb = () => {
  if (!adminDb) {
    throw new Error('Firebase Admin Firestore is not configured. Set the server-side env variables to continue.');
  }
  return adminDb;
};

export const requireAdminAuth = () => {
  if (!adminAuth) {
    throw new Error('Firebase Admin Auth is not configured. Set the server-side env variables to continue.');
  }
  return adminAuth;
};
