import type { Metadata } from 'next';
import { EventDetailClient } from '@/components/public/EventDetailClient';
import { adminDb } from '@/lib/firebase/admin';

interface EventDetailParams {
  params: Promise<{ slug: string }>;
}

const fetchEventPreview = async (slug: string) => {
  if (!adminDb) {
    console.warn('Skipping event metadata lookup because Firebase Admin is not configured.');
    return null;
  }
  try {
    const snapshot = await adminDb
      .collection('cms_events')
      .where('slug', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      title: data.title as string | undefined,
      summary: (data.summary ?? data.description) as string | undefined,
      coverImageUrl: (data.coverImageUrl ?? data.heroImageUrl) as string | undefined,
    };
  } catch (error) {
    console.warn('Failed to load event metadata', error);
    return null;
  }
};

export async function generateMetadata({ params }: EventDetailParams): Promise<Metadata> {
  const { slug } = await params;
  const preview = await fetchEventPreview(slug);
  const title = preview?.title ?? 'Event not found';
  const description = preview?.summary ?? 'Discover student-led events hosted by TTISA NTUT.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: preview?.coverImageUrl ? [{ url: preview.coverImageUrl }] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: EventDetailParams) {
  const { slug } = await params;
  return <EventDetailClient slug={slug} />;
}
