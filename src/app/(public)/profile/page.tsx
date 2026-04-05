'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { RoleGate } from '@/components/auth/RoleGate';
import { LoadingHamster } from '@/components/public/LoadingHamster';
import {
  demoteUserRole,
  fetchFullProfile,
  fetchUserRegistrations,
  upsertUserProfile,
  type UserRegistrationPage,
} from '@/lib/data/profile';
import type { UserEventRegistration, UserProfileDetails, ProfileGender } from '@/types/content';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslation } from '@/providers/LanguageProvider';

const PAGE_SIZE = 3;
const STUDENT_STATUS_OPTIONS = ['本國生', '僑生', '陸生', '外籍生', 'exchange_student'] as const;

const profileFormSchema = z.object({
  englishName: z.string().optional(),
  chineseName: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  birthDate: z.string().optional(),
  gender: z.enum(['male', 'female', 'rather_not_say']).optional().or(z.literal('')),
  studentStatus: z.enum(STUDENT_STATUS_OPTIONS).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const statusStyles: Record<UserEventRegistration['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const normalizeText = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapProfileToDefaults = (profile: UserProfileDetails | null): ProfileFormValues => ({
  englishName: profile?.englishName ?? '',
  chineseName: profile?.chineseName ?? '',
  department: profile?.department ?? '',
  nationality: profile?.nationality ?? '',
  studentId: profile?.studentId ?? '',
  birthDate: profile?.birthDate ?? '',
  gender: profile?.gender ?? '',
  studentStatus: profile?.studentStatus ?? '',
});

const toProfileDetails = (values: ProfileFormValues): UserProfileDetails => ({
  englishName: normalizeText(values.englishName ?? null),
  chineseName: normalizeText(values.chineseName ?? null),
  department: values.department.trim(),
  nationality: values.nationality.trim(),
  studentId: values.studentId.trim(),
  birthDate: normalizeText(values.birthDate ?? null),
  gender: (values.gender || null) as ProfileGender | null,
  studentStatus: (values.studentStatus || null) as UserProfileDetails['studentStatus'],
});

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'events'>('details');
  const [isEditing, setIsEditing] = useState(false);

  const {
    data: profileData,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ['full-profile', user?.uid],
    queryFn: () => fetchFullProfile(user!.uid),
    enabled: Boolean(user?.uid),
    staleTime: 1000 * 60,
  });

  const profile = profileData?.profile ?? null;
  const role = profileData?.role ?? 'member';
  const email = profileData?.email ?? user?.email ?? '';

  const profileMutation = useMutation({
    mutationFn: (values: UserProfileDetails) => upsertUserProfile(user!.uid, values),
    onSuccess: async () => {
      toast.success(t('profile.updateSuccess'));
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['full-profile', user?.uid] });
    },
    onError: () => toast.error(t('profile.updateError')),
  });

  const demoteMutation = useMutation({
    mutationFn: () => demoteUserRole(user!.uid),
    onSuccess: async () => {
      toast.success(t('profile.demote.success'));
      await queryClient.invalidateQueries({ queryKey: ['full-profile', user?.uid] });
      router.push('/');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to update role.');
    },
  });

  const handleDemote = useCallback(() => {
    if (demoteMutation.isPending) return;
    if (window.confirm(t('profile.demote.confirm'))) {
      demoteMutation.mutate();
    }
  }, [demoteMutation, t]);

  const showForm = isEditing || !profile;
  const privilegedRoles: Array<CmsRoleSubset> = ['admin', 'developer', 'organizer'];

  return (
    <RoleGate
      allowedRoles={['admin', 'developer', 'organizer', 'member']}
      fallback={<div className="py-20"><LoadingHamster /></div>}
    >
      <div className="relative min-h-screen overflow-hidden px-4 pb-20 pt-24">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute left-[10%] top-[5%] h-64 w-64 rounded-full bg-accent-blue blur-[120px] sm:h-80 sm:w-80" />
          <div className="absolute bottom-[10%] right-[8%] h-64 w-64 rounded-full bg-accent-green blur-[120px] sm:h-80 sm:w-80" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 mx-auto w-full max-w-5xl rounded-3xl border border-white/20 bg-white/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-10"
        >
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-primary/70">TTISA</p>
            <h1 className="mt-4 text-3xl font-black text-text-primary sm:text-4xl">{t('profile.pageTitle')}</h1>
            <p className="mt-3 text-base text-text-secondary">{t('profile.subtitle')}</p>
          </div>

          <div className="mt-10 border-b border-white/30">
            <nav className="flex flex-wrap justify-center gap-3 text-sm font-semibold">
              {(['details', 'events'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 tracking-wide transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                    activeTab === tab
                      ? 'bg-primary text-white shadow'
                      : 'bg-white/60 text-text-secondary hover:bg-white/80 hover:text-text-primary'
                  }`}
                >
                  {t(`profile.tabs.${tab}`)}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-10">
            {activeTab === 'details' && (
              <div>
                {profileLoading ? (
                  <LoadingHamster />
                ) : showForm ? (
                  <ProfileForm
                    emailSeed={email}
                    profile={profile}
                    isSubmitting={profileMutation.isPending}
                    onSubmit={(values) => profileMutation.mutate(values)}
                    onCancel={() => {
                      if (profile) {
                        setIsEditing(false);
                      }
                    }}
                  />
                ) : (
                  profile && (
                    <ProfileDetailsView
                      email={email}
                      role={role}
                      profile={profile}
                      onEdit={() => setIsEditing(true)}
                    />
                  )
                )}

                {privilegedRoles.includes(role as CmsRoleSubset) && !showForm && (
                  <div className="mt-12 rounded-2xl border border-red-200/40 bg-red-50/40 p-6">
                    <h3 className="text-xl font-semibold text-system-danger">{t('profile.demote.title')}</h3>
                    <p className="mt-2 text-sm text-text-secondary">{t('profile.demote.description')}</p>
                    <button
                      type="button"
                      onClick={handleDemote}
                      disabled={demoteMutation.isPending}
                      className="mt-6 rounded-lg border border-system-danger px-4 py-2 text-sm font-semibold text-system-danger transition hover:bg-system-danger hover:text-white disabled:opacity-50"
                    >
                      {demoteMutation.isPending ? 'Processing…' : t('profile.demote.button')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'events' && user?.uid && <MyEventsList userId={user.uid} />}
          </div>
        </motion.div>
      </div>
    </RoleGate>
  );
}

type CmsRoleSubset = 'admin' | 'developer' | 'organizer';

function ProfileDetailsView({
  profile,
  email,
  role,
  onEdit,
}: {
  profile: UserProfileDetails;
  email: string;
  role: string;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="flex flex-col gap-8 rounded-2xl border border-white/30 bg-white/40 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-text-secondary">{role}</p>
      </div>
      <div className="md:col-span-2 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <ProfileField label="Email" value={email || '—'} />
          <ProfileField label={t('profile.englishNameLabel')} value={profile.englishName ?? '—'} />
          <ProfileField label={t('profile.chineseNameLabel')} value={profile.chineseName ?? '—'} />
          <ProfileField label={t('profile.departmentLabel')} value={profile.department ?? '—'} />
          <ProfileField label={t('profile.nationalityLabel')} value={profile.nationality ?? '—'} />
          <ProfileField label={t('profile.studentIdLabel')} value={profile.studentId ?? '—'} />
          <ProfileField label={t('profile.birthdayLabel')} value={profile.birthDate ?? '—'} />
          <ProfileField
            label={t('profile.studentStatusLabel')}
            value={
              profile.studentStatus === 'exchange_student'
                ? t('profile.studentStatusExchange')
                : profile.studentStatus ?? '—'
            }
          />
          <ProfileField label={t('profile.genderLabel')} value={profile.gender?.replace('_', ' ') ?? '—'} />
        </div>
        <div className="text-right">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-primary px-6 py-2 font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5"
          >
            {t('profile.editButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileForm({
  profile,
  emailSeed,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  profile: UserProfileDetails | null;
  emailSeed: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: UserProfileDetails) => void;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    control,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: mapProfileToDefaults(profile),
  });

  useEffect(() => {
    reset(mapProfileToDefaults(profile));
  }, [profile, reset]);

  const submitHandler = (values: ProfileFormValues) => {
    onSubmit(toProfileDetails(values));
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-8">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('profile.englishNameLabel')}
            error={errors.englishName?.message}
            inputProps={{ ...register('englishName') }}
            />
            <Field
              label={t('profile.chineseNameLabel')}
              error={errors.chineseName?.message}
              inputProps={{ ...register('chineseName') }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('profile.departmentLabel')}
              error={errors.department?.message}
              inputProps={{ ...register('department') }}
            />
            <Field
              label={t('profile.nationalityLabel')}
              error={errors.nationality?.message}
              inputProps={{ ...register('nationality') }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('profile.studentIdLabel')}
              error={errors.studentId?.message}
              inputProps={{ ...register('studentId') }}
            />
            <Field
              label={t('profile.birthdayLabel')}
              error={errors.birthDate?.message}
              inputProps={{ ...register('birthDate'), type: 'date' }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('profile.genderLabel')} error={errors.gender?.message}>
              <select {...register('gender')} className="mt-1 w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none">
                <option value="">{t('profile.selectGender')}</option>
                <option value="male">{t('profile.genderMale')}</option>
                <option value="female">{t('profile.genderFemale')}</option>
                <option value="rather_not_say">{t('profile.genderRatherNotSay')}</option>
              </select>
            </Field>
            <Field label={t('profile.studentStatusLabel')} error={errors.studentStatus?.message}>
              <select {...register('studentStatus')} className="mt-1 w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none">
                <option value="">{t('profile.selectStudentStatus')}</option>
                <option value="本國生">Local Student</option>
                <option value="僑生">Overseas Chinese Student</option>
                <option value="外籍生">International Student</option>
                <option value="exchange_student">Exchange Student</option>
              </select>
            </Field>
          </div>
        </div>
      <div className="flex flex-wrap justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/40 px-6 py-2.5 font-semibold text-text-secondary transition hover:bg-white/60"
        >
          {t('profile.cancelButton')}
        </button>
        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          {isSubmitting ? t('profile.savingButton') : t('profile.saveButton')}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  inputProps,
}: {
  label: string;
  error?: string;
  children?: ReactNode;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className="flex flex-col text-sm font-medium text-text-secondary">
      {label}
      {children ?? (
        <input
          {...inputProps}
          className="mt-1 w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
        />
      )}
      {error && <span className="mt-1 text-xs text-system-danger">{error}</span>}
    </label>
  );
}

function ProfileField({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-text-secondary">{label}</p>
      <p className="mt-2 text-lg font-semibold text-text-primary">{value || '—'}</p>
    </div>
  );
}

function MyEventsList({ userId }: { userId: string }) {
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['user-registrations', userId],
    queryFn: ({ pageParam = null }) => fetchUserRegistrations(userId, PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: null as Date | null,
  });

  const registrations = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const handleShowLess = () => {
    queryClient.setQueryData(['user-registrations', userId], (existing: InfiniteData<UserRegistrationPage> | undefined) => {
      if (!existing) return existing;
      return {
        ...existing,
        pages: existing.pages.slice(0, 1),
        pageParams: existing.pageParams.slice(0, 1),
      } satisfies InfiniteData<UserRegistrationPage>;
    });
  };

  if (isLoading) {
    return <LoadingHamster />;
  }

  if (registrations.length === 0) {
    return <p className="text-center text-text-secondary">{t('profile.events.noRegistrations')}</p>;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/50">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.3em] text-text-secondary">
              <th className="px-6 py-4">{t('profile.events.title')}</th>
              <th className="px-6 py-4">{t('profile.events.registrationDate')}</th>
              <th className="px-6 py-4">{t('profile.events.status')}</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((reg) => {
              const translatedTitle =
                language === 'zh-HANT' && reg.eventTitle ? reg.eventTitle : reg.eventTitle ?? '—';
              return (
                <tr key={reg.id} className="border-t border-white/30 text-text-primary">
                  <td className="px-6 py-4 font-semibold">
                    {reg.eventSlug ? (
                      <Link href={`/events/${reg.eventSlug}`} className="hover:underline">
                        {translatedTitle}
                      </Link>
                    ) : (
                      translatedTitle
                    )}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{reg.createdAt.toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[reg.status]}`}>
                      {t(`profile.events.${reg.status}`)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-center gap-4 border-t border-white/20 px-6 py-6">
        {hasNextPage && (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-primary/30 transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Show More'}
          </button>
        )}
        {data && data.pages.length > 1 && (
          <button
            type="button"
            onClick={handleShowLess}
            className="rounded-full border border-white/40 px-6 py-2 text-sm font-semibold text-text-secondary transition hover:bg-white/60"
          >
            Show Less
          </button>
        )}
      </div>
    </div>
  );
}
