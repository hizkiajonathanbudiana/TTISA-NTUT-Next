"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useAuth } from "@/providers/AuthProvider";
import { getAuthErrorMessage } from "@/lib/firebase/errorMessages";

export default function AdminLoginPage() {
  const router = useRouter();
  const redirectRef = useRef("/cms");
  const { user, loading, signInWithGoogle, signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!loading && user) {
      router.replace(redirectRef.current);
    }
  }, [loading, router, user]);

  const handleGoogle = async () => {
    try {
      setSubmitting(true);
      await signInWithGoogle();
      router.replace(redirectRef.current);
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password are required.");
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmailPassword(email.trim(), password);
      router.replace(redirectRef.current);
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Admin Login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with Google or with email and password.
        </p>
      </div>

      <form onSubmit={handleEmailPassword} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm"
        />
        <button
          type="submit"
          disabled={loading || submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          Continue with Email
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={loading || submitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
      >
        Continue with Google
      </button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Back
        </Link>
      </p>
    </div>
  );
}
