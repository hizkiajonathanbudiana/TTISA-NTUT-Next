'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';

const POST_LOGIN_REDIRECT_KEY = 'ttisa_post_login_redirect';
const POST_LOGIN_REDIRECT_TTL_MS = 10 * 60 * 1000;

const getCurrentPath = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

const rememberPostLoginRedirect = (redirectTo?: string) => {
  if (typeof window === 'undefined') return;

  const target = (redirectTo?.trim() || getCurrentPath()).trim();
  if (!target.startsWith('/')) return;

  localStorage.setItem(
    POST_LOGIN_REDIRECT_KEY,
    JSON.stringify({ target, ts: Date.now() }),
  );
};

const readPostLoginRedirect = (): string | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { target?: string; ts?: number };
    if (!parsed?.target || typeof parsed.target !== 'string' || !parsed.target.startsWith('/')) {
      localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      return null;
    }
    if (!parsed.ts || Date.now() - parsed.ts > POST_LOGIN_REDIRECT_TTL_MS) {
      localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      return null;
    }
    return parsed.target;
  } catch {
    localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return null;
  }
};

const clearPostLoginRedirect = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
};

const shouldUseRedirectFlow = () => {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent || '';
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  const isIPadDesktopMode = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return isIOSDevice || isIPadDesktopMode;
};

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<User | null>;
  signInWithEmailPassword: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [redirectReady, setRedirectReady] = useState(false);
  const postLoginHandledRef = useRef<string | null>(null);

  const syncUserProfile = async (nextUser: User) => {
    const token = await nextUser.getIdToken();
    await fetch('/api/auth/sync-profile', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const handlePostLogin = (nextUser: User) => {
    if (postLoginHandledRef.current === nextUser.uid) {
      return;
    }
    postLoginHandledRef.current = nextUser.uid;

    syncUserProfile(nextUser).catch((error) => {
      console.warn('Failed to sync user profile', error);
    });

    const redirectTarget = readPostLoginRedirect();
    if (redirectTarget) {
      const currentPath = getCurrentPath();
      clearPostLoginRedirect();
      if (currentPath !== redirectTarget) {
        window.location.replace(redirectTarget);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    getRedirectResult(firebaseAuth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          handlePostLogin(result.user);
        }
      })
      .catch((error) => {
        console.warn('Failed to read redirect result', error);
      })
      .finally(() => {
        if (isMounted) {
          setRedirectReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser) {
        handlePostLogin(nextUser);
      } else {
        postLoginHandledRef.current = null;
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const nextLoading = !(authReady && redirectReady);
    setLoading(nextLoading);
  }, [authReady, redirectReady]);

  const handleSignOut = async () => {
    await firebaseSignOut(firebaseAuth);
    postLoginHandledRef.current = null;
  };

  const handleGoogleSignIn = async (redirectTo?: string) => {
    const provider = new GoogleAuthProvider();
    rememberPostLoginRedirect(redirectTo);

    if (shouldUseRedirectFlow()) {
      await signInWithRedirect(firebaseAuth, provider);
      return null;
    }

    try {
      const credential = await signInWithPopup(firebaseAuth, provider);
      await syncUserProfile(credential.user);
      return credential.user;
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';

      if (code.includes('popup') || code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(firebaseAuth, provider);
        return null;
      }

      throw error;
    }
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
