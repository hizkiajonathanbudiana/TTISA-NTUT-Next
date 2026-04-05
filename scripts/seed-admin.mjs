#!/usr/bin/env node
import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const requiredEnv = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required server env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });

const auth = getAuth(app);
const db = getFirestore(app);

const targetEmail = process.argv[2]?.toLowerCase() || 'ntut.ttisa@gmail.com';
const displayName = process.argv[3] || 'TTISA Admin';

const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 16 })
    .map(() => alphabet.charAt(Math.floor(Math.random() * alphabet.length)))
    .join('');
};

(async () => {
  try {
    let userRecord;
    let generatedPassword;
    try {
      userRecord = await auth.getUserByEmail(targetEmail);
      console.log(`Found existing Firebase Auth user for ${targetEmail}.`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        generatedPassword = generatePassword();
        userRecord = await auth.createUser({
          email: targetEmail,
          password: generatedPassword,
          emailVerified: true,
          displayName,
        });
        console.log(`Created new Firebase Auth user for ${targetEmail}.`);
      } else {
        throw error;
      }
    }

    await db.collection('cms_users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: targetEmail,
        role: 'admin',
        englishName: displayName,
        avatarUrl: userRecord.photoURL ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    console.log(`Ensured cms_users/${userRecord.uid} has role=admin.`);
    if (generatedPassword) {
      console.log('\nTemporary password (store securely and rotate after first login):');
      console.log(generatedPassword);
    }
    console.log('\nSeed complete.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin user:', error);
    process.exit(1);
  }
})();
