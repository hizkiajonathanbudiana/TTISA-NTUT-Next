import { FirebaseError } from 'firebase/app';

const firebaseErrorMap: Record<string, string> = {
  'auth/configuration-not-found':
    'Email/password sign-in is disabled for this Firebase project. Enable Email/Password in Firebase Console → Authentication → Sign-in method.',
  'auth/invalid-credential': 'The email or password is incorrect. Please try again.',
  'auth/invalid-email': 'The email address is badly formatted.',
  'auth/user-not-found': 'No account exists for that email address.',
  'auth/wrong-password': 'The password you entered is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/popup-closed-by-user': 'The sign-in popup was closed before completing. Please try again.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Allow popups for this site and retry.',
  'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
};

export const getAuthErrorMessage = (error: unknown, fallback = 'Authentication failed.') => {
  if (error instanceof FirebaseError) {
    return firebaseErrorMap[error.code] ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};
