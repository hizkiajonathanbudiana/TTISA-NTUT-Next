'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useCmsCollection } from '@/hooks/useCmsCollection';
import type { CmsDocument } from '@/lib/cms/client';
import { uploadCmsAsset } from '@/lib/firebase/storage';

const MemberFormSchema = z.object({
  englishName: z.string().min(2, 'English name is required'),
  positionEn: z.string().optional().nullable(),
  positionZhHant: z.string().optional().nullable(),
  avatarUrl: z
    .union([z.string().url('Provide a valid URL'), z.literal(''), z.null(), z.undefined()])
    .transform((value) => {
      if (!value || typeof value !== 'string') {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }),
  displayOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
});

type MemberFormInput = z.input<typeof MemberFormSchema>;
type MemberFormValues = z.output<typeof MemberFormSchema>;

type CmsTeamRecord = CmsDocument & {
  name?: string | null;
  nameZhHant?: string | null;
};

type CmsTeamMemberRecord = CmsDocument & MemberFormValues & { teamId?: string | null };

const statusStyles: Record<'active' | 'archived', string> = {
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-neutral-200 text-neutral-700',
};

interface MemberModalProps {
  open: boolean;
  title: string;
  defaultValues?: Partial<MemberFormValues>;
  onClose: () => void;
  onSubmit: (values: MemberFormValues) => Promise<void>;
}

const MemberModal = ({ open, title, defaultValues, onClose, onSubmit }: MemberModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormInput, unknown, MemberFormValues>({
    resolver: zodResolver(MemberFormSchema),
    defaultValues: {
      displayOrder: 0,
      isActive: true,
      ...defaultValues,
    },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="text-2xl text-text-secondary" aria-label="Close">
            ×
          </button>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(async (values) => {
            let avatarUrl = values.avatarUrl || null;
            if (selectedFile) {
              const toastId = toast.loading('Uploading portrait…');
              try {
                avatarUrl = await uploadCmsAsset(selectedFile, { folder: 'cms/team-members' });
                toast.success('Portrait uploaded', { id: toastId });
              } catch (error) {
                console.error(error);
                toast.error('Failed to upload image', { id: toastId });
                return;
              }
            }

            await onSubmit({
              ...values,
              englishName: values.englishName.trim(),
              positionEn: values.positionEn?.trim() || null,
              positionZhHant: values.positionZhHant?.trim() || null,
              avatarUrl,
            });
          })}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              English name
              <input
                {...register('englishName')}
                className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3"
              />
              {errors.englishName && <p className="text-xs text-system-danger">{errors.englishName.message}</p>}
            </label>
            <label className="text-sm font-semibold">
              Position (EN)
              <input
                {...register('positionEn')}
                className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Position (ZH-HANT)
              <input
                {...register('positionZhHant')}
                className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Avatar URL
              <input
                {...register('avatarUrl')}
                className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3"
              />
              {errors.avatarUrl && <p className="text-xs text-system-danger">{errors.avatarUrl.message}</p>}
            </label>
          </div>

          <div className="rounded-3xl border-2 border-dashed border-border p-5 text-center text-sm text-text-secondary">
            <p className="font-semibold text-text-primary">Upload portrait</p>
            <p className="mt-1">Pick a file and it will upload when you save the member.</p>
            <input
              type="file"
              accept="image/*"
              className="mt-4"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setSelectedFileName(file.name);
                }
              }}
            />
            {selectedFileName && <p className="mt-2 text-xs text-text-secondary">Selected: {selectedFileName}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Display order
              <input
                type="number"
                {...register('displayOrder', { valueAsNumber: true })}
                className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3"
              />
            </label>
            <label className="mt-7 flex items-center gap-3 text-sm font-semibold text-text-secondary">
              <input type="checkbox" {...register('isActive')} className="h-4 w-4" /> Active on public site
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-neutral-200 px-4 py-2 text-sm font-semibold text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg"
            >
              {isSubmitting ? 'Saving…' : 'Save member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CmsTeamMembersPage() {
  const params = useParams<{ teamId: string }>();
  const rawTeamId = params?.teamId;
  const teamId = Array.isArray(rawTeamId) ? rawTeamId[0] : rawTeamId;

  const teamsCollection = useCmsCollection<CmsTeamRecord>('teams');
  const membersCollection = useCmsCollection<CmsTeamMemberRecord>('teamMembers');

  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; record?: CmsTeamMemberRecord } | null>(null);

  const team = useMemo(
    () => teamsCollection.items.find((item) => item.id === teamId),
    [teamsCollection.items, teamId],
  );

  const teamMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = membersCollection.items
      .filter((member) => member.teamId === teamId)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    if (!term) {
      return filtered;
    }

    return filtered.filter((member) =>
      [member.englishName, member.positionEn, member.positionZhHant]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [membersCollection.items, searchTerm, teamId]);

  const handleCreate = async (values: MemberFormValues) => {
    if (!teamId) {
      toast.error('Missing team id.');
      return;
    }
    try {
      await membersCollection.createItem({ ...values, teamId });
      toast.success('Member added');
      setModalState(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create member');
    }
  };

  const handleUpdate = async (record: CmsTeamMemberRecord, values: MemberFormValues) => {
    if (!teamId) {
      toast.error('Missing team id.');
      return;
    }
    try {
      await membersCollection.updateItem(record.id, { ...values, teamId });
      toast.success('Member updated');
      setModalState(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update member');
    }
  };

  const handleDelete = async (record: CmsTeamMemberRecord) => {
    if (!window.confirm(`Delete ${record.englishName ?? 'this member'}?`)) return;
    try {
      await membersCollection.deleteItem(record.id);
      toast.success('Member deleted');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete member');
    }
  };

  const isLoading = teamsCollection.isLoading || membersCollection.isLoading;

  if (!teamId) {
    return <p className="rounded-2xl bg-white p-6 text-sm text-system-danger">Invalid team id.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/cms/teams" className="text-sm font-semibold text-primary hover:underline">
            ← Back to teams
          </Link>
          <h1 className="mt-2 text-3xl font-black text-text-primary">
            Manage Members: {team?.name ?? 'Loading team...'}
          </h1>
          <p className="text-text-secondary">Add, update, or remove members for this team.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ mode: 'create' })}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-primary/40"
        >
          + Add member
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search members by name or position…"
          className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-2"
        />
      </div>

      <div className="table-container overflow-x-auto rounded-3xl border border-border bg-white shadow-card">
        <table className="min-w-[760px] divide-y divide-border text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            <tr>
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Position</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                  Loading members…
                </td>
              </tr>
            ) : teamMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                  No members in this team yet.
                </td>
              </tr>
            ) : (
              teamMembers.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-text-primary">{member.englishName ?? 'Unnamed'}</div>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {member.positionEn ?? '—'}
                    {member.positionZhHant ? <div className="text-xs">{member.positionZhHant}</div> : null}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{member.displayOrder ?? 0}</td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                        statusStyles[member.isActive === false ? 'archived' : 'active'],
                      )}
                    >
                      {member.isActive === false ? 'Hidden' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModalState({ mode: 'edit', record: member })}
                        className="rounded-full bg-neutral-100 px-4 py-1 text-xs font-semibold text-text-primary hover:bg-neutral-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member)}
                        className="rounded-full bg-system-danger/10 px-4 py-1 text-xs font-semibold text-system-danger hover:bg-system-danger/20"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MemberModal
        key={modalState?.mode === 'edit' ? modalState.record?.id : 'create'}
        open={modalState !== null}
        title={modalState?.mode === 'edit' ? 'Edit member' : 'Add member'}
        defaultValues={modalState?.record}
        onClose={() => setModalState(null)}
        onSubmit={async (values) => {
          if (modalState?.mode === 'edit' && modalState.record) {
            await handleUpdate(modalState.record, values);
            return;
          }
          await handleCreate(values);
        }}
      />
    </div>
  );
}
