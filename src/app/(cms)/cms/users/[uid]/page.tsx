'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Icon } from '@/components/Icon';
import { fetchFullProfile } from '@/lib/data/profile';
import type { CmsRole } from '@/types/content';
import { useAuth } from '@/providers/AuthProvider';

const ROLE_LABELS: Record<CmsRole, string> = {
  admin: 'Admin',
  developer: 'Developer',
  organizer: 'Organizer',
  member: 'Member',
};

const ROLE_STYLES: Record<CmsRole, string> = {
  admin: 'bg-primary/10 text-primary',
  developer: 'bg-amber-100 text-amber-800',
  organizer: 'bg-cyan-100 text-cyan-800 border border-cyan-300',
  member: 'bg-neutral-100 text-neutral-700',
};

const genderLabel = (value: string | null | undefined) => {
  if (!value) return '—';
  switch (value) {
    case 'male':
      return 'Male';
    case 'female':
      return 'Female';
    case 'rather_not_say':
      return 'Rather not say';
    default:
      return value;
  }
};

const dicebearAvatar = (seed: string) => `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(seed || 'TTISA')}`;

const formatValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && value.trim().length === 0) return '—';
  return value;
};

const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="flex flex-col border-b border-border/70 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6">
    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary sm:w-48">{label}</dt>
    <dd className="mt-1 text-base font-semibold text-text-primary sm:mt-0">{formatValue(value)}</dd>
  </div>
);

export default function CmsUserDetailPage() {
  const params = useParams<{ uid: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    email: '',
    englishName: '',
    chineseName: '',
    studentId: '',
    department: '',
    nationality: '',
    gender: 'rather_not_say',
    birthDate: '',
    studentStatus: '本國生',
    avatarUrl: '',
    role: 'member' as CmsRole,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['cms-user-detail', uid],
    enabled: Boolean(uid && user?.uid),
    queryFn: async () => fetchFullProfile(uid),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in again.');
      const token = await user.getIdToken();
      const response = await fetch(`/api/cms/users/${uid}/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to update profile.');
      }
    },
    onSuccess: async () => {
      toast.success('User profile updated.');
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['cms-user-detail', uid] });
      await queryClient.invalidateQueries({ queryKey: ['cms-collection', 'users'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.');
    },
  });

  if (!uid) {
    return <p className="text-sm text-text-secondary">No user id provided.</p>;
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-white p-8 shadow-card">
        <p className="text-sm text-text-secondary">Loading member profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-danger/40 bg-white p-8 text-danger shadow-card">
        {(error as Error).message || 'Failed to load member profile.'}
      </div>
    );
  }

  if (!data?.profile && !data?.email) {
    return (
      <div className="rounded-3xl border border-border bg-white p-8 shadow-card">
        <p className="text-sm text-text-secondary">We could not find any profile data for this member.</p>
        <Link href="/cms/users" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="h-4 w-4" />
          Back to Users
        </Link>
      </div>
    );
  }

  const profile = data.profile;
  const role: CmsRole = (data.role ?? 'member') as CmsRole;
  const email = data.email ?? '—';
  const displayName = profile?.englishName ?? email ?? 'TTISA Member';
  const avatarUrl = profile?.avatarUrl ?? dicebearAvatar(displayName);

  const details = [
    { label: 'Email Address', value: email },
    { label: 'English Name', value: profile?.englishName },
    { label: 'Chinese Name', value: profile?.chineseName },
    { label: 'Student ID', value: profile?.studentId },
    { label: 'Department', value: profile?.department },
    { label: 'Nationality', value: profile?.nationality },
    { label: 'Birth Date', value: profile?.birthDate ?? profile?.birthYear },
    { label: 'Student Status', value: profile?.studentStatus },
    { label: 'Gender', value: genderLabel(profile?.gender ?? null) },
  ];

  const startEdit = () => {
    setFormValues({
      email,
      englishName: profile?.englishName ?? '',
      chineseName: profile?.chineseName ?? '',
      studentId: profile?.studentId ?? '',
      department: profile?.department ?? '',
      nationality: profile?.nationality ?? '',
      gender: (profile?.gender ?? 'rather_not_say') as string,
      birthDate: profile?.birthDate ?? '',
      studentStatus: profile?.studentStatus ?? '本國生',
      avatarUrl: profile?.avatarUrl ?? '',
      role,
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <Link href="/cms/users" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <Icon path="M10.5 19.5L3 12l7.5-7.5" className="h-4 w-4" />
        Back to all users
      </Link>

      <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-card">
        <div className="relative border-b border-border bg-gradient-to-r from-primary via-primary/80 to-primary/60 p-8 text-white">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 opacity-30 lg:block" aria-hidden>
            <div className="h-full w-full rounded-l-full bg-white/20 blur-3xl" />
          </div>
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white/60 shadow-xl">
              <Image src={avatarUrl} alt={displayName} width={96} height={96} className="h-24 w-24 object-cover" unoptimized />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/80">TTISA Member</p>
              <h1 className="text-3xl font-black leading-tight">{displayName}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className="truncate">UID: {uid}</span>
                <span className="h-4 w-px bg-white/40" aria-hidden />
                <span className="truncate">{email}</span>
              </div>
            </div>
            <div className="lg:ml-auto">
              <span className={clsx('inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold capitalize shadow-lg shadow-black/10', ROLE_STYLES[role])}>
                {ROLE_LABELS[role]}
              </span>
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-full bg-white/20 px-4 py-1 text-xs font-semibold text-white hover:bg-white/30"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-8 p-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Personal information</h2>
            <dl className="space-y-4 rounded-3xl border border-border/60 bg-neutral-50 p-6">
              {details.map((detail) => (
                <DetailRow key={detail.label} label={detail.label} value={detail.value} />
              ))}
            </dl>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Account notes</h3>
            <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-card">
              <p className="text-sm text-text-secondary">
                This page mirrors the legacy TTISA dashboard. Update roles from the Users table; profile metadata syncs from the user profile collection.
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-text-secondary">Current role</p>
              <p className="text-2xl font-black text-text-primary">{ROLE_LABELS[role]}</p>
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-text-primary">Edit user profile</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={formValues.email} onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm" />
              <input value={formValues.englishName} onChange={(event) => setFormValues((prev) => ({ ...prev, englishName: event.target.value }))} placeholder="English Name" className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm" />
              <input value={formValues.chineseName} onChange={(event) => setFormValues((prev) => ({ ...prev, chineseName: event.target.value }))} placeholder="Chinese Name" className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm" />
              <input value={formValues.studentId} onChange={(event) => setFormValues((prev) => ({ ...prev, studentId: event.target.value }))} placeholder="Student ID" className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm" />
              <input value={formValues.department} onChange={(event) => setFormValues((prev) => ({ ...prev, department: event.target.value }))} placeholder="Department" className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm" />
              <input value={formValues.nationality} onChange={(event) => setFormValues((prev) => ({ ...prev, nationality: event.target.value }))} placeholder="Nationality" className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm" />
              <input type="date" value={formValues.birthDate} onChange={(event) => setFormValues((prev) => ({ ...prev, birthDate: event.target.value }))} className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm" />
              <select value={formValues.gender} onChange={(event) => setFormValues((prev) => ({ ...prev, gender: event.target.value }))} className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="rather_not_say">Rather not say</option>
              </select>
              <select value={formValues.studentStatus} onChange={(event) => setFormValues((prev) => ({ ...prev, studentStatus: event.target.value }))} className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm">
                <option value="本國生">本國生</option>
                <option value="僑生">僑生</option>
                <option value="陸生">陸生</option>
                <option value="外籍生">外籍生</option>
                <option value="exchange_student">Exchange Student</option>
              </select>
              <select value={formValues.role} onChange={(event) => setFormValues((prev) => ({ ...prev, role: event.target.value as CmsRole }))} className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm">
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="member">Member</option>
              </select>
              <input value={formValues.avatarUrl} onChange={(event) => setFormValues((prev) => ({ ...prev, avatarUrl: event.target.value }))} placeholder="Avatar URL" className="rounded-2xl border border-border bg-neutral-50 p-3 text-sm md:col-span-2" />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-2xl bg-neutral-200 px-4 py-2 text-sm font-semibold text-text-primary">
                Cancel
              </button>
              <button type="button" onClick={() => saveMutation.mutate()} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
