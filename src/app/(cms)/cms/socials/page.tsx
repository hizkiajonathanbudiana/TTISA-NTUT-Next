'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useCmsCollection } from '@/hooks/useCmsCollection';
import type { CmsDocument } from '@/lib/cms/client';

const SocialFormSchema = z.object({
  platform: z.enum(['email', 'instagram', 'line', 'facebook', 'linkedin', 'generic']),
  label: z.string().min(2, 'Display label is required'),
  url: z.string().url('Provide a valid URL or mailto link'),
  displayOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
});

type SocialFormInput = z.input<typeof SocialFormSchema>;
type SocialFormValues = z.output<typeof SocialFormSchema>;

type CmsSocialRecord = CmsDocument & SocialFormValues;

const platformPlaceholders: Record<SocialFormValues['platform'], string> = {
  instagram: 'https://instagram.com/ttisa_ntut',
  line: 'https://line.me/ti/p/~ttisa',
  email: 'mailto:hello@ttisa.org',
  facebook: 'https://facebook.com/ttisa',
  linkedin: 'https://linkedin.com/in/ttisa',
  generic: 'https://example.com/ttisa',
};

const statusStyles = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-neutral-200 text-neutral-700',
};

interface SocialModalProps {
  open: boolean;
  title: string;
  defaultValues?: Partial<SocialFormValues>;
  onClose: () => void;
  onSubmit: (values: SocialFormValues) => Promise<void>;
}

const SocialModal = ({ open, title, defaultValues, onClose, onSubmit }: SocialModalProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SocialFormInput, unknown, SocialFormValues>({
    resolver: zodResolver(SocialFormSchema),
    defaultValues: {
      platform: 'instagram',
      displayOrder: 0,
      isActive: true,
      ...defaultValues,
    },
  });
  const [platformChoice, setPlatformChoice] = useState<SocialFormValues['platform']>(defaultValues?.platform ?? 'instagram');

  const platformField = register('platform');

  const handlePlatformChange = (nextPlatform: SocialFormValues['platform'], event: ChangeEvent<HTMLSelectElement>) => {
    platformField.onChange(event);
    setPlatformChoice(nextPlatform);
    if (defaultValues?.url) return;
    const currentUrl = getValues('url');
    const placeholderValues = Object.values(platformPlaceholders);
    if (!currentUrl || placeholderValues.includes(currentUrl)) {
      setValue('url', platformPlaceholders[nextPlatform], { shouldDirty: true });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="text-2xl text-text-secondary" aria-label="Close">
            ×
          </button>
        </div>
        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              ...values,
              label: values.label.trim(),
              url: values.url.trim(),
            });
          })}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Platform
              <select
                {...platformField}
                className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-2 capitalize"
                onChange={(event) => handlePlatformChange(event.target.value as SocialFormValues['platform'], event)}
              >
                {Object.keys(platformPlaceholders).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Display order
              <input type="number" {...register('displayOrder', { valueAsNumber: true })} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-2" />
            </label>
          </div>

          <label className="text-sm font-semibold">
            Label
            <input {...register('label')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-2" />
            {errors.label && <p className="text-xs text-system-danger">{errors.label.message}</p>}
          </label>

          <label className="text-sm font-semibold">
            URL / Handle
            <input
              {...register('url')}
              placeholder={platformPlaceholders[platformChoice]}
              className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 px-4 py-2"
            />
            {errors.url && <p className="text-xs text-system-danger">{errors.url.message}</p>}
          </label>

          <label className="flex items-center gap-3 text-sm font-semibold text-text-secondary">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4" /> Visible on public site
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-2xl bg-neutral-200 px-4 py-2 text-sm font-semibold text-text-primary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg">
              {isSubmitting ? 'Saving…' : 'Save link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CmsSocialsPage() {
  const { items, isLoading, createItem, updateItem, deleteItem } = useCmsCollection<CmsSocialRecord>('socials');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; record?: CmsSocialRecord } | null>(null);

  const filteredLinks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((link) => [link.platform, link.label, link.url]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [items, searchTerm]);

  const handleCreate = async (values: SocialFormValues) => {
    try {
      await createItem(values);
      toast.success('Social link created');
      setModalState(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create link');
    }
  };

  const handleUpdate = async (record: CmsSocialRecord, values: SocialFormValues) => {
    try {
      await updateItem(record.id, values);
      toast.success('Social link updated');
      setModalState(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update link');
    }
  };

  const handleDelete = async (record: CmsSocialRecord) => {
    if (!window.confirm(`Delete ${record.label}?`)) return;
    try {
      await deleteItem(record.id);
      toast.success('Social link deleted');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete link');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">CMS</p>
          <h1 className="text-3xl font-black text-text-primary">Manage Social Links</h1>
          <p className="text-text-secondary">Control every contact channel surfaced on the footer and profile page.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ mode: 'create' })}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-primary/40"
        >
          + Add link
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by platform, label, or URL…"
          className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-2"
        />
      </div>

      <div className="table-container overflow-x-auto rounded-3xl border border-border bg-white shadow-card">
        <table className="min-w-[760px] divide-y divide-border text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            <tr>
              <th className="px-6 py-4">Platform</th>
              <th className="px-6 py-4">Label</th>
              <th className="px-6 py-4">URL</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-text-secondary">
                  Loading links…
                </td>
              </tr>
            ) : filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-text-secondary">
                  No social links found.
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => (
                <tr key={link.id}>
                  <td className="px-6 py-4 capitalize">{link.platform}</td>
                  <td className="px-6 py-4 text-text-primary">{link.label}</td>
                  <td className="px-6 py-4 text-text-secondary">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
                      {link.url}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{link.displayOrder ?? 0}</td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        statusStyles[link.isActive === false ? 'inactive' : 'active'],
                      )}
                    >
                      {link.isActive === false ? 'Hidden' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModalState({ mode: 'edit', record: link })}
                        className="rounded-full bg-neutral-100 px-4 py-1 text-xs font-semibold text-text-primary hover:bg-neutral-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(link)}
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

      <SocialModal
        open={modalState?.mode === 'create'}
        title="Create social link"
        onClose={() => setModalState(null)}
        onSubmit={handleCreate}
      />
      {modalState?.mode === 'edit' && modalState.record && (
        <SocialModal
          open
          title="Edit social link"
          defaultValues={modalState.record}
          onClose={() => setModalState(null)}
          onSubmit={(values) => handleUpdate(modalState.record!, values)}
        />
      )}
    </div>
  );
}

