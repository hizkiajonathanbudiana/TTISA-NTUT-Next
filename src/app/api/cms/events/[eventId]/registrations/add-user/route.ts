import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cmsErrorResponse } from '@/app/api/cms/utils';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { requireAdminAuth, requireAdminDb } from '@/lib/firebase/admin';
import { requireEventSummary } from '@/lib/cms/registrationUtils';

type RouteContext = { params: Promise<{ eventId: string }> };

const addUserSchema = z.object({
  userId: z.string().trim().optional(),
  role: z.enum(['admin', 'developer', 'organizer', 'member']).optional().default('member'),
  email: z
    .union([z.string().trim().email('Invalid email format.'), z.literal(''), z.null()])
    .optional()
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }),
  englishName: z.string().trim().optional().default(''),
  chineseName: z.string().trim().optional().default(''),
  studentId: z.string().trim().optional().default(''),
  department: z.string().trim().optional().default(''),
  nationality: z.string().trim().optional().default(''),
  birthday: z.string().trim().optional().default(''),
  gender: z.string().trim().optional().default(''),
  studentStatus: z.string().trim().optional().default(''),
});

const normalizeOptional = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request, ['admin', 'developer', 'organizer']);
    const { eventId } = await context.params;
    if (!eventId) {
      throw new CmsHttpError(400, 'Missing event id.');
    }

    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();

    const db = requireAdminDb();
    const usersSnap = await db.collection('cms_users').orderBy('createdAt', 'desc').limit(200).get();

    const users = usersSnap.docs
      .map((docSnap) => {
        const data = docSnap.data() ?? {};
        return {
          id: docSnap.id,
          email: normalizeOptional(data.email),
          englishName: normalizeOptional(data.englishName),
          role: normalizeOptional(data.role) ?? 'member',
          studentId: normalizeOptional(data.studentId),
        };
      })
      .filter((user) => {
        if (!query) return true;
        return [user.email, user.englishName, user.studentId].some((value) => (value ?? '').toLowerCase().includes(query));
      })
      .slice(0, 30);

    return NextResponse.json({ users });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await verifyCmsRequest(request, ['admin', 'developer', 'organizer']);

    const { eventId } = await context.params;
    if (!eventId) {
      throw new CmsHttpError(400, 'Missing event id.');
    }

    const body = await request.json().catch(() => ({}));
    const parsed = addUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new CmsHttpError(400, parsed.error.issues[0]?.message ?? 'Invalid input.');
    }

    const db = requireAdminDb();
    const auth = requireAdminAuth();
    const event = await requireEventSummary(db, eventId);
    const now = new Date();

    const input = parsed.data;
    const email = normalizeOptional(input.email);
    const role = input.role;

    let uid = normalizeOptional(input.userId);
    let isAdHocRegistration = false;

    if (!uid) {
      if (email) {
        try {
          const existingAuth = await auth.getUserByEmail(email);
          uid = existingAuth.uid;
        } catch {
          const generatedPassword = randomBytes(12).toString('base64url');
          const displayName = normalizeOptional(input.englishName) ?? email.split('@')[0] ?? 'Member';
          const newAuth = await auth.createUser({
            email,
            password: generatedPassword,
            displayName,
          });
          uid = newAuth.uid;
        }
      } else {
        isAdHocRegistration = true;
      }
    }

    if (!uid && !isAdHocRegistration) {
      throw new CmsHttpError(500, 'Failed to create or resolve user.');
    }

    const registrationRef = db.collection('cms_event_registrations').doc();
    const adHocUid = `adhoc:${registrationRef.id}`;

    let cmsUserData: Record<string, unknown> = {};
    let profileData: Record<string, unknown> = {};

    if (!isAdHocRegistration && uid) {
      const cmsUserRef = db.collection('cms_users').doc(uid);
      const profileRef = db.collection('user_profiles').doc(uid);

      const cmsUserSnap = await cmsUserRef.get();
      const profileSnap = await profileRef.get();

      cmsUserData = cmsUserSnap.data() ?? {};
      profileData = profileSnap.data() ?? {};

      await Promise.all([
        cmsUserRef.set(
          {
            uid,
            email,
            englishName:
              normalizeOptional(input.englishName) ??
              normalizeOptional(profileData.englishName as string | null | undefined) ??
              normalizeOptional(cmsUserData.englishName as string | null | undefined) ??
              (email ? email.split('@')[0] : null) ??
              'Member',
            studentId:
              normalizeOptional(input.studentId) ??
              normalizeOptional(profileData.studentId as string | null | undefined) ??
              normalizeOptional(cmsUserData.studentId as string | null | undefined),
            role,
            department:
              normalizeOptional(input.department) ??
              normalizeOptional(profileData.department as string | null | undefined) ??
              normalizeOptional(cmsUserData.department as string | null | undefined),
            nationality:
              normalizeOptional(input.nationality) ??
              normalizeOptional(profileData.nationality as string | null | undefined) ??
              normalizeOptional(cmsUserData.nationality as string | null | undefined),
            updatedAt: now,
            createdAt: (cmsUserData.createdAt as Date | undefined) ?? now,
          },
          { merge: true },
        ),
        profileRef.set(
          {
            englishName:
              normalizeOptional(input.englishName) ??
              normalizeOptional(profileData.englishName as string | null | undefined) ??
              normalizeOptional(cmsUserData.englishName as string | null | undefined) ??
              (email ? email.split('@')[0] : null) ??
              'Member',
            chineseName: normalizeOptional(input.chineseName) ?? normalizeOptional(profileData.chineseName as string | null | undefined),
            studentId:
              normalizeOptional(input.studentId) ??
              normalizeOptional(profileData.studentId as string | null | undefined) ??
              normalizeOptional(cmsUserData.studentId as string | null | undefined),
            department:
              normalizeOptional(input.department) ??
              normalizeOptional(profileData.department as string | null | undefined) ??
              normalizeOptional(cmsUserData.department as string | null | undefined),
            nationality:
              normalizeOptional(input.nationality) ??
              normalizeOptional(profileData.nationality as string | null | undefined) ??
              normalizeOptional(cmsUserData.nationality as string | null | undefined),
            birthDate: normalizeOptional(input.birthday) ?? normalizeOptional(profileData.birthDate as string | null | undefined),
            gender: normalizeOptional(input.gender) ?? normalizeOptional(profileData.gender as string | null | undefined),
            studentStatus: normalizeOptional(input.studentStatus) ?? normalizeOptional(profileData.studentStatus as string | null | undefined),
            updatedAt: now,
            createdAt: (profileData.createdAt as Date | undefined) ?? now,
          },
          { merge: true },
        ),
      ]);

      const existingRegistrationSnap = await db
        .collection('cms_event_registrations')
        .where('eventId', '==', eventId)
        .where('userId', '==', uid)
        .limit(1)
        .get();

      if (!existingRegistrationSnap.empty) {
        const existing = existingRegistrationSnap.docs[0];
        return NextResponse.json({
          success: true,
          created: false,
          registrationId: existing.id,
        });
      }
    }

    const englishName =
      normalizeOptional(input.englishName) ??
      normalizeOptional(profileData.englishName as string | null | undefined) ??
      normalizeOptional(cmsUserData.englishName as string | null | undefined) ??
      (email ? email.split('@')[0] : null) ??
      'Member';

    const chineseName = normalizeOptional(input.chineseName) ?? normalizeOptional(profileData.chineseName as string | null | undefined);
    const studentId =
      normalizeOptional(input.studentId) ??
      normalizeOptional(profileData.studentId as string | null | undefined) ??
      normalizeOptional(cmsUserData.studentId as string | null | undefined);
    const department =
      normalizeOptional(input.department) ??
      normalizeOptional(profileData.department as string | null | undefined) ??
      normalizeOptional(cmsUserData.department as string | null | undefined);
    const nationality =
      normalizeOptional(input.nationality) ??
      normalizeOptional(profileData.nationality as string | null | undefined) ??
      normalizeOptional(cmsUserData.nationality as string | null | undefined);
    const birthday = normalizeOptional(input.birthday) ?? normalizeOptional(profileData.birthDate as string | null | undefined);
    const gender = normalizeOptional(input.gender) ?? normalizeOptional(profileData.gender as string | null | undefined);
    const studentStatus = normalizeOptional(input.studentStatus) ?? normalizeOptional(profileData.studentStatus as string | null | undefined);

    await registrationRef.set({
      eventId,
      eventSlug: event.slug ?? null,
      eventTitle: event.title,
      userId: uid ?? adHocUid,
      role,
      englishName,
      chineseName,
      studentId,
      department,
      nationality,
      birthday,
      gender,
      studentStatus,
      email,
      paymentMethod: null,
      paymentProofUrl: null,
      adHocRegistration: isAdHocRegistration,
      autoAssignedByRole: role === 'admin' || role === 'developer' || role === 'organizer',
      status: 'accepted',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      created: true,
      registrationId: registrationRef.id,
    });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
