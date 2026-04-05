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
import { uploadCmsAsset } from '@/lib/firebase/storage';

const EventFormSchema = z
  .object({
    title: z.string().min(3, 'Title is required'),
    slug: z.string().min(3, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and dashes.'),
    status: z.enum(['draft', 'published', 'archived']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    coverImageUrl: z.string().url('Provide a valid URL').optional().nullable(),
    mediaDriveUrl: z.string().url('Provide a valid URL').optional().nullable(),
    isPaid: z.boolean().default(false),
    price: z.number().min(0, 'Price must be 0 or greater').optional().nullable(),
  })
  .refine((value) => {
    if (!value.endDate) return true;
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    return end >= start;
  }, "End date can't be before start date");

type EventFormValues = z.infer<typeof EventFormSchema>;

type CmsEventRecord = CmsDocument & {
  title?: string;
  slug?: string;
  status?: 'draft' | 'published' | 'archived';
  startDate?: string;
  endDate?: string | null;
  location?: string | null;
  summary?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  mediaDriveUrl?: string | null;
  isPaid?: boolean;
  price?: number | null;
};

const statusStyles: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-800',
};

const formatRange = (start?: string, end?: string | null) => {
  if (!start) return 'TBA';
  const startDate = new Date(start);
  const startLabel = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!end) return startLabel;
  const endDate = new Date(end);
  const endLabel = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} → ${endLabel}`;
};

const toInputDate = (value?: string | null) => {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

interface EventModalProps {
  open: boolean;
  title: string;
  defaultValues?: Partial<EventFormValues>;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => Promise<void>;
}

const EventModal = ({ open, title, defaultValues, onClose, onSubmit }: EventModalProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof EventFormSchema>, unknown, z.output<typeof EventFormSchema>>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: {
      status: 'draft',
      ...defaultValues,
      startDate: toInputDate(defaultValues?.startDate ?? undefined),
      endDate: toInputDate(defaultValues?.endDate ?? undefined),
      isPaid: Boolean(defaultValues?.isPaid),
      price: defaultValues?.price ?? null,
    },
  });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const url = await uploadCmsAsset(file, { folder: 'cms/events' });
      setValue('coverImageUrl', url, { shouldDirty: true });
      toast.success('Banner uploaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative my-4 w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-6 top-6 text-text-secondary" aria-label="Close">
          ×
        </button>
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              ...values,
              startDate: new Date(values.startDate).toISOString(),
              endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
              summary: values.summary?.trim() || null,
              description: values.description?.trim() || null,
              location: values.location?.trim() || null,
              coverImageUrl: values.coverImageUrl?.trim() || null,
              mediaDriveUrl: values.mediaDriveUrl?.trim() || null,
              isPaid: Boolean(values.isPaid),
              price: values.isPaid ? values.price ?? 0 : null,
            });
          })}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-semibold">
              Title
              <input {...register('title')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
              {errors.title && <p className="text-xs text-system-danger">{errors.title.message}</p>}
            </label>
            <label className="text-sm font-semibold">
              Slug
              <input {...register('slug')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
              {errors.slug && <p className="text-xs text-system-danger">{errors.slug.message}</p>}
            </label>
            <label className="text-sm font-semibold">
              Status
              <select {...register('status')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Location
              <input {...register('location')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-neutral-50 px-4 py-3 text-sm font-semibold text-text-primary">
              <input type="checkbox" {...register('isPaid')} className="h-4 w-4" />
              Paid event
            </label>
            <label className="text-sm font-semibold">
              Price (TWD)
              <input
                type="number"
                min={0}
                step="1"
                {...register('price', {
                  setValueAs: (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
                })}
                className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3"
              />
              {errors.price && <p className="text-xs text-system-danger">{errors.price.message}</p>}
            </label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-semibold">
              Start time
              <input type="datetime-local" {...register('startDate')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
              {errors.startDate && <p className="text-xs text-system-danger">{errors.startDate.message}</p>}
            </label>
            <label className="text-sm font-semibold">
              End time
              <input type="datetime-local" {...register('endDate')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
              {errors.endDate && <p className="text-xs text-system-danger">{errors.endDate.message}</p>}
            </label>
          </div>
          <label className="text-sm font-semibold">
            Summary
            <textarea rows={3} {...register('summary')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
          </label>
          <label className="text-sm font-semibold">
            Detailed description
            <textarea rows={6} {...register('description')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
          </label>
          <label className="text-sm font-semibold">
            Cover image URL
            <input {...register('coverImageUrl')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" />
            {errors.coverImageUrl && <p className="text-xs text-system-danger">{errors.coverImageUrl.message}</p>}
          </label>
          <label className="text-sm font-semibold">
            Google Drive folder URL (photo/video)
            <input {...register('mediaDriveUrl')} className="mt-1 w-full rounded-2xl border border-border bg-neutral-50 p-3" placeholder="https://drive.google.com/drive/folders/..." />
            {errors.mediaDriveUrl && <p className="text-xs text-system-danger">{errors.mediaDriveUrl.message}</p>}
          </label>
          <div className="rounded-3xl border-2 border-dashed border-border p-6 text-center text-sm text-text-secondary">
            <p className="font-semibold text-text-primary">Upload banner</p>
            <p className="mt-1">Drag & drop an image or click below.</p>
            <input
              type="file"
              accept="image/*"
              className="mt-4"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
              }}
            />
            {uploading && <p className="mt-2 text-xs">Uploading…</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl bg-neutral-200 px-4 py-2 text-sm font-semibold text-text-primary">
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const isUpcoming = (iso?: string) => {
  if (!iso) return false;
  return new Date(iso) >= new Date();
};

export default function CmsEventsPage() {
  const { items, isLoading, createItem, updateItem, deleteItem } = useCmsCollection<CmsEventRecord>('events');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; event?: CmsEventRecord } | null>(null);

  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((event) => [event.title, event.slug, event.location].some((value) => value?.toLowerCase().includes(term) ?? false));
  }, [items, searchTerm]);

  const handleCreate = async (values: EventFormValues) => {
    try {
      await createItem(values);
      toast.success('Event created');
      setModalState(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create event');
    }
  };

  const handleUpdate = async (record: CmsEventRecord, values: EventFormValues) => {
    try {
      await updateItem(record.id, values);
      toast.success('Event updated');
      setModalState(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update event');
    }
  };

  const handleDelete = async (record: CmsEventRecord) => {
    if (!window.confirm(`Delete "${record.title ?? 'this event'}"?`)) return;
    try {
      await deleteItem(record.id);
      toast.success('Event deleted');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete event');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">CMS</p>
          <h1 className="text-3xl font-black text-text-primary">Manage Events</h1>
          <p className="text-text-secondary">Schedule cultural nights, trips, and gatherings.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ mode: 'create' })}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-primary/40"
        >
          + Create new event
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search events by title, slug, or location…"
          className="w-full rounded-2xl border border-border bg-neutral-50 px-4 py-2"
        />
      </div>

      <div className="table-container overflow-x-auto rounded-3xl border border-border bg-white shadow-card">
        <table className="min-w-[760px] divide-y divide-border">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            <tr>
              <th className="px-6 py-4">Event</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-text-secondary">
                  Loading events…
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-text-secondary">
                  No events match your filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-text-primary">{event.title ?? 'Untitled Event'}</div>
                    <div className="text-xs text-text-secondary">/{event.slug}</div>
                    {event.location && <div className="text-xs text-text-secondary">{event.location}</div>}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{formatRange(event.startDate, event.endDate ?? null)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', statusStyles[event.status ?? 'draft'])}>
                        {event.status ?? 'draft'}
                      </span>
                      {event.status === 'published' && (
                        <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', isUpcoming(event.startDate) ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-700')}>
                          {isUpcoming(event.startDate) ? 'Upcoming' : 'Past'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/cms/events/${event.id}/registrations`}
                        className="rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                      >
                        Registrations
                      </Link>
                      <button
                        type="button"
                        onClick={() => setModalState({ mode: 'edit', event })}
                        className="rounded-full bg-neutral-100 px-4 py-1 text-xs font-semibold text-text-primary hover:bg-neutral-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(event)}
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

      <EventModal
        open={modalState?.mode === 'create'}
        title="Create new event"
        onClose={() => setModalState(null)}
        onSubmit={handleCreate}
      />
      {modalState?.mode === 'edit' && modalState.event && (
        <EventModal
          open
          title="Edit event"
          defaultValues={{
            title: modalState.event.title ?? '',
            slug: modalState.event.slug ?? '',
            status: modalState.event.status ?? 'draft',
            summary: modalState.event.summary ?? '',
            description: modalState.event.description ?? '',
            location: modalState.event.location ?? '',
            coverImageUrl: modalState.event.coverImageUrl ?? '',
            startDate: modalState.event.startDate ?? undefined,
            endDate: modalState.event.endDate ?? undefined,
          }}
          onClose={() => setModalState(null)}
          onSubmit={(values) => handleUpdate(modalState.event!, values)}
        />
      )}
    </div>
  );
}

