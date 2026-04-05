const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');

admin.initializeApp();

const getString = (value) => (typeof value === 'string' ? value.trim() : '');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const region = getString(process.env.FUNCTIONS_REGION) || 'asia-southeast1';
const collection = getString(process.env.QUEUE_COLLECTION) || 'queue_jobs';
const baseUrl = getString(process.env.QUEUE_WORKER_BASE_URL);
const secret = getString(process.env.QUEUE_SECRET);
const maxAttemptsRaw = Number(process.env.QUEUE_MAX_ATTEMPTS || '3');
const backoffRaw = Number(process.env.QUEUE_BACKOFF_MS || '500');

const maxAttempts = Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0 ? maxAttemptsRaw : 3;
const backoffMs = Number.isFinite(backoffRaw) && backoffRaw > 0 ? backoffRaw : 500;

setGlobalOptions({ region });

const normalizePath = (path) => {
  const trimmed = getString(path);
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const buildUrl = (path) => {
  const normalized = normalizePath(path);
  if (!normalized) {
    return '';
  }
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${normalized}`;
};

const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

exports.processQueueJob = onDocumentCreated(`${collection}/{jobId}`, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const data = snapshot.data() || {};
  const path = normalizePath(data.path);
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};

  if (!baseUrl) {
    await snapshot.ref.set(
      {
        status: 'error',
        lastError: 'QUEUE_WORKER_BASE_URL is not configured.',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  if (!path) {
    await snapshot.ref.set(
      {
        status: 'error',
        lastError: 'Queue job is missing a path.',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  const url = buildUrl(path);
  const headers = {
    'Content-Type': 'application/json',
  };

  if (secret) {
    headers['x-queue-secret'] = secret;
  }

  await snapshot.ref.set({ status: 'processing', updatedAt: serverTimestamp(), attempts: 0 }, { merge: true });

  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Worker responded ${response.status}${text ? `: ${text}` : ''}`);
      }

      await snapshot.ref.set(
        {
          status: 'done',
          attempts: attempt,
          updatedAt: serverTimestamp(),
          finishedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Queue worker failed.';
      await snapshot.ref.set(
        {
          status: attempt < maxAttempts ? 'retrying' : 'error',
          attempts: attempt,
          lastError,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (attempt < maxAttempts) {
        await sleep(backoffMs * attempt);
      }
    }
  }
});
