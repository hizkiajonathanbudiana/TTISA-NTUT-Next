'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { authorizedCmsFetch } from '@/lib/cms/client';
import { useAuth } from '@/providers/AuthProvider';
import type { CmsEventRegistrationStatus } from '@/types/content';

interface SyncPrivilegedResponse {
  success: true;
  created: number;
}

interface SearchUserRecord {
  id: string;
  email: string | null;
  englishName: string | null;
  role: string;
  studentId: string | null;
}

interface SearchUsersResponse {
  users: SearchUserRecord[];
}

interface AddUserRegistrationPayload {
  userId?: string;
  role: string;
  email?: string;
  englishName?: string;
  chineseName?: string;
  studentId?: string;
  department?: string;
  nationality?: string;
  birthday?: string;
  gender?: string;
  studentStatus?: string;
}

interface AddUserRegistrationResponse {
  success: true;
  created: boolean;
  registrationId: string;
}

interface RegistrationRecord {
  id: string;
  userId: string;
  role: string | null;
  englishName: string | null;
  chineseName: string | null;
  studentId: string | null;
  department: string | null;
  nationality: string | null;
  birthday: string | null;
  gender: string | null;
  studentStatus: string | null;
  paymentMethod: string | null;
  eventSlug: string | null;
  eventTitle: string | null;
  email: string | null;
  paymentProofUrl: string | null;
  status: CmsEventRegistrationStatus;
  createdAt: string | null;
  updatedAt: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
}

interface RegistrationsResponse {
  event: { id: string; title: string; slug?: string | null; startDate?: string | null };
  registrations: RegistrationRecord[];
}

interface ReviewsResponse {
  reviews: Array<{
    id: string;
    englishName: string | null;
    avatarUrl: string | null;
    rating: number;
    comment: string | null;
    createdAt: string | null;
  }>;
}

interface TokenResponse {
  token: { id: string; eventId: string; token: string; expiresAt: string | null } | null;
}

const statusLabels: Record<CmsEventRegistrationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const statusStyles: Record<CmsEventRegistrationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const normalizedRole = (value: string | null) => (value ?? 'member').toLowerCase();

const getCheckInUrl = (token: string | null) => {
  if (!token) {
    return '';
  }
  if (typeof window === 'undefined') {
    return `/checkin/${token}`;
  }
  return `${window.location.origin}/checkin/${token}`;
};

export default function CmsEventRegistrationsPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const eventId = params?.eventId;
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | CmsEventRegistrationStatus>('all');
  const [showAddUserPanel, setShowAddUserPanel] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('member');
  const [newEmail, setNewEmail] = useState('');
  const [newEnglishName, setNewEnglishName] = useState('');
  const [newChineseName, setNewChineseName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newNationality, setNewNationality] = useState('');
  const [newBirthday, setNewBirthday] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newStudentStatus, setNewStudentStatus] = useState('');

  const registrationsKey = ['cms-event-registrations', eventId, statusFilter];
  const reviewsKey = ['cms-event-reviews', eventId];
  const tokenKey = ['cms-event-token', eventId];
  const searchUsersKey = ['cms-event-registration-users-search', eventId, userSearch];

  const registrationsQuery = useQuery({
    queryKey: registrationsKey,
    enabled: Boolean(user && eventId),
    queryFn: async () => {
      const search = new URLSearchParams({ status: statusFilter });
      return authorizedCmsFetch<RegistrationsResponse>(user, `/api/cms/events/${eventId}/registrations?${search.toString()}`);
    },
  });

  const reviewsQuery = useQuery({
    queryKey: reviewsKey,
    enabled: Boolean(user && eventId),
    queryFn: () => authorizedCmsFetch<ReviewsResponse>(user, `/api/cms/events/${eventId}/reviews`),
  });

  const tokenQuery = useQuery({
    queryKey: tokenKey,
    enabled: Boolean(user && eventId),
    queryFn: () => authorizedCmsFetch<TokenResponse>(user, `/api/cms/events/${eventId}/token`),
    refetchInterval: 60_000,
  });

  const searchUsersQuery = useQuery({
    queryKey: searchUsersKey,
    enabled: Boolean(user && eventId && showAddUserPanel),
    queryFn: () =>
      authorizedCmsFetch<SearchUsersResponse>(
        user,
        `/api/cms/events/${eventId}/registrations/add-user?q=${encodeURIComponent(userSearch)}`,
      ),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ registrationId, status }: { registrationId: string; status: CmsEventRegistrationStatus }) =>
      authorizedCmsFetch<{ registration: RegistrationRecord }>(user, `/api/cms/events/${eventId}/registrations/${registrationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success('Registration status updated');
      queryClient.invalidateQueries({ queryKey: registrationsKey });
      queryClient.invalidateQueries({ queryKey: ['cms-dashboard-overview'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update registration');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) =>
      authorizedCmsFetch<{ success: true }>(user, `/api/cms/events/${eventId}/reviews/${reviewId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Review deleted');
      queryClient.invalidateQueries({ queryKey: reviewsKey });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete review'),
  });

  const generateTokenMutation = useMutation({
    mutationFn: () =>
      authorizedCmsFetch<TokenResponse>(user, `/api/cms/events/${eventId}/token`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('New check-in token generated');
      queryClient.invalidateQueries({ queryKey: tokenKey });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to generate token'),
  });

  const activeToken = tokenQuery.data?.token;
  const checkInUrl = getCheckInUrl(activeToken?.token ?? null);
  const isLoading = registrationsQuery.isLoading || tokenQuery.isLoading || reviewsQuery.isLoading;

  const manualCheckInMutation = useMutation({
    mutationFn: async (registrationId: string) =>
      authorizedCmsFetch<{ success: true }>(
        user,
        `/api/cms/events/${eventId}/registrations/${registrationId}/checkin`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      toast.success('Participant checked in');
      queryClient.invalidateQueries({ queryKey: registrationsKey });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to check in participant');
    },
  });

  const cancelCheckInMutation = useMutation({
    mutationFn: async (registrationId: string) =>
      authorizedCmsFetch<{ success: true }>(
        user,
        `/api/cms/events/${eventId}/registrations/${registrationId}/checkin`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      toast.success('Check-in canceled');
      queryClient.invalidateQueries({ queryKey: registrationsKey });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel check-in');
    },
  });

  const syncPrivilegedMutation = useMutation({
    mutationFn: () =>
      authorizedCmsFetch<SyncPrivilegedResponse>(user, `/api/cms/events/${eventId}/registrations/sync`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(`Added ${data.created} privileged registrations`);
      } else {
        toast.success('All organizer/admin/developer users are already registered');
      }
      queryClient.invalidateQueries({ queryKey: registrationsKey });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to sync privileged roles');
    },
  });

  const addUserRegistrationMutation = useMutation({
    mutationFn: (payload: AddUserRegistrationPayload) =>
      authorizedCmsFetch<AddUserRegistrationResponse>(user, `/api/cms/events/${eventId}/registrations/add-user`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      toast.success(data.created ? 'User added to registration' : 'User already registered for this event');
      queryClient.invalidateQueries({ queryKey: registrationsKey });
      setSelectedUserId(null);
      setNewEmail('');
      setNewEnglishName('');
      setNewChineseName('');
      setNewStudentId('');
      setNewDepartment('');
      setNewNationality('');
      setNewBirthday('');
      setNewGender('');
      setNewStudentStatus('');
      setNewRole('member');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add user to registration');
    },
  });

  const registrants = registrationsQuery.data?.registrations ?? [];
  const eventTitle = registrationsQuery.data?.event.title ?? 'Event';

  const accepted = registrants.filter((item) => item.status === 'accepted');
  const privilegedRoles = new Set(['admin', 'developer', 'organizer']);
  const acceptedPrivileged = accepted.filter((item) => privilegedRoles.has(normalizedRole(item.role)));
  const acceptedParticipants = accepted.filter((item) => !privilegedRoles.has(normalizedRole(item.role)));

  const toSheetRows = (records: RegistrationRecord[]) =>
    records.map((item) => ({
      'Event Title': item.eventTitle ?? eventTitle,
      'Event Slug': item.eventSlug ?? registrationsQuery.data?.event.slug ?? '',
      'Event Date': formatDate(registrationsQuery.data?.event.startDate ?? null),
      Role: item.role ?? 'member',
      Status: item.status,
      Checkin: item.checkedIn ? 'V' : 'X',
      'Checkin At': formatDate(item.checkedInAt),
      'Personal information': 'Included',
      'Email Address': item.email ?? '',
      'English Name': item.englishName ?? '',
      'Chinese Name': item.chineseName ?? '',
      'Student ID': item.studentId ?? '',
      Department: item.department ?? '',
      Nationality: item.nationality ?? '',
      'Birth Date': item.birthday ?? '',
      'Student Status': item.studentStatus ?? '',
      Gender: item.gender ?? '',
      'Payment Method': item.paymentMethod ?? '',
      'Payment Proof URL': item.paymentProofUrl ?? '',
      'Registered At': formatDate(item.createdAt),
      'Updated At': formatDate(item.updatedAt),
    }));

  const summaryRows = [
    {
      eventTitle,
      eventDate: formatDate(registrationsQuery.data?.event.startDate ?? null),
      totalRegistrants: registrants.length,
      acceptedOnly: accepted.length,
      acceptedPrivileged: acceptedPrivileged.length,
      acceptedParticipants: acceptedParticipants.length,
      exportedAt: new Date().toISOString(),
    },
  ];

  const handleExportExcel = () => {
    if (!registrants.length) {
      toast.error('No registrations to export.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(acceptedPrivileged)), 'Accepted Privileged');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(acceptedParticipants)), 'Accepted Participants');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(registrants)), 'All Registrations');

    const slug = (registrationsQuery.data?.event.slug ?? 'event').replace(/[^a-zA-Z0-9-]/g, '-');
    XLSX.writeFile(workbook, `${slug}-registrations.xlsx`);
  };

  const handleAddSelectedUser = () => {
    if (!selectedUserId) {
      toast.error('Pick a user from search results first.');
      return;
    }
    addUserRegistrationMutation.mutate({
      userId: selectedUserId,
      role: newRole,
    });
  };

  const handleCreateAndAddUser = () => {
    if (!newEnglishName.trim() && !newEmail.trim()) {
      toast.error('Please provide at least English Name or Email.');
      return;
    }
    addUserRegistrationMutation.mutate({
      role: newRole,
      email: newEmail,
      englishName: newEnglishName,
      chineseName: newChineseName,
      studentId: newStudentId,
      department: newDepartment,
      nationality: newNationality,
      birthday: newBirthday,
      gender: newGender,
      studentStatus: newStudentStatus,
    });
  };

  const renderProofCell = (url: string | null) => {
    if (!url) {
      return <span className="text-xs text-text-secondary">N/A</span>;
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
        View Proof
      </a>
    );
  };

  const renderActions = (registration: RegistrationRecord) => {
    if (registration.status === 'pending') {
      return (
        <div className="flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            className="rounded-full bg-secondary px-4 py-1 text-xs font-semibold text-white"
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ registrationId: registration.id, status: 'accepted' })}
          >
            Accept
          </button>
          <button
            type="button"
            className="rounded-full bg-system-danger px-4 py-1 text-xs font-semibold text-white"
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ registrationId: registration.id, status: 'rejected' })}
          >
            Reject
          </button>
        </div>
      );
    }

    if (registration.status === 'accepted' && !registration.checkedIn) {
      return (
        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            className="rounded-full bg-cyan-600 px-4 py-1 text-xs font-semibold text-white"
            disabled={manualCheckInMutation.isPending}
            onClick={() => manualCheckInMutation.mutate(registration.id)}
          >
            Check in
          </button>
          <button
            type="button"
            className="rounded-full bg-neutral-800 px-4 py-1 text-xs font-semibold text-white"
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ registrationId: registration.id, status: 'pending' })}
          >
            Move to Pending
          </button>
        </div>
      );
    }

    if (registration.status === 'accepted' && registration.checkedIn) {
      return (
        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            className="rounded-full bg-amber-600 px-4 py-1 text-xs font-semibold text-white"
            disabled={cancelCheckInMutation.isPending}
            onClick={() => cancelCheckInMutation.mutate(registration.id)}
          >
            Cancel check-in
          </button>
          <button
            type="button"
            className="rounded-full bg-neutral-800 px-4 py-1 text-xs font-semibold text-white"
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ registrationId: registration.id, status: 'pending' })}
          >
            Move to Pending
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        className="rounded-full bg-neutral-800 px-4 py-1 text-xs font-semibold text-white"
        disabled={updateStatusMutation.isPending}
        onClick={() => updateStatusMutation.mutate({ registrationId: registration.id, status: 'pending' })}
      >
        Move to Pending
      </button>
    );
  };

  if (!eventId) {
    return (
      <div className="rounded-3xl border border-border bg-white p-8 text-sm text-system-danger">
        Missing event identifier in the route.
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="grid place-items-center rounded-3xl border border-border bg-white p-12 text-sm text-text-secondary">
        Checking authentication…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <button type="button" className="w-fit text-sm font-semibold text-primary" onClick={() => router.push('/cms/events')}>
          ← Back to events
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">Registrations</p>
          <h1 className="text-3xl font-black text-text-primary">Manage “{eventTitle}”</h1>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Event Check-in</h2>
            <p className="text-sm text-text-secondary">Generate a 24-hour code and printable QR to manage onsite attendance.</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
            onClick={() => generateTokenMutation.mutate()}
            disabled={generateTokenMutation.isPending}
          >
            {generateTokenMutation.isPending ? 'Generating…' : 'Generate token'}
          </button>
        </div>
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 rounded-3xl border border-dashed border-border p-6 text-center">
            {tokenQuery.isLoading ? (
              <p className="text-sm text-text-secondary">Loading latest token…</p>
            ) : activeToken ? (
              <div className="flex flex-col items-center gap-4">
                <QRCodeSVG value={checkInUrl} size={160} />
                <div>
                  <p className="text-sm font-semibold text-text-secondary">Active code</p>
                  <p className="text-3xl font-black tracking-[0.3em] text-text-primary">{activeToken.token}</p>
                </div>
                <div className="text-xs text-text-secondary">Expires {formatDate(activeToken.expiresAt)}</div>
                <a
                  href={`/print/qr/${eventId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Print QR code ↗
                </a>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No active token. Generate one to enable check-in.</p>
            )}
          </div>
          <div className="flex-1 rounded-3xl bg-neutral-50 p-6">
            <p className="text-sm font-semibold text-text-secondary">How it works</p>
            <ul className="mt-4 space-y-3 text-sm text-text-secondary">
              <li>• Each token is valid for 24 hours and instantly replaces the previous one.</li>
              <li>• Volunteers can scan the QR or enter the code at /checkin to approve attendees.</li>
              <li>• Regenerate anytime if the code is compromised.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Registrants ({registrants.length})</h2>
            <p className="text-sm text-text-secondary">Track payment proofs, sync organizer/admin/developer, and update statuses in real time.</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <button
              type="button"
              className="rounded-2xl bg-neutral-800 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setShowAddUserPanel((prev) => !prev)}
            >
              {showAddUserPanel ? 'Close Add User' : 'Add User'}
            </button>
            <button
              type="button"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => syncPrivilegedMutation.mutate()}
              disabled={syncPrivilegedMutation.isPending}
            >
              {syncPrivilegedMutation.isPending ? 'Syncing…' : 'Sync Privileged Roles'}
            </button>
            <button
              type="button"
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              onClick={handleExportExcel}
            >
              Export Excel
            </button>
            <select
              className="rounded-2xl border border-border bg-white px-4 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | CmsEventRegistrationStatus)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        {showAddUserPanel ? (
          <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-text-primary">Search Existing User</h3>
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by name, email, student ID"
                  className="w-full rounded-2xl border border-border px-3 py-2 text-sm"
                />
                <div className="max-h-52 overflow-y-auto rounded-2xl border border-border">
                  {(searchUsersQuery.data?.users ?? []).length === 0 ? (
                    <div className="px-3 py-2 text-xs text-text-secondary">No users found.</div>
                  ) : (
                    (searchUsersQuery.data?.users ?? []).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={clsx(
                          'flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-neutral-50',
                          selectedUserId === item.id ? 'bg-cyan-50' : '',
                        )}
                        onClick={() => {
                          setSelectedUserId(item.id);
                          setNewRole(item.role ?? 'member');
                        }}
                      >
                        <span className="font-semibold text-text-primary">{item.englishName ?? 'Unnamed user'}</span>
                        <span className="text-xs text-text-secondary">{item.email ?? 'No email'} • {item.role}</span>
                      </button>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
                  disabled={addUserRegistrationMutation.isPending}
                  onClick={handleAddSelectedUser}
                >
                  Add Selected User to Event
                </button>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-text-primary">Create User + Add to Event</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  <input value={newEnglishName} onChange={(event) => setNewEnglishName(event.target.value)} placeholder="English Name" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <input value={newChineseName} onChange={(event) => setNewChineseName(event.target.value)} placeholder="Chinese Name" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="Email (optional)" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <input value={newStudentId} onChange={(event) => setNewStudentId(event.target.value)} placeholder="Student ID" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <input value={newDepartment} onChange={(event) => setNewDepartment(event.target.value)} placeholder="Department" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <input value={newNationality} onChange={(event) => setNewNationality(event.target.value)} placeholder="Nationality" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <input value={newBirthday} onChange={(event) => setNewBirthday(event.target.value)} placeholder="Birth Date" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <input value={newGender} onChange={(event) => setNewGender(event.target.value)} placeholder="Gender" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <input value={newStudentStatus} onChange={(event) => setNewStudentStatus(event.target.value)} placeholder="Student Status" className="rounded-2xl border border-border px-3 py-2 text-sm" />
                  <select value={newRole} onChange={(event) => setNewRole(event.target.value)} className="rounded-2xl border border-border px-3 py-2 text-sm">
                    <option value="member">member</option>
                    <option value="organizer">organizer</option>
                    <option value="admin">admin</option>
                    <option value="developer">developer</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  disabled={addUserRegistrationMutation.isPending}
                  onClick={handleCreateAndAddUser}
                >
                  Create User & Add to Event
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="table-container overflow-x-auto rounded-3xl border border-border bg-white shadow-card">
          <table className="min-w-[980px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              <tr>
                <th className="px-6 py-4">Registrant</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Payment Proof</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Check-in</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                    Loading registrations…
                  </td>
                </tr>
              ) : registrants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                    No registrations match this filter.
                  </td>
                </tr>
              ) : (
                registrants.map((registration) => (
                  <tr key={registration.id}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {registration.userId && !registration.userId.startsWith('adhoc:') ? (
                          <Link href={`/cms/users/${registration.userId}`} className="font-semibold text-primary">
                            {registration.englishName ?? 'Unknown member'}
                          </Link>
                        ) : (
                          <span className="font-semibold text-text-primary">{registration.englishName ?? 'Unknown member'}</span>
                        )}
                        <span className="text-xs text-text-secondary">{registration.email ?? '—'}</span>
                        <span className="text-xs text-text-secondary">ID: {registration.studentId ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary capitalize">{registration.role ?? 'member'}</td>
                    <td className="px-6 py-4 text-text-secondary">{registration.department ?? '—'}</td>
                    <td className="px-6 py-4">{renderProofCell(registration.paymentProofUrl)}</td>
                    <td className="px-6 py-4">
                      <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', statusStyles[registration.status])}>
                        {statusLabels[registration.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', registration.checkedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                        {registration.checkedIn ? 'V' : 'X'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">{renderActions(registration)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-text-primary">Event Reviews ({reviewsQuery.data?.reviews.length ?? 0})</h2>
          <p className="text-sm text-text-secondary">Monitor and moderate public feedback after each event.</p>
        </div>
        <div className="table-container overflow-x-auto rounded-3xl border border-border bg-white shadow-card">
          <table className="min-w-[760px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              <tr>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Comment</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reviewsQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-text-secondary">
                    Loading reviews…
                  </td>
                </tr>
              ) : !reviewsQuery.data || reviewsQuery.data.reviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-text-secondary">
                    No reviews captured for this event yet.
                  </td>
                </tr>
              ) : (
                reviewsQuery.data.reviews.map((review) => {
                  const ratingValue = Math.max(0, Math.min(5, Math.round(Number(review.rating ?? 0))));
                  return (
                    <tr key={review.id}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-text-primary">{review.englishName ?? 'Anonymous'}</div>
                        <div className="text-xs text-text-secondary">{formatDate(review.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg text-amber-500">{'★'.repeat(ratingValue)}</span>
                        <span className="text-lg text-neutral-300">{'☆'.repeat(5 - ratingValue)}</span>
                      </td>
                    <td className="px-6 py-4 text-text-secondary">{review.comment ?? <span className="italic text-text-secondary">No comment</span>}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="rounded-full bg-system-danger/10 px-4 py-1 text-xs font-semibold text-system-danger"
                        disabled={deleteReviewMutation.isPending}
                        onClick={() => {
                          if (window.confirm('Delete this review?')) {
                            deleteReviewMutation.mutate(review.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
