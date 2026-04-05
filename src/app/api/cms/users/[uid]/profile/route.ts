import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminAuth, requireAdminDb } from '@/lib/firebase/admin';
import { cmsErrorResponse } from '@/app/api/cms/utils';

type RouteContext = { params: Promise<{ uid: string }> };

const profileSchema = z.object({
  email: z.string().email('Valid email is required.'),
  englishName: z.string().trim().min(1, 'English name is required.'),
  chineseName: z.string().trim().optional().nullable(),
  studentId: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  nationality: z.string().trim().optional().nullable(),
  gender: z.enum(['male', 'female', 'rather_not_say']).optional().nullable(),
  birthDate: z.string().trim().optional().nullable(),
  studentStatus: z.enum(['本國生', '僑生', '陸生', '外籍生', 'exchange_student']).optional().nullable(),
  avatarUrl: z.string().url('Avatar URL must be valid URL.').optional().nullable(),
  role: z.enum(['admin', 'developer', 'organizer', 'member']).default('member'),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request, ['admin', 'developer', 'organizer']);
    const { uid } = await context.params;
    if (!uid) {
      throw new CmsHttpError(400, 'Missing user id.');
    }

    const body = await request.json().catch(() => ({}));
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      throw new CmsHttpError(400, parsed.error.issues[0]?.message ?? 'Invalid payload.');
    }

    const db = requireAdminDb();
    const auth = requireAdminAuth();
    const now = new Date();

    const {
      email,
      englishName,
      chineseName,
      studentId,
      department,
      nationality,
      gender,
      birthDate,
      studentStatus,
      avatarUrl,
      role,
    } = parsed.data;

    await auth.updateUser(uid, {
      email,
      displayName: englishName,
    });

    await Promise.all([
      db.collection('cms_users').doc(uid).set(
        {
          uid,
          email,
          englishName,
          studentId: studentId ?? null,
          avatarUrl: avatarUrl ?? null,
          role,
          updatedAt: now,
        },
        { merge: true },
      ),
      db.collection('user_profiles').doc(uid).set(
        {
          englishName,
          chineseName: chineseName ?? null,
          studentId: studentId ?? null,
          department: department ?? null,
          nationality: nationality ?? null,
          gender: gender ?? null,
          birthDate: birthDate ?? null,
          studentStatus: studentStatus ?? null,
          avatarUrl: avatarUrl ?? null,
          updatedAt: now,
        },
        { merge: true },
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
