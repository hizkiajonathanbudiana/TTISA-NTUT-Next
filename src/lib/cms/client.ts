import type { User } from 'firebase/auth';
import { CMS_RESOURCE_MAP, type CmsResourceKey } from '@/lib/cms/resources';

const buildPath = (resource: CmsResourceKey, id?: string | null) => (id ? `/api/cms/${resource}/${id}` : `/api/cms/${resource}`);

export const authorizedCmsFetch = async <T>(user: User | null, path: string, init: RequestInit = {}) => {
  if (!user) {
    throw new Error('Please sign in again to manage CMS data.');
  }

  const token = await user.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const reason = typeof payload.error === 'string' ? payload.error : 'Request failed';
    throw new Error(reason);
  }

  return response.json() as Promise<T>;
};

const cmsRequest = async <T>(user: User | null, resource: CmsResourceKey, init: RequestInit & { id?: string | null }) => {
  const { id, ...rest } = init;
  return authorizedCmsFetch<T>(user, buildPath(resource, id), rest);
};

export type CmsDocument = { id: string };

export const listCmsDocuments = <T extends CmsDocument = CmsDocument>(user: User | null, resource: CmsResourceKey) =>
  cmsRequest<T[]>(user, resource, { method: 'GET' });

export const createCmsDocument = <T extends CmsDocument = CmsDocument>(
  user: User | null,
  resource: CmsResourceKey,
  body: Record<string, unknown>,
) => cmsRequest<T>(user, resource, { method: 'POST', body: JSON.stringify(body) });

export const updateCmsDocument = <T extends CmsDocument = CmsDocument>(
  user: User | null,
  resource: CmsResourceKey,
  id: string,
  body: Record<string, unknown>,
) => cmsRequest<T>(user, resource, { method: 'PATCH', id, body: JSON.stringify(body) });

export const deleteCmsDocument = (user: User | null, resource: CmsResourceKey, id: string) =>
  cmsRequest<{ success: true }>(user, resource, { method: 'DELETE', id });

export const getCmsDocument = <T extends CmsDocument = CmsDocument>(user: User | null, resource: CmsResourceKey, id: string) =>
  cmsRequest<T>(user, resource, { method: 'GET', id });

export const getCmsResourceDefinition = (resourceKey: CmsResourceKey) => CMS_RESOURCE_MAP[resourceKey];
