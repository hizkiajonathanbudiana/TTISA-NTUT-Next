'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useCmsCollection } from '@/hooks/useCmsCollection';
import type { CmsRole } from '@/types/content';

const ROLE_OPTIONS: Array<{ label: string; value: CmsRole | 'all' }> = [
  { label: 'All roles', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'Developer', value: 'developer' },
  { label: 'Organizer', value: 'organizer' },
  { label: 'Member', value: 'member' },
];

const ROLE_BADGE: Record<CmsRole, string> = {
  admin: 'bg-primary/10 text-primary',
  developer: 'bg-amber-100 text-amber-800',
  organizer: 'bg-cyan-100 text-cyan-800',
  member: 'bg-neutral-100 text-neutral-700',
};

type CmsUserRecord = {
  id: string;
  email?: string;
  englishName?: string;
  role?: CmsRole;
};

const normalize = (value: string | undefined | null) => (value ?? '').trim().toLowerCase();

export default function CmsEmailsPage() {
  const { user } = useAuth();
  const { items, isLoading } = useCmsCollection<CmsUserRecord>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<CmsRole | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const filteredUsers = useMemo(() => {
    const term = normalize(searchTerm);
    return items.filter((item) => {
      const matchesRole = roleFilter === 'all' ? true : item.role === roleFilter;
      if (!term) return matchesRole;
      const haystack = [item.englishName, item.email].map(normalize).join(' ');
      return matchesRole && haystack.includes(term);
    });
  }, [items, roleFilter, searchTerm]);

  const selectedUsers = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  const selectedEmails = useMemo(() => {
    const emails = selectedUsers
      .map((item) => (item.email ?? '').trim())
      .filter((email) => email.length > 0);
    return Array.from(new Set(emails));
  }, [selectedUsers]);

  const missingEmailCount = selectedUsers.filter((item) => !item.email).length;

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const selectableIds = filteredUsers.filter((item) => item.email).map((item) => item.id);
      const allSelected = selectableIds.every((id) => next.has(id));

      if (allSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const handleSend = async () => {
    if (!user) {
      toast.error('Please sign in again.');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required.');
      return;
    }

    if (selectedEmails.length === 0) {
      toast.error('Select at least one recipient with an email.');
      return;
    }

    setIsSending(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/cms/emails/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          recipients: selectedEmails,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to send email.');
      }

      const sent = typeof payload.sent === 'number' ? payload.sent : selectedEmails.length;
      const failed = typeof payload.failed === 'number' ? payload.failed : 0;
      toast.success(`Email sent to ${sent} recipient${sent === 1 ? '' : 's'}${failed ? `, ${failed} failed.` : '.'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">CMS</p>
        <h1 className="text-3xl font-black text-text-primary">Email Sender</h1>
        <p className="text-text-secondary">Compose and send announcements using Resend.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-card">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-text-secondary">Subject</label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Write the email subject"
                className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-inner"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-secondary">Message</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                placeholder="Write your email content"
                className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-inner"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
              <span>{selectedEmails.length} recipient{selectedEmails.length === 1 ? '' : 's'} selected</span>
              {missingEmailCount > 0 && (
                <span className="text-amber-600">{missingEmailCount} selected without email</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSending}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-card">
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-semibold text-text-secondary">Search recipients</label>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name or email"
                className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-secondary">Filter role</label>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as CmsRole | 'all')}
                className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary"
              >
                Toggle filtered
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary"
              >
                Clear
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-border">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-text-secondary">Loading users…</div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-text-secondary">No users match.</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredUsers.map((item) => {
                    const hasEmail = Boolean(item.email);
                    const checked = selectedIds.has(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${hasEmail ? 'hover:bg-neutral-50' : 'opacity-60'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!hasEmail}
                          onChange={() => toggleUser(item.id)}
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-text-primary">
                              {item.englishName ?? item.email ?? `Member-${item.id.slice(0, 6)}`}
                            </p>
                            {item.role && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[item.role]}`}>
                                {item.role}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary">
                            {item.email ?? 'No email available'}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
