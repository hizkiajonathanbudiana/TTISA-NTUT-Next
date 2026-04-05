'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signInWithEmailPassword: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserProfile = async (nextUser: User) => {
    const token = await nextUser.getIdToken();
    await fetch('/api/auth/sync-profile', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        syncUserProfile(nextUser).catch((error) => {
          console.warn('Failed to sync user profile', error);
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut(firebaseAuth);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(firebaseAuth, provider);
    await syncUserProfile(credential.user);
    return credential.user;
  };

  const handleEmailPasswordSignIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    await syncUserProfile(credential.user);
    return credential.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle: handleGoogleSignIn,
        signInWithEmailPassword: handleEmailPasswordSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
