"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useAuth } from "@/providers/AuthProvider";
import { getAuthErrorMessage } from "@/lib/firebase/errorMessages";

export default function LoginPage() {
  const router = useRouter();
  const redirectRef = useRef("/");
  const { user, loading, signInWithGoogle } = useAuth();
  const attemptedRef = useRef(false);
  const isIOS = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent || "";
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isIPadDesktopMode = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
    return isIOSDevice || isIPadDesktopMode;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const redirect = new URLSearchParams(window.location.search).get("redirect");
    if (redirect) {
      redirectRef.current = redirect;
    }
  }, []);

  useEffect(() => {
    if (loading || user || attemptedRef.current || isIOS) {
      return;
    }

    attemptedRef.current = true;
    signInWithGoogle(redirectRef.current)
      .then((signedInUser) => {
        if (signedInUser) {
          router.replace(redirectRef.current);
        }
      })
      .catch((error: unknown) => {
        toast.error(getAuthErrorMessage(error));
      });
  }, [loading, router, signInWithGoogle, user]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <span>Preparing sign in...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Authentication is available through Google only.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            signInWithGoogle(redirectRef.current)
              .then((signedInUser) => {
                if (signedInUser) {
                  router.replace(redirectRef.current);
                }
              })
              .catch((error: unknown) => {
                toast.error(getAuthErrorMessage(error));
              })
          }
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Continue with Google
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Back
          </Link>
        </p>
      </div>
    </div>
  );
}
