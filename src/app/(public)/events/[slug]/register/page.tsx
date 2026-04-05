import { EventRegisterClient } from '@/components/public/EventRegisterClient';

type EventRegisterPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventRegisterPage({ params }: EventRegisterPageProps) {
  const { slug } = await params;
  return <EventRegisterClient slug={slug} />;
}
