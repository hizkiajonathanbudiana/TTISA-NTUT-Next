'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { useTranslation } from '@/providers/LanguageProvider';
import { getAuthErrorMessage } from '@/lib/firebase/errorMessages';
import { clientEnv } from '@/lib/env.client';

const schema = z.object({ email: z.string().email() });
type ResetForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: ResetForm) => {
    try {
      await sendPasswordResetEmail(firebaseAuth, values.email, {
        url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/update-password`,
        handleCodeInApp: true,
      });
      setSuccess(true);
      toast.success(t('auth.resetSuccessTitle'));
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error, 'Failed to send reset email.'));
    }
  };

  return (
    <div className="rounded-3xl border border-white/20 bg-white/60 p-8 shadow-2xl backdrop-blur-2xl">
      {success ? (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">{t('auth.resetSuccessTitle')}</h2>
          <p className="text-sm text-text-secondary">{t('auth.resetSuccessText')}</p>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            &larr; {t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">{t('auth.forgotPasswordTitle')}</p>
          <h1 className="mt-2 text-3xl font-black text-text-primary">{t('auth.forgotPasswordTitle')}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t('auth.forgotPasswordSubtitle')}</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="text-sm font-semibold text-text-primary">{t('auth.emailLabel')}</label>
              <input
                type="email"
                className="mt-2 w-full rounded-2xl border-2 border-transparent bg-white/70 px-4 py-3 text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="name@email.com"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-system-danger">{errors.email.message}</p>}
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-text-primary py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-neutral-800"
            >
              {t('auth.sendResetLinkButton')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {t('auth.backToLogin')}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
