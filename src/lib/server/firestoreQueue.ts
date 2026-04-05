import { requireAdminDb } from '@/lib/firebase/admin';

type QueueJobPayload = Record<string, unknown>;

type QueueJob = {
  path: string;
  payload: QueueJobPayload;
};

const normalizePath = (path: string) => {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error('Queue path is required.');
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const isQueueEnabled = () => process.env.QUEUE_ENABLED === 'true';

export const getQueueSecret = () => process.env.QUEUE_SECRET || '';

export const getQueueCollection = () => process.env.QUEUE_COLLECTION || 'queue_jobs';

export const enqueueQueueJob = async ({ path, payload }: QueueJob) => {
  const db = requireAdminDb();
  const now = new Date();
  const jobRef = db.collection(getQueueCollection()).doc();
  const normalizedPath = normalizePath(path);

  await jobRef.set({
    path: normalizedPath,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });

  return jobRef.id;
};
