'use client';

import { CMS_RESOURCE_MAP, type CmsResourceKey } from '@/lib/cms/resources';
import { CollectionManager } from './CollectionManager';

export const CmsSectionRenderer = ({ section }: { section: CmsResourceKey }) => {
  const resource = CMS_RESOURCE_MAP[section];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-black text-text-primary">{resource.title}</h1>
        <p className="mt-2 max-w-3xl text-text-secondary">{resource.description}</p>
      </div>
      <CollectionManager resourceKey={section} />
    </div>
  );
};
