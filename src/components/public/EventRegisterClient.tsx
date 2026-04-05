'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { User } from 'firebase/auth';
import { useAuth } from '@/providers/AuthProvider';
import { uploadCmsAsset } from '@/lib/firebase/storage';
import { LoadingHamster } from '@/components/public/LoadingHamster';

type FormPayload = {
  englishName: string;
  chineseName: string;
  department: string;
  nationality: string;
  studentId: string;
  birthday: string;
  gender: 'male' | 'female' | 'rather_not_say';
  studentStatus: '本國生' | '僑生' | '陸生' | '外籍生' | 'exchange_student';
  paymentMethod: 'cash' | 'transfer';
};

type FormLanguage = 'en' | 'zh-HANT';

type UiText = {
  titleSuffix: string;
  intro: string;
  status: string;
  statusPending: string;
  statusAccepted: string;
  statusRejected: string;
  statusLocked: string;
  genderMale: string;
  genderFemale: string;
  genderRatherNotSay: string;
  requiredField: string;
  requiredGender: string;
  requiredStudentStatus: string;
  englishName: string;
  chineseName: string;
  department: string;
  nationality: string;
  studentId: string;
  birthday: string;
  gender: string;
  studentStatus: string;
  payment: string;
  cash: string;
  transfer: string;
  uploadHint: string;
  viewProof: string;
  uploadProof: string;
  methodsTitle: string;
  methodsSubtitle: string;
  noMethods: string;
  contactsTitle: string;
  contactsSubtitle: string;
  noContacts: string;
  back: string;
  submit: string;
  submitting: string;
  locked: string;
  eventInfo: string;
  eventLocation: string;
  eventTime: string;
  eventPrice: string;
  free: string;
  noDescription: string;
  loginRequiredTitle: string;
  loginRequiredDescription: string;
  continueWithGoogle: string;
  shareFormLabel: string;
  shareFormQrLabel: string;
  shareFormSaveQr: string;
  shareCopied: string;
};

type PublicEventPayload = {
  event: RegistrationFormResponse['event'];
  paymentInstructions: RegistrationFormResponse['paymentMethods'];
  proofContacts: RegistrationFormResponse['proofContacts'];
};

type RegistrationFormResponse = {
  event: {
    id: string;
    slug: string;
    title: string;
    titleZhHant?: string | null;
    summary?: string | null;
    summaryZhHant?: string | null;
    description?: string | null;
    descriptionZhHant?: string | null;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isPaid: boolean;
    price: number | null;
  };
  profile: Partial<FormPayload>;
  registration: (Partial<FormPayload> & {
    id: string;
    status: 'pending' | 'accepted' | 'rejected';
    statusLabelEn?: string;
    statusLabelZhHant?: string;
    paymentProofUrl?: string | null;
  }) | null;
  canEdit: boolean;
  paymentMethods: Array<{
    id: string;
    methodName: string;
    instructionsEn: string;
    instructionsZhHant: string;
  }>;
  proofContacts: Array<{
    id: string;
    platform: string;
    contactInfo: string;
  }>;
};

const withAuthHeaders = async (user: User | null): Promise<HeadersInit> => {
  if (!user) {
    throw new Error('Please sign in to continue.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const fetchRegistrationForm = async (slug: string, user: User | null): Promise<RegistrationFormResponse> => {
  const headers = await withAuthHeaders(user);
  const response = await fetch(`/api/events/${slug}/registration`, {
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const reason = typeof payload.error === 'string' ? payload.error : 'Unable to load registration form.';
    throw new Error(reason);
  }

  return response.json() as Promise<RegistrationFormResponse>;
};

const saveRegistrationForm = async (
  slug: string,
  user: User | null,
  body: FormPayload & { paymentProofUrl?: string | null },
) => {
  const headers = await withAuthHeaders(user);
  const response = await fetch(`/api/events/${slug}/registration`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const reason = typeof payload.error === 'string' ? payload.error : 'Unable to submit registration.';
    throw new Error(reason);
  }

  return response.json() as Promise<{ canEdit: boolean }>;
};

const fetchPublicEvent = async (slug: string): Promise<PublicEventPayload> => {
  const response = await fetch(`/api/events/${slug}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const reason = typeof payload.error === 'string' ? payload.error : 'Unable to load event data.';
    throw new Error(reason);
  }

  const payload = await response.json();
  return {
    event: payload.event,
    paymentInstructions: payload.paymentInstructions ?? [],
    proofContacts: payload.proofContacts ?? [],
  } satisfies PublicEventPayload;
};

const genderOptions = ['male', 'female', 'rather_not_say'] as const;

const studentStatusOptions = [
  { value: '本國生', en: 'Local Student', zh: '本國生' },
  { value: '僑生', en: 'Overseas Chinese Student', zh: '僑生' },
  { value: '外籍生', en: 'International Student', zh: '外籍生' },
  { value: 'exchange_student', en: 'Exchange Student', zh: '交換生' },
] as const;

const formatContact = (platform: string, info: string) => {
  const value = info.trim();
  if (!value) return value;

  if (platform === 'email') {
    return value.toLowerCase().startsWith('mailto:') ? value : `mailto:${value}`;
  }

  if (platform === 'line') {
    const lower = value.toLowerCase();
    if (lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('line://')) return value;
    if (lower.startsWith('line.me/')) return `https://${value}`;
    return `https://line.me/ti/p/~${value.replace(/^@/, '')}`;
  }

  if (platform === 'instagram') {
    const lower = value.toLowerCase();
    if (lower.startsWith('https://') || lower.startsWith('http://')) return value;
    return `https://instagram.com/${value.replace(/^@/, '')}`;
  }

  return value;
};

const uiText: Record<FormLanguage, UiText> = {
  en: {
    titleSuffix: 'Registration',
    intro: 'Fill this form to register. Submitted data also updates your profile.',
    status: 'Current status',
    statusPending: 'Pending',
    statusAccepted: 'Accepted',
    statusRejected: 'Rejected',
    statusLocked: '(editing disabled)',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderRatherNotSay: 'Prefer not to say',
    requiredField: 'This field is required.',
    requiredGender: 'Please select a gender.',
    requiredStudentStatus: 'Please select a student status.',
    englishName: 'English Name',
    chineseName: 'Chinese Name',
    department: 'Department',
    nationality: 'Nationality',
    studentId: 'Student ID',
    birthday: 'Birthday',
    gender: 'Gender',
    studentStatus: 'Student Status',
    payment: 'Payment',
    cash: 'Cash',
    transfer: 'Transfer',
    uploadHint: 'Upload proof of payment (image/camera).',
    viewProof: 'View uploaded proof',
    uploadProof: 'Upload Proof',
    methodsTitle: 'Payment Methods',
    methodsSubtitle: 'payment method options.',
    noMethods: 'No payment methods found.',
    contactsTitle: 'Contacts',
    contactsSubtitle: 'contact information',
    noContacts: 'No proof contacts found.',
    back: 'Back to event',
    submit: 'Submit',
    submitting: 'Submitting...',
    locked: 'Locked',
    eventInfo: 'Event Information',
    eventLocation: 'Location',
    eventTime: 'Time',
    eventPrice: 'Price',
    free: 'Free',
    noDescription: 'No additional description.',
    loginRequiredTitle: 'Sign in required to edit this form',
    loginRequiredDescription: 'You can review all event and payment details now. Sign in with Google to fill and submit the registration form.',
    continueWithGoogle: 'Continue with Google',
    shareFormLabel: 'Share this form',
    shareFormQrLabel: 'Scan QR to open registration form',
    shareFormSaveQr: 'Save QR',
    shareCopied: 'Link copied!',
  },
  'zh-HANT': {
    titleSuffix: '報名表',
    intro: '請填寫報名資料。送出後也會同步更新你的個人資料。',
    status: '目前狀態',
    statusPending: '審核中',
    statusAccepted: '已通過',
    statusRejected: '已拒絕',
    statusLocked: '（不可再編輯）',
    genderMale: '男性',
    genderFemale: '女性',
    genderRatherNotSay: '不願透露',
    requiredField: '此欄位為必填。',
    requiredGender: '請選擇性別。',
    requiredStudentStatus: '請選擇學生身分。',
    englishName: '英文姓名',
    chineseName: '中文姓名',
    department: '系所',
    nationality: '國籍',
    studentId: '學號',
    birthday: '生日',
    gender: '性別',
    studentStatus: '學生身分',
    payment: '付款方式',
    cash: '現金',
    transfer: '轉帳',
    uploadHint: '請上傳付款證明（可使用相機或圖片）。',
    viewProof: '查看已上傳證明',
    uploadProof: '上傳證明',
    methodsTitle: '付款方式說明',
    methodsSubtitle: '付款方式選項。',
    noMethods: '目前沒有付款方式資料。',
    contactsTitle: '聯絡資訊',
    contactsSubtitle: '聯絡資訊。',
    noContacts: '目前沒有證明聯絡方式。',
    back: '返回活動頁',
    submit: '送出',
    submitting: '送出中...',
    locked: '已鎖定',
    eventInfo: '活動資訊',
    eventLocation: '地點',
    eventTime: '時間',
    eventPrice: '費用',
    free: '免費',
    noDescription: '目前沒有更多活動說明。',
    loginRequiredTitle: '需先登入才能填寫',
    loginRequiredDescription: '你現在可以先查看活動與付款資訊，登入 Google 後即可填寫並送出報名表。',
    continueWithGoogle: '使用 Google 繼續',
    shareFormLabel: '分享報名表',
    shareFormQrLabel: '掃描 QR 開啟報名表',
    shareFormSaveQr: '儲存 QR',
    shareCopied: '連結已複製！',
  },
};

const formatEventDateRange = (start?: string | null, end?: string | null) => {
  if (!start) return 'TBA';
  const startDate = new Date(start);
  const startLabel = startDate.toLocaleString();
  if (!end) return startLabel;
  const endDate = new Date(end);
  return `${startLabel} - ${endDate.toLocaleString()}`;
};

export const EventRegisterClient = ({ slug }: { slug: string }) => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formLanguage, setFormLanguage] = useState<FormLanguage>('en');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [origin, setOrigin] = useState('');
  const [showShareQr, setShowShareQr] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const shareQrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormPayload>({
    defaultValues: {
      englishName: '',
      chineseName: '',
      department: '',
      nationality: '',
      studentId: '',
      birthday: '',
      gender: 'rather_not_say',
      studentStatus: '本國生',
      paymentMethod: 'cash',
    },
  });

  const formQuery = useQuery({
    queryKey: ['event-register-form', slug, user?.uid ?? 'anon'],
    queryFn: () => fetchRegistrationForm(slug, user ?? null),
    enabled: Boolean(user?.uid),
  });

  const publicEventQuery = useQuery({
    queryKey: ['event-register-public', slug],
    queryFn: () => fetchPublicEvent(slug),
  });

  useEffect(() => {
    if (!formQuery.data) return;

    const source = formQuery.data.registration ?? formQuery.data.profile;
    reset({
      englishName: source.englishName ?? '',
      chineseName: source.chineseName ?? '',
      department: source.department ?? '',
      nationality: source.nationality ?? '',
      studentId: source.studentId ?? '',
      birthday: source.birthday ?? '',
      gender: (source.gender as FormPayload['gender']) ?? 'rather_not_say',
      studentStatus: (source.studentStatus as FormPayload['studentStatus']) ?? '本國生',
      paymentMethod: (source.paymentMethod as FormPayload['paymentMethod']) ?? 'cash',
    });

    setProofUrl(formQuery.data.registration?.paymentProofUrl ?? null);
  }, [formQuery.data, reset]);

  const paymentMethod = watch('paymentMethod');
  const text = uiText[formLanguage];

  const submitMutation = useMutation({
    mutationFn: (values: FormPayload) =>
      saveRegistrationForm(slug, user ?? null, {
        ...values,
        paymentProofUrl: values.paymentMethod === 'transfer' ? proofUrl : null,
      }),
    onSuccess: async (_result, submittedValues) => {
      toast.success(
        formLanguage === 'zh-HANT'
          ? '報名已送出，個人資料也已同步更新。'
          : 'Registration submitted. Your profile data has also been updated.',
      );
      if (user?.uid) {
        queryClient.setQueryData(['full-profile', user.uid], (existing: any) => ({
          ...(existing ?? {}),
          profile: {
            ...(existing?.profile ?? {}),
            englishName: submittedValues.englishName,
            chineseName: submittedValues.chineseName,
            department: submittedValues.department,
            nationality: submittedValues.nationality,
            studentId: submittedValues.studentId,
            birthDate: submittedValues.birthday,
            gender: submittedValues.gender,
            studentStatus: submittedValues.studentStatus,
          },
          email: existing?.email ?? user.email ?? null,
        }));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-register-form', slug, user?.uid ?? 'anon'] }),
        queryClient.invalidateQueries({ queryKey: ['full-profile', user?.uid] }),
      ]);
      router.replace(`/events/${slug}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to submit registration.');
    },
  });

  const canEdit = formQuery.data?.canEdit ?? true;
  const status = formQuery.data?.registration?.status ?? null;

  const sourceData = user ? formQuery.data : publicEventQuery.data;
  const isLoading = user ? formQuery.isLoading : publicEventQuery.isLoading;
  const paymentInstructions = useMemo(
    () => (user ? formQuery.data?.paymentMethods ?? [] : publicEventQuery.data?.paymentInstructions ?? []),
    [formQuery.data?.paymentMethods, publicEventQuery.data?.paymentInstructions, user],
  );
  const proofContacts = useMemo(
    () => (user ? formQuery.data?.proofContacts ?? [] : publicEventQuery.data?.proofContacts ?? []),
    [formQuery.data?.proofContacts, publicEventQuery.data?.proofContacts, user],
  );
  const isFormLocked = !user || !canEdit;
  const formShareUrl = useMemo(() => {
    const path = `/events/${slug}/register`;
    return origin ? `${origin}${path}` : path;
  }, [origin, slug]);

  const onUploadProof = async (file: File) => {
    if (!user) return;

    setIsUploadingProof(true);
    const toastId = toast.loading(formLanguage === 'zh-HANT' ? '正在上傳付款證明...' : 'Uploading proof...');
    try {
      const uploadedUrl = await uploadCmsAsset(file, {
        folder: `payment-proofs/${slug}/${user.uid}`,
      });
      setProofUrl(uploadedUrl);
      toast.success(formLanguage === 'zh-HANT' ? '已上傳付款證明。' : 'Proof uploaded.', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : formLanguage === 'zh-HANT' ? '上傳失敗。' : 'Upload failed.', { id: toastId });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const onSubmit = (values: FormPayload) => {
    if (!canEdit) {
      toast.error(formLanguage === 'zh-HANT' ? '此報名狀態不可再編輯。' : 'Registration can no longer be edited.');
      return;
    }

    if (values.paymentMethod === 'transfer' && !proofUrl) {
      toast.error(formLanguage === 'zh-HANT' ? '轉帳請先上傳付款證明。' : 'Please upload payment proof for transfer.');
      return;
    }

    submitMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="container py-20 text-center">
        <LoadingHamster />
      </div>
    );
  }

  if ((user && (formQuery.isError || !formQuery.data)) || (!user && (publicEventQuery.isError || !publicEventQuery.data))) {
    return (
      <div className="container py-28 text-center">
        <p className="text-sm text-system-danger">
          {user
            ? formQuery.error instanceof Error
              ? formQuery.error.message
              : 'Unable to load form.'
            : publicEventQuery.error instanceof Error
            ? publicEventQuery.error.message
            : 'Unable to load event data.'}
        </p>
        <Link href={`/events/${slug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">← {text.back}</Link>
      </div>
    );
  }

  const statusEn = user ? formQuery.data?.registration?.statusLabelEn : undefined;
  const statusZh = user ? formQuery.data?.registration?.statusLabelZhHant : undefined;
  const eventData = sourceData?.event;
  const eventTitle =
    formLanguage === 'zh-HANT'
      ? eventData?.titleZhHant ?? eventData?.title ?? 'Event'
      : eventData?.title ?? 'Event';
  const eventDescription =
    formLanguage === 'zh-HANT'
      ? eventData?.descriptionZhHant ?? eventData?.summaryZhHant ?? eventData?.description ?? eventData?.summary
      : eventData?.description ?? eventData?.summary;
  const statusText =
    formLanguage === 'zh-HANT'
      ? statusZh ?? (status === 'accepted' ? text.statusAccepted : status === 'rejected' ? text.statusRejected : text.statusPending)
      : statusEn ?? (status === 'accepted' ? text.statusAccepted : status === 'rejected' ? text.statusRejected : text.statusPending);

  const handleShareForm = async () => {
    setShowShareQr(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${eventTitle} - ${text.titleSuffix}`,
          url: formShareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(formShareUrl);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2500);
    } catch (error) {
      console.warn('Share failed', error);
      toast.error(formLanguage === 'zh-HANT' ? '無法分享報名表。' : 'Unable to share this form.');
    }
  };

  const handleSaveFormQr = () => {
    const svg = shareQrRef.current?.querySelector('svg');
    if (!svg) {
      toast.error(formLanguage === 'zh-HANT' ? 'QR 尚未準備好。' : 'QR code is not ready yet.');
      return;
    }

    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `register-${slug}-qr.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-background pb-10 pt-10 md:pt-14">
      <div className="container max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="h-3 bg-primary" />
          <div className="px-6 py-6 md:px-10">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl font-bold text-text-primary">{eventTitle} - {text.titleSuffix}</h1>
              <div className="inline-flex items-center rounded-full bg-neutral-200 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFormLanguage('en')}
                  className={`rounded-full px-3 py-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${formLanguage === 'en' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-neutral-100'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setFormLanguage('zh-HANT')}
                  className={`rounded-full px-3 py-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${formLanguage === 'zh-HANT' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-neutral-100'}`}
                >
                  繁
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-text-secondary">{text.intro}</p>
            {!user && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">{text.loginRequiredTitle}</p>
                <p className="mt-1 text-sm text-amber-800">{text.loginRequiredDescription}</p>
                <button
                  type="button"
                  onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/events/${slug}/register`)}`)}
                  className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  {text.continueWithGoogle}
                </button>
              </div>
            )}
            {status && (
              <p className="mt-3 text-sm font-semibold text-text-primary">
                {text.status}: <span className="capitalize">{statusText}</span>
                {!canEdit && ` ${text.statusLocked}`}
              </p>
            )}
          </div>

          <div className="mx-6 mb-2 rounded-xl border border-border bg-neutral-50 p-4 md:mx-10">
            <h2 className="text-lg font-bold text-text-primary">{text.eventInfo}</h2>
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">
              {eventDescription ?? text.noDescription}
            </p>
            <div className="mt-3 grid gap-2 text-sm text-text-primary md:grid-cols-3">
              <p><span className="font-semibold">{text.eventLocation}:</span> {eventData?.location ?? 'TBA'}</p>
              <p><span className="font-semibold">{text.eventTime}:</span> {formatEventDateRange(eventData?.startDate, eventData?.endDate)}</p>
              <p>
                <span className="font-semibold">{text.eventPrice}:</span>{' '}
                {typeof eventData?.price === 'number' ? `NT$ ${eventData.price.toLocaleString()}` : text.free}
              </p>
            </div>
          </div>

          <div className="mx-6 mb-2 rounded-xl border border-border bg-white p-4 text-center md:mx-10">
            <button
              type="button"
              onClick={() => void handleShareForm()}
              className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {shareState === 'copied' ? text.shareCopied : text.shareFormLabel}
            </button>
            {showShareQr && (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">{text.shareFormQrLabel}</p>
                <div ref={shareQrRef} className="mt-3 flex justify-center">
                  <QRCodeSVG value={formShareUrl} size={140} />
                </div>
                <button
                  type="button"
                  onClick={handleSaveFormQr}
                  className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary hover:text-primary"
                >
                  {text.shareFormSaveQr}
                </button>
              </>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 pb-8 md:px-10">
            <Field label={text.englishName} error={errors.englishName?.message}>
              <input {...register('englishName', { required: text.requiredField })} disabled={isFormLocked} className="w-full rounded-xl border border-border bg-white p-3 disabled:cursor-not-allowed disabled:bg-neutral-100" />
            </Field>
            <Field label={text.chineseName} error={errors.chineseName?.message}>
              <input {...register('chineseName', { required: text.requiredField })} disabled={isFormLocked} className="w-full rounded-xl border border-border bg-white p-3 disabled:cursor-not-allowed disabled:bg-neutral-100" />
            </Field>
            <Field label={text.department} error={errors.department?.message}>
              <input {...register('department', { required: text.requiredField })} disabled={isFormLocked} className="w-full rounded-xl border border-border bg-white p-3 disabled:cursor-not-allowed disabled:bg-neutral-100" />
            </Field>
            <Field label={text.nationality} error={errors.nationality?.message}>
              <input {...register('nationality', { required: text.requiredField })} disabled={isFormLocked} className="w-full rounded-xl border border-border bg-white p-3 disabled:cursor-not-allowed disabled:bg-neutral-100" />
            </Field>
            <Field label={text.studentId} error={errors.studentId?.message}>
              <input {...register('studentId', { required: text.requiredField })} disabled={isFormLocked} className="w-full rounded-xl border border-border bg-white p-3 disabled:cursor-not-allowed disabled:bg-neutral-100" />
            </Field>
            <Field label={text.birthday} error={errors.birthday?.message}>
              <input type="date" {...register('birthday', { required: text.requiredField })} disabled={isFormLocked} className="w-full rounded-xl border border-border bg-white p-3 disabled:cursor-not-allowed disabled:bg-neutral-100" />
            </Field>
            <Field label={text.gender} error={errors.gender?.message}>
              <select {...register('gender', { required: text.requiredGender })} disabled={isFormLocked} className="w-full rounded-xl border border-border bg-white p-3 disabled:cursor-not-allowed disabled:bg-neutral-100">
                {genderOptions.map((item) => (
                  <option key={item} value={item}>
                    {item === 'male' ? text.genderMale : item === 'female' ? text.genderFemale : text.genderRatherNotSay}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={text.studentStatus} error={errors.studentStatus?.message}>
              <select {...register('studentStatus', { required: text.requiredStudentStatus })} disabled={isFormLocked} className="w-full rounded-xl border border-border bg-white p-3 disabled:cursor-not-allowed disabled:bg-neutral-100">
                {studentStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {formLanguage === 'zh-HANT' ? option.zh : option.en}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-xl border border-border bg-neutral-50 p-4">
              <h2 className="text-sm font-semibold text-text-primary">{text.payment}</h2>
              <div className="mt-3 grid gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" value="cash" {...register('paymentMethod')} disabled={isFormLocked} />
                  {text.cash}
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" value="transfer" {...register('paymentMethod')} disabled={isFormLocked} />
                  {text.transfer}
                </label>
              </div>

              {paymentMethod === 'transfer' && (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-4">
                  <p className="text-sm text-text-secondary">{text.uploadHint}</p>
                  {proofUrl && (
                    <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm font-semibold text-primary underline">
                      {text.viewProof}
                    </a>
                  )}
                  <label className="mt-3 inline-flex cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                    {isUploadingProof ? text.submitting : text.uploadProof}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={isUploadingProof || isFormLocked}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void onUploadProof(file);
                        }
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
              <h2 className="text-lg font-bold text-text-primary">{text.methodsTitle}</h2>
              <p className="text-sm text-text-secondary">{text.methodsSubtitle}</p>
              {paymentInstructions.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">{text.noMethods}</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {paymentInstructions.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-neutral-50 p-3">
                      <p className="font-semibold text-text-primary">{item.methodName}</p>
                      {(formLanguage === 'zh-HANT' ? item.instructionsZhHant : item.instructionsEn) && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                          {formLanguage === 'zh-HANT' ? item.instructionsZhHant : item.instructionsEn}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
              <h2 className="text-lg font-bold text-text-primary">{text.contactsTitle}</h2>
              <p className="text-sm text-text-secondary">{text.contactsSubtitle}</p>
              {proofContacts.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">{text.noContacts}</p>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  {proofContacts.map((item) => (
                    <a
                      key={item.id}
                      href={formatContact(item.platform, item.contactInfo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-border bg-neutral-50 p-3 text-text-primary hover:border-primary"
                    >
                      {item.platform}: {item.contactInfo}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Link href={`/events/${slug}`} className="text-sm font-semibold text-text-secondary hover:text-text-primary">
                ← {text.back}
              </Link>
              <button
                type="submit"
                disabled={isFormLocked || isSubmitting || submitMutation.isPending || isUploadingProof}
                className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitMutation.isPending ? text.submitting : isFormLocked ? text.locked : text.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-text-primary">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-system-danger">{error}</span>}
  </label>
);
