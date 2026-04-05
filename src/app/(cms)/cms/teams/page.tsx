'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useCmsCollection } from '@/hooks/useCmsCollection';
import type { CmsDocument } from '@/lib/cms/client';

const TeamFormSchema = z.object({
  name: z.string().min(2, 'English team name is required'),
  nameZhHant: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionZhHant: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
});

type TeamFormInput = z.input<typeof TeamFormSchema>;
type TeamFormValues = z.output<typeof TeamFormSchema>;
type CmsTeamRecord = CmsDocument & TeamFormValues;
type CmsTeamMemberRecord = CmsDocument & { teamId?: string | null };

const statusStyles: Record<'active' | 'archived', string> = {
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-neutral-200 text-neutral-700',
};

interface TeamModalProps {
  open: boolean;
  title: string;
  defaultValues?: Partial<TeamFormValues>;
  onClose: () => void;
  onSubmit: (values: TeamFormValues) => Promise<void>;
}

const TeamModal = ({ open, title, defaultValues, onClose, onSubmit }: TeamModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormInput, unknown, TeamFormValues>({
    resolver: zodResolver(TeamFormSchema),
    defaultValues: {
      displayOrder: 0,
      isActive: true,
      ...defaultValues,
    },
  });
  const [activeTab, setActiveTab] = useState<'en' | 'zh'>('en');

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

        <div className="mt-4 border-b border-border">
          <nav className="flex gap-6 text-sm font-semibold">
            <button
              type="button"
              className={clsx('pb-3', activeTab === 'en' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary')}
              onClick={() => setActiveTab('en')}
            >
              English
            </button>
            <button
              type="button"
              className={clsx('pb-3', activeTab === 'zh' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary')}
              onClick={() => setActiveTab('zh')}
            >
              繁體中文
            </button>
          </nav>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              ...values,
              name: values.name.trim(),
              nameZhHant: values.nameZhHant?.trim() || null,
              description: values.description?.trim() || null,
              descriptionZhHant: values.descriptionZhHant?.trim() || null,
            });
          })}
        >
          {activeTab === 'en' && (
            <div className="grid gap-4">
              <label className="text-sm font-semibold">
                Team Name (EN)
                <input {...register('name')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
                {errors.name && <p className="text-xs text-system-danger">{errors.name.message}</p>}
              </label>
              <label className="text-sm font-semibold">
                Description (EN)
                <textarea {...register('description')} rows={4} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
              </label>
            </div>
          )}

          {activeTab === 'zh' && (
            <div className="grid gap-4">
              <label className="text-sm font-semibold">
                Team Name (ZH-HANT)
                <input {...register('nameZhHant')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
              </label>
              <label className="text-sm font-semibold">
                Description (ZH-HANT)
                <textarea {...register('descriptionZhHant')} rows={4} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
              </label>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Display order
              <input type="number" {...register('displayOrder', { valueAsNumber: true })} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
            </label>
            <label className="mt-7 flex items-center gap-3 text-sm font-semibold text-text-secondary">
              <input type="checkbox" {...register('isActive')} className="h-4 w-4" /> Active on public site
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl bg-neutral-200 px-4 py-2 text-sm font-semibold text-text-primary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg">
              {isSubmitting ? 'Saving…' : 'Save team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CmsTeamsPage() {
  const teamsCollection = useCmsCollection<CmsTeamRecord>('teams');
  const membersCollection = useCmsCollection<CmsTeamMemberRecord>('teamMembers');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; record?: CmsTeamRecord } | null>(null);

  const memberCountByTeam = useMemo(() => {
    const countMap = new Map<string, number>();
    membersCollection.items.forEach((member) => {
      const teamId = typeof member.teamId === 'string' ? member.teamId : null;
      if (!teamId) {
        return;
      }
      countMap.set(teamId, (countMap.get(teamId) ?? 0) + 1);
    });
    return countMap;
  }, [membersCollection.items]);

  const filteredTeams = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sortedTeams = [...teamsCollection.items].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );
    if (!term) {
      return sortedTeams;
    }
    return sortedTeams.filter((team) => [team.name, team.nameZhHant, team.description, team.descriptionZhHant]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [teamsCollection.items, searchTerm]);

  const handleCreate = async (values: TeamFormValues) => {
    try {
      await teamsCollection.createItem(values);
      toast.success('Team created');
      setModalState(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create team');
    }
  };

  const handleUpdate = async (record: CmsTeamRecord, values: TeamFormValues) => {
    try {
      await teamsCollection.updateItem(record.id, values);
      toast.success('Team updated');
      setModalState(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update team');
    }
  };

  const handleDelete = async (record: CmsTeamRecord) => {
    const teamMemberCount = memberCountByTeam.get(record.id) ?? 0;
    if (teamMemberCount > 0) {
      toast.error('Remove team members first before deleting this team.');
      return;
    }
    if (!window.confirm(`Delete ${record.name ?? 'this team'}?`)) return;
    try {
      await teamsCollection.deleteItem(record.id);
      toast.success('Team deleted');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete team');
    }
  };

  const isLoading = teamsCollection.isLoading || membersCollection.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">CMS</p>
          <h1 className="text-3xl font-black text-text-primary">Manage Teams</h1>
          <p className="text-text-secondary">Create teams first, then manage members inside each team.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ mode: 'create' })}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-primary/40"
        >
          + Create team
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search teams by name or description…"
          className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-2"
        />
      </div>

      <div className="table-container overflow-x-auto rounded-3xl border border-border bg-white shadow-card">
        <table className="min-w-[760px] divide-y divide-border text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            <tr>
              <th className="px-6 py-4">Team</th>
              <th className="px-6 py-4">Members</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                  Loading teams…
                </td>
              </tr>
            ) : filteredTeams.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                  No teams found.
                </td>
              </tr>
            ) : (
              filteredTeams.map((team) => (
                <tr key={team.id}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-text-primary">{team.name}</div>
                    {team.nameZhHant && <div className="text-xs text-text-secondary">{team.nameZhHant}</div>}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{memberCountByTeam.get(team.id) ?? 0}</td>
                  <td className="px-6 py-4 text-text-secondary">{team.displayOrder ?? 0}</td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                        statusStyles[team.isActive === false ? 'archived' : 'active'],
                      )}
                    >
                      {team.isActive === false ? 'Hidden' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/cms/teams/${team.id}`}
                        className="rounded-full bg-secondary/10 px-4 py-1 text-xs font-semibold text-secondary hover:bg-secondary/20"
                      >
                        Manage members
                      </Link>
                      <button
                        type="button"
                        onClick={() => setModalState({ mode: 'edit', record: team })}
                        className="rounded-full bg-neutral-100 px-4 py-1 text-xs font-semibold text-text-primary hover:bg-neutral-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(team)}
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

      <TeamModal
        key={modalState?.mode === 'edit' ? modalState.record?.id : 'create'}
        open={modalState !== null}
        title={modalState?.mode === 'edit' ? 'Edit team' : 'Create team'}
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

