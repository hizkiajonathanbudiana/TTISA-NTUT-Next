import { CmsShell } from '@/components/layout/CmsShell';

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return <CmsShell>{children}</CmsShell>;
}
