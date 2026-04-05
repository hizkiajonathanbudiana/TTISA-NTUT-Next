'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

const formatStatusMessage = (message: string | null | undefined, fallback: string) => {
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }
  return fallback;
};

type Status = 'loading' | 'success' | 'error';

export default function CheckInPage() {
  const params = useParams<{ token: string }>();
  const rawToken = params?.token;
  const token = typeof rawToken === 'string' ? rawToken : Array.isArray(rawToken) ? rawToken[0] : '';
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Checking you in...');

  const disabled = useMemo(() => loading || !user, [loading, user]);

  useEffect(() => {
    let cancelled = false;

    const checkIn = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No check-in token provided.');
        return;
      }

      if (disabled) {
        if (!loading && !user) {
          setStatus('error');
          setMessage('You must be logged in to check in.');
        }
        return;
      }

      setStatus('loading');
      setMessage('Checking you in...');

      try {
        const idToken = await user!.getIdToken();
        const response = await fetch('/api/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(formatStatusMessage(payload?.error, 'Check-in failed.'));
        }

        if (!cancelled) {
          setStatus('success');
          setMessage(formatStatusMessage(payload?.message, 'Successfully checked in!'));
        }
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : 'Check-in failed.';
        const normalized = formatStatusMessage(rawMessage, 'Check-in failed.');
        if (!cancelled) {
          if (normalized.toLowerCase().includes('already checked in')) {
            setStatus('success');
            setMessage('You have already checked in for this event.');
          } else {
            setStatus('error');
            setMessage(normalized);
          }
        }
      }
    };

    checkIn();

    return () => {
      cancelled = true;
    };
  }, [token, disabled, loading, user]);

  const StatusVisual = () => {
    if (status === 'success') {
      return (
        <>
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
            <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-800">Check-in Complete!</h1>
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-system-danger">
            <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-800">Check-in Failed</h1>
        </>
      );
    }

    return (
      <>
        <div className="mb-6 h-24 w-24 animate-spin rounded-full border-4 border-dashed border-primary" />
        <h1 className="text-3xl font-bold text-neutral-800">Processing...</h1>
      </>
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 p-4 text-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-card">
        <StatusVisual />
        <p className="mt-4 text-neutral-500">{message}</p>
        <Link href="/events" className="mt-8 inline-block font-semibold text-primary hover:underline">
          Go to Events Page
        </Link>
      </div>
    </div>
  );
}
