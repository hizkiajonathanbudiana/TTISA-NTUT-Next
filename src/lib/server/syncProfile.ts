import { requireAdminDb } from '@/lib/firebase/admin';

type SyncProfileUser = {
  uid: string;
  email?: string | null;
  name?: string | null;
};

const optionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const processSyncProfile = async (authUser: SyncProfileUser) => {
  const db = requireAdminDb();

  const cmsUserRef = db.collection('cms_users').doc(authUser.uid);
  const profileRef = db.collection('user_profiles').doc(authUser.uid);
  const cmsUserSnap = await cmsUserRef.get();
  const cmsUserData = cmsUserSnap.data() ?? {};

  const now = new Date();
  const fallbackName =
    optionalString(authUser.name) ?? optionalString(authUser.email?.split('@')[0]) ?? 'Member';

  await Promise.all([
    cmsUserRef.set(
      {
        uid: authUser.uid,
        email: optionalString(authUser.email) ?? null,
        englishName: optionalString(cmsUserData.englishName) ?? fallbackName,
        role: optionalString(cmsUserData.role) ?? 'member',
        updatedAt: now,
        createdAt: cmsUserSnap.exists ? cmsUserData.createdAt ?? now : now,
      },
      { merge: true },
    ),
    profileRef.set(
      {
        englishName: optionalString(cmsUserData.englishName) ?? fallbackName,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    ),
  ]);

  return { success: true };
};
