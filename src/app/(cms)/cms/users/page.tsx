'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Pagination } from '@/components/Pagination';
import { useCmsCollection } from '@/hooks/useCmsCollection';
import type { CmsDocument } from '@/lib/cms/client';
import type { CmsRole } from '@/types/content';
import { useAuth } from '@/providers/AuthProvider';

const ROLE_OPTIONS: Array<{ label: string; value: CmsRole }> = [
  { label: 'Admin', value: 'admin' },
  { label: 'Developer', value: 'developer' },
  { label: 'Organizer', value: 'organizer' },
  { label: 'Member', value: 'member' },
];

const ROLE_BADGE_STYLES: Record<CmsRole, string> = {
  admin: 'bg-primary/10 text-primary',
  developer: 'bg-amber-100 text-amber-800',
  organizer: 'bg-cyan-100 text-cyan-800',
  member: 'bg-neutral-100 text-neutral-700',
};

const PAGE_SIZE = 10;

type CmsUserRecord = CmsDocument & {
  email?: string;
  englishName?: string;
  studentId?: string;
  avatarUrl?: string;
  role?: CmsRole;
};

const avatarFor = (user: CmsUserRecord) => {
  if (user.avatarUrl) return user.avatarUrl as string;
  const seed = encodeURIComponent(user.englishName ?? user.email ?? 'TTISA');
  return `https://api.dicebear.com/8.x/initials/svg?seed=${seed}`;
};

export default function CmsUsersPage() {
  const { items, isLoading, updateItem, refetch } = useCmsCollection<CmsUserRecord>('users');
  const { user: authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | CmsRole>('all');
  const [page, setPage] = useState(1);
  const [modalUser, setModalUser] = useState<CmsUserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<CmsRole>('member');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    englishName: '',
    chineseName: '',
    studentId: '',
    role: 'member' as CmsRole,
  });

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesRole = roleFilter === 'all' ? true : item.role === roleFilter;
      const matchesSearch = term
        ? [item.englishName, item.email, item.studentId]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        : true;
      return matchesRole && matchesSearch;
    });
  }, [items, roleFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  const handleOpenModal = (user: CmsUserRecord) => {
    setModalUser(user);
    setSelectedRole((user.role ?? 'member') as CmsRole);
  };

  const handleSaveRole = async () => {
    if (!modalUser) return;
    try {
      await updateItem(modalUser.id, { role: selectedRole });
      toast.success('Role updated successfully.');
      setModalUser(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleCreateUser = async () => {
    if (!authUser) return;
    const token = await authUser.getIdToken();

    try {
      const response = await fetch('/api/cms/users/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to create user.');
      }

      toast.success('User created successfully.');
      setShowCreateModal(false);
      setCreateForm({
        email: '',
        password: '',
        englishName: '',
        chineseName: '',
        studentId: '',
        role: 'member',
      });
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">CMS</p>
          <h1 className="text-3xl font-black text-text-primary">Manage Users</h1>
          <p className="text-text-secondary">Search, filter, and update access for every TTISA member account.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-primary/40"
        >
          + Create user
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by name, email, or student ID…"
          className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary shadow-card"
        />
        <select
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value as 'all' | CmsRole);
            setPage(1);
          }}
          className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary shadow-card"
        >
          <option value="all">All roles</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container overflow-x-auto rounded-3xl border border-border bg-white shadow-card">
        <table className="min-w-[760px] divide-y divide-border text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            <tr>
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Student ID</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                  Loading users…
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                  No users match the current filters.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={avatarFor(user)}
                        alt={user.englishName ?? 'Member avatar'}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-text-primary">{user.englishName ?? 'Unnamed member'}</div>
                        <div className="text-xs text-text-secondary">UID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{user.studentId ?? '—'}</td>
                  <td className="px-6 py-4 text-text-secondary">{user.email ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold capitalize', ROLE_BADGE_STYLES[(user.role ?? 'member') as CmsRole])}>
                      {user.role ?? 'member'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/cms/users/${user.id}`}
                        className="rounded-full border border-border px-4 py-1 text-xs font-semibold text-text-secondary hover:border-primary hover:text-primary"
                      >
                        View profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(user)}
                        className="rounded-full bg-neutral-100 px-4 py-1 text-xs font-semibold text-text-primary hover:bg-neutral-200"
                      >
                        Edit role
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />

      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-text-primary">Edit role</h2>
            <p className="mt-1 text-sm text-text-secondary">{modalUser.email}</p>
            <div className="mt-4">
              <label className="text-sm font-semibold text-text-secondary">Role</label>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as CmsRole)}
                className="mt-2 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-sm font-semibold"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModalUser(null)} className="rounded-2xl bg-neutral-200 px-4 py-2 text-sm font-semibold text-text-primary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveRole()}
                className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-text-primary">Create user</h2>
            <p className="mt-1 text-sm text-text-secondary">Create Firebase Auth account and profile in one step.</p>
            <div className="mt-4 grid gap-3">
              <input
                placeholder="Email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-sm"
              />
              <input
                placeholder="Password (optional, min 6 chars)"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-sm"
              />
              <input
                placeholder="English Name"
                value={createForm.englishName}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, englishName: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-sm"
              />
              <input
                placeholder="Chinese Name (optional)"
                value={createForm.chineseName}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, chineseName: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-sm"
              />
              <input
                placeholder="Student ID (optional)"
                value={createForm.studentId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, studentId: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-sm"
              />
              <select
                value={createForm.role}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value as CmsRole }))}
                className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-sm font-semibold"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-2xl bg-neutral-200 px-4 py-2 text-sm font-semibold text-text-primary">
                Cancel
              </button>
              <button type="button" onClick={() => void handleCreateUser()} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

