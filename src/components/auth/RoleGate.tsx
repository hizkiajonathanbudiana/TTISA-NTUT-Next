'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '@/lib/data/publicContent';
import type { CmsRole } from '@/types/content';

interface RoleGateProps {
  allowedRoles: CmsRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGate = ({ allowedRoles, children, fallback }: RoleGateProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const {
    data: profile,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ['user-profile', user?.uid],
    queryFn: () => fetchUserProfile(user!.uid),
    enabled: Boolean(user?.uid),
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && profile && !allowedRoles.includes(profile.role)) {
      router.replace('/');
    }
  }, [loading, user, profile, allowedRoles, router]);

  if (loading || profileLoading) {
    return <div className="flex min-h-[300px] items-center justify-center text-sm text-text-secondary">Loading access…</div>;
  }

  if (!user) {
    return fallback ?? null;
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return fallback ?? <div className="p-6 text-sm text-danger">You do not have permission to view this area.</div>;
  }

  return <>{children}</>;
};
