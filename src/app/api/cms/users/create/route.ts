import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminAuth, requireAdminDb } from '@/lib/firebase/admin';
import { cmsErrorResponse } from '@/app/api/cms/utils';

const createUserSchema = z.object({
  email: z.string().email('Valid email is required.'),
  password: z
    .union([z.string().min(6, 'Password must be at least 6 characters.'), z.literal(''), z.null()])
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }),
  englishName: z.string().trim().min(1, 'English name is required.'),
  chineseName: z.string().trim().optional().nullable(),
  studentId: z.string().trim().optional().nullable(),
  role: z.enum(['admin', 'developer', 'organizer', 'member']).default('member'),
});

export async function POST(request: Request) {
  try {
    await verifyCmsRequest(request, ['admin']);

    const body = await request.json().catch(() => ({}));
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new CmsHttpError(400, parsed.error.issues[0]?.message ?? 'Invalid input.');
    }

    const { email, password, englishName, chineseName, studentId, role } = parsed.data;

    const adminAuth = requireAdminAuth();
    const db = requireAdminDb();

    const userRecord = await adminAuth.createUser(
      password
        ? {
            email,
            password,
            displayName: englishName,
          }
        : {
            email,
            displayName: englishName,
          },
    );

    const now = new Date();

    await Promise.all([
      db.collection('cms_users').doc(userRecord.uid).set(
        {
          uid: userRecord.uid,
          email,
          englishName,
          studentId: studentId ?? null,
          role,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      ),
      db.collection('user_profiles').doc(userRecord.uid).set(
        {
          englishName,
          chineseName: chineseName ?? null,
          studentId: studentId ?? null,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      ),
    ]);

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      englishName,
      role,
    });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
