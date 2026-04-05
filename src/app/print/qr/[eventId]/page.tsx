'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { RoleGate } from '@/components/auth/RoleGate';
import { useQuery } from '@tanstack/react-query';
import { authorizedCmsFetch } from '@/lib/cms/client';
import type { CmsEventToken } from '@/types/content';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import { QRCodeSVG } from 'qrcode.react';

interface TokenResponse {
  token: CmsEventToken | null;
}

function PrintQrContent() {
  const params = useParams<{ eventId: string }>();
  const eventId = typeof params?.eventId === 'string' ? params.eventId : Array.isArray(params?.eventId) ? params?.eventId[0] : null;
  const { user } = useAuth();
  const eventQuery = useQuery({
    queryKey: ['print-event', eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const snapshot = await getDoc(doc(firebaseDb, 'cms_events', eventId!));
      if (!snapshot.exists()) {
        throw new Error('Event not found');
      }
      const data = snapshot.data() ?? {};
      return { title: (data.title ?? data.title_en ?? 'Event') as string };
    },
  });

  const tokenQuery = useQuery({
    queryKey: ['print-token', eventId, user?.uid],
    enabled: Boolean(eventId && user),
    queryFn: () => authorizedCmsFetch<TokenResponse>(user ?? null, `/api/cms/events/${eventId}/token`),
    refetchInterval: 60_000,
  });

  const tokenValue = tokenQuery.data?.token?.token ?? null;
  const expiresAt = tokenQuery.data?.token?.expiresAt ?? null;

  const checkInUrl = useMemo(() => {
    if (!tokenValue) {
      return '';
    }
    if (typeof window === 'undefined') {
      return `/checkin/${tokenValue}`;
    }
    return `${window.location.origin}/checkin/${tokenValue}`;
  }, [tokenValue]);

  if (!eventId) {
    return <div className="p-12 text-center text-system-danger">Missing event identifier.</div>;
  }

  if (tokenQuery.isLoading || eventQuery.isLoading) {
    return <div className="p-12 text-center text-neutral-500">Loading QR Code...</div>;
  }

  const tokenError = tokenQuery.error;
  const eventError = eventQuery.error;
  if (tokenError instanceof Error) {
    return <div className="p-12 text-center text-system-danger">Error: {tokenError.message}</div>;
  }
  if (eventError instanceof Error) {
    return <div className="p-12 text-center text-system-danger">Error: {eventError.message}</div>;
  }

  if (!tokenValue) {
    return (
      <div className="p-12 text-center">
        <h1 className="mb-4 text-2xl font-bold">No Active Token Found</h1>
        <p>Either the event does not exist or there is no active, unexpired check-in token.</p>
        <Link href={`/cms/events/${eventId}/registrations`} className="mt-4 inline-block text-primary hover:underline">
          &larr; Go back to generate one
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-8 text-center">
      <div className="print:w-full">
        <h1 className="break-words text-4xl font-bold text-neutral-800 md:text-6xl">{eventQuery.data?.title ?? 'Event'}</h1>
        <p className="mt-4 mb-8 text-2xl text-neutral-500 md:text-3xl">Scan to Check In</p>
        <div className="inline-block border-4 border-neutral-800 bg-white p-6">
          <QRCodeSVG value={checkInUrl} size={256} className="h-64 w-64 md:h-96 md:w-96" />
        </div>
        <p className="mt-8 font-mono text-5xl tracking-widest text-neutral-800 md:text-7xl">{tokenValue}</p>
        {expiresAt ? (
          <p className="mt-4 text-sm text-neutral-500">Expires {new Date(expiresAt).toLocaleString()}</p>
        ) : null}
      </div>
      <div className="print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-8 rounded-md bg-primary px-6 py-3 font-semibold text-white shadow-lg hover:bg-primary-hover"
        >
          Print
        </button>
        <Link href={`/cms/events/${eventId}/registrations`} className="ml-4 inline-block text-neutral-500 hover:underline">
          Cancel
        </Link>
      </div>
    </div>
  );
}

export default function PrintQrPage() {
  return (
    <RoleGate allowedRoles={['admin', 'developer', 'organizer']}>
      <PrintQrContent />
    </RoleGate>
  );
}
