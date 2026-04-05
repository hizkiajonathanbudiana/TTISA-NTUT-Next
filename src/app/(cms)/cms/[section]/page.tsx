import { notFound } from 'next/navigation';
import { CmsSectionRenderer } from '@/components/cms/CmsSectionRenderer';
import { CMS_RESOURCE_MAP, type CmsResourceKey } from '@/lib/cms/resources';

export default async function CmsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const resource = CMS_RESOURCE_MAP[section as CmsResourceKey];

  if (!resource) {
    notFound();
  }

  return <CmsSectionRenderer section={section as CmsResourceKey} />;
}
