'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CMS_RESOURCE_MAP, type CmsFieldConfig, type CmsResourceKey } from '@/lib/cms/resources';
import { deleteCmsDocument, listCmsDocuments, createCmsDocument, updateCmsDocument } from '@/lib/cms/client';
import { useAuth } from '@/providers/AuthProvider';

const toDateInputValue = (value: unknown) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 16);
};

const buildInitialState = (resourceKey: CmsResourceKey) => {
  const definition = CMS_RESOURCE_MAP[resourceKey];
  const state: Record<string, unknown> = {};
  definition.fields.forEach((field) => {
    const defaultValue = definition.defaults?.[field.name];
    switch (field.type) {
      case 'boolean':
        state[field.name] = typeof defaultValue === 'boolean' ? defaultValue : false;
        break;
      case 'number':
        state[field.name] = typeof defaultValue === 'number' ? defaultValue : '';
        break;
      case 'datetime':
        state[field.name] = defaultValue ? toDateInputValue(defaultValue) : '';
        break;
      default:
        state[field.name] = (defaultValue as string | undefined) ?? '';
        break;
    }
  });
  return state;
};

const formatCellValue = (field: CmsFieldConfig, value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return '—';
  }
  if (field.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (field.type === 'datetime') {
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
  return String(value);
};

const preparePayload = (resourceKey: CmsResourceKey, state: Record<string, unknown>) => {
  const definition = CMS_RESOURCE_MAP[resourceKey];
  const payload: Record<string, unknown> = {};
  definition.fields.forEach((field) => {
    const rawValue = state[field.name];
    const isOptional = !field.required;
    if (rawValue === undefined || rawValue === null) {
      if (isOptional) {
        payload[field.name] = null;
      }
      return;
    }

    if (field.type === 'number') {
      if (rawValue === '') {
        if (isOptional) {
          payload[field.name] = null;
        }
        return;
      }
      const numeric = Number(rawValue);
      if (!Number.isNaN(numeric)) {
        payload[field.name] = numeric;
      }
      return;
    }

    if (field.type === 'datetime') {
      if (typeof rawValue === 'string' && rawValue.length) {
        const asDate = new Date(rawValue);
        if (!Number.isNaN(asDate.getTime())) {
          payload[field.name] = asDate.toISOString();
        }
      } else if (isOptional) {
        payload[field.name] = null;
      }
      return;
    }

    if (field.type === 'boolean') {
      payload[field.name] = Boolean(rawValue);
      return;
    }

    const textValue = String(rawValue);
    const trimmed = textValue.trim();
    if (trimmed.length) {
      payload[field.name] = trimmed;
    } else if (isOptional) {
      payload[field.name] = null;
    }
  });

  return payload;
};

const hydrateFormState = (resourceKey: CmsResourceKey, item: Record<string, unknown>) => {
  const definition = CMS_RESOURCE_MAP[resourceKey];
  const nextState: Record<string, unknown> = {};
  definition.fields.forEach((field) => {
    const value = item[field.name];
    switch (field.type) {
      case 'boolean':
        nextState[field.name] = Boolean(value);
        break;
      case 'number':
        nextState[field.name] = typeof value === 'number' ? value : '';
        break;
      case 'datetime':
        nextState[field.name] = value ? toDateInputValue(value) : '';
        break;
      default:
        nextState[field.name] = value ?? '';
        break;
    }
  });
  return nextState;
};

export const CollectionManager = ({ resourceKey }: { resourceKey: CmsResourceKey }) => {
  const resource = CMS_RESOURCE_MAP[resourceKey];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, unknown>>(() => buildInitialState(resourceKey));

  const listColumns = useMemo(() => resource.fields.filter((field) => field.table), [resource.fields]);

  const collectionQuery = useQuery({
    queryKey: ['cms-collection', resourceKey],
    enabled: Boolean(user),
    queryFn: () => listCmsDocuments(user, resourceKey),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; body: Record<string, unknown> }) =>
      payload.id
        ? updateCmsDocument(user, resourceKey, payload.id, payload.body)
        : createCmsDocument(user, resourceKey, payload.body),
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Record updated.' : 'Record created.');
      queryClient.invalidateQueries({ queryKey: ['cms-collection', resourceKey] });
      setEditingId(null);
      setFormState(buildInitialState(resourceKey));
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Request failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteCmsDocument(user, resourceKey, id),
    onSuccess: () => {
      toast.success('Record deleted.');
      queryClient.invalidateQueries({ queryKey: ['cms-collection', resourceKey] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Request failed');
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = preparePayload(resourceKey, formState);
    saveMutation.mutate({ id: editingId ?? undefined, body });
  };

  const handleEdit = (item: Record<string, unknown>) => {
    setEditingId(item.id as string);
    setFormState(hydrateFormState(resourceKey, item));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormState(buildInitialState(resourceKey));
  };

  if (!user) {
    return <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-6 text-sm">Sign in to manage content.</div>;
  }

  return (
    <div className="mt-6 space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-text-primary">{editingId ? 'Edit entry' : 'Create new entry'}</p>
            <p className="text-sm text-text-secondary">All updates persist to Firebase immediately.</p>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm font-semibold text-primary">
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {resource.fields.map((field) => {
            const disableField = Boolean(editingId && resource.useCustomIdField === field.name);
            return (
              <label key={field.name} className="flex flex-col gap-2 text-sm font-semibold text-text-secondary">
                <span>
                  {field.label}
                  {field.required && <span className="text-danger"> *</span>}
                </span>
                {field.type === 'textarea' ? (
                  <textarea
                    className="min-h-[120px] rounded-2xl border border-border bg-muted/40 p-3 text-text-primary"
                    placeholder={field.placeholder}
                    value={(formState[field.name] as string) ?? ''}
                    disabled={disableField}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        [field.name]: event.target.value,
                      }))
                    }
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="rounded-2xl border border-border bg-muted/40 p-3 text-text-primary"
                    value={(formState[field.name] as string) ?? ''}
                    disabled={disableField}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        [field.name]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select…</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'boolean' ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(formState[field.name])}
                      disabled={disableField}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          [field.name]: event.target.checked,
                        }))
                      }
                    />
                    <span className="text-text-primary">Enabled</span>
                  </div>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'datetime' ? 'datetime-local' : field.type === 'url' ? 'url' : 'text'}
                    className="rounded-2xl border border-border bg-muted/40 p-3 text-text-primary"
                    placeholder={field.placeholder}
                    value={(formState[field.name] as string | number | undefined) ?? ''}
                    disabled={disableField}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        [field.name]: field.type === 'number'
                          ? event.target.value === ''
                            ? ''
                            : Number(event.target.value)
                          : event.target.value,
                      }))
                    }
                  />
                )}
                {field.helper && <span className="text-xs font-normal text-text-secondary">{field.helper}</span>}
              </label>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create entry'}
        </button>
      </form>

      <div className="rounded-3xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-4 text-sm font-semibold text-text-secondary">
          Existing entries ({collectionQuery.data?.length ?? 0})
        </div>
        {collectionQuery.isLoading ? (
          <div className="p-6 text-sm text-text-secondary">Loading collection…</div>
        ) : (collectionQuery.data as Record<string, unknown>[] | undefined)?.length ? (
          <div className="table-container overflow-x-auto">
            <table className="min-w-[760px] divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  {listColumns.map((column) => (
                    <th key={column.name} className="px-4 py-3 font-semibold">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(collectionQuery.data as Record<string, unknown>[]).map((item) => (
                  <tr key={item.id as string}>
                    {listColumns.map((column) => (
                      <td key={column.name} className="px-4 py-3 text-text-primary">
                        {formatCellValue(column, item[column.name])}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-text-secondary">
                      {formatCellValue(
                        { name: 'updatedAt', label: 'Updated', type: 'datetime' },
                        item.updatedAt ?? item.createdAt,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-3 text-xs font-semibold">
                        <button type="button" className="text-primary" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-danger"
                          onClick={() => deleteMutation.mutate(item.id as string)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-sm text-text-secondary">No entries yet. Create one above.</div>
        )}
      </div>
    </div>
  );
};
