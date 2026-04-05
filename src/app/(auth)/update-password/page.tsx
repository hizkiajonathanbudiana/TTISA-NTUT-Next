'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { confirmPasswordReset } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { useTranslation } from '@/providers/LanguageProvider';
import { getAuthErrorMessage } from '@/lib/firebase/errorMessages';

const schema = z
  .object({
    password: z.string().min(6),
    confirm: z.string().min(6),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords must match',
    path: ['confirm'],
  });

type UpdateForm = z.infer<typeof schema>;

function UpdatePasswordContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const oobCode = params.get('oobCode');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: UpdateForm) => {
    if (!oobCode) {
      toast.error('Reset code missing.');
      return;
    }
    try {
      setPending(true);
      await confirmPasswordReset(firebaseAuth, oobCode, values.password);
      toast.success('Password updated. Please sign in.');
      router.replace('/login');
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error, 'Failed to update password.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">{t('auth.updatePasswordTitle')}</p>
      <h1 className="mt-2 text-3xl font-black text-text-primary">{t('auth.updatePasswordTitle')}</h1>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="text-sm font-semibold text-text-primary">{t('auth.newPasswordLabel')}</label>
          <input
            type="password"
            className="mt-2 w-full rounded-2xl border-2 border-transparent bg-white/70 px-4 py-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-xs text-system-danger">{errors.password.message}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold text-text-primary">{t('auth.confirmPasswordLabel')}</label>
          <input
            type="password"
            className="mt-2 w-full rounded-2xl border-2 border-transparent bg-white/70 px-4 py-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            {...register('confirm')}
          />
          {errors.confirm && <p className="mt-1 text-xs text-system-danger">{errors.confirm.message}</p>}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-text-primary py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t('profile.savingButton') : t('auth.savePasswordButton')}
        </button>
      </form>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-white/20 bg-white/60 px-8 py-12 text-center shadow-2xl backdrop-blur-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">Loading</p>
          <p className="mt-2 text-text-secondary">Preparing secure password reset...</p>
        </div>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  );
}
