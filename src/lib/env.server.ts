import { z } from 'zod';

const serverSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().email('FIREBASE_CLIENT_EMAIL must be a valid email'),
  FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY is required'),
  FIREBASE_DATABASE_URL: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  SESSION_COOKIE_MAX_AGE_DAYS: z.coerce.number().positive().default(5),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email('RESEND_FROM_EMAIL must be a valid email').optional(),
});

const raw = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  SESSION_COOKIE_MAX_AGE_DAYS: process.env.SESSION_COOKIE_MAX_AGE_DAYS ?? '5',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
};

const parsed = serverSchema.safeParse(raw);

export const hasServerEnv = parsed.success;

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  console.warn(
    issues.length
      ? `Missing Firebase Admin environment variables: ${issues}. Firebase Admin features are disabled.`
      : 'Missing Firebase Admin environment variables. Firebase Admin features are disabled.',
  );
}

const sanitizedPrivateKey = (parsed.success ? parsed.data.FIREBASE_PRIVATE_KEY : raw.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

export const serverEnv = parsed.success
  ? {
      ...parsed.data,
      FIREBASE_PRIVATE_KEY: sanitizedPrivateKey,
    }
  : null;

export type ServerEnv = z.infer<typeof serverSchema>;
