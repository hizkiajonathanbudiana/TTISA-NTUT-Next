'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/providers/LanguageProvider';
import { useQuery } from '@tanstack/react-query';
import { fetchSocialLinks } from '@/lib/data/publicContent';

type SocialPlatform = 'email' | 'instagram' | 'line' | 'facebook' | 'linkedin' | 'generic';

const Icon = ({ path, className = 'w-6 h-6', viewBox = '0 0 24 24' }: { path: string; className?: string; viewBox?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const iconPaths: Record<SocialPlatform, string> = {
  email: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm4.905-3.021c-.965 0-1.75.785-1.75 1.75s.785 1.75 1.75 1.75 1.75-.785 1.75-1.75-.785-1.75-1.75-1.75z',
  line: 'M21.928 4.832a2.221 2.221 0 0 0-1.89-1.218c-1.28-.15-3.886-.41-6.038-.41-4.737 0-7.314 1.34-8.683 2.503-1.833 1.545-2.28 3.493-2.28 4.868 0 1.28.32 3.14 1.63 4.542 1.096 1.168 2.68 1.83 4.267 1.83h.098c.502 0 .97-.132 1.37-.382l.14-.09.117.158c.28.396.6.76.96.108l2.22-2.25c.34-.34.5-.78.5-1.24v-1.61h.06c2.825 0 4.21-1.31 4.79-2.19.72-1.11.83-2.25.83-2.88.01-1.4-.4-2.82-2.008-3.56z',
  facebook: 'M16.023 9.348h4.992v-3.713h-4.992v-2.31c0-1.03.278-1.734 1.762-1.734h2.983V.065C20.174.043 18.91 0 17.523 0 14.61 0 12.523 1.7 12.523 4.783v3.832H9.01v3.713h3.513V24h4.49z',
  linkedin: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zm-11 19H5V8h3v11zm-1.5-13.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM21 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z',
  generic: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
};

const SocialIcon = ({ platform }: { platform: SocialPlatform }) => (
  <Icon path={iconPaths[platform] ?? iconPaths.generic} className="w-5 h-5 flex-shrink-0" />
);

export const Footer = () => {
  const { t } = useTranslation();
  const { data: socialLinks } = useQuery({
    queryKey: ['social_links'],
    queryFn: fetchSocialLinks,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <footer className="bg-card-bg border-t border-border">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="md:col-span-1 flex flex-col items-center md:items-start">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image src="/ttisa-logo.png" alt="TTISA Logo" width={32} height={32} className="h-8 w-8" />
              <span className="text-xl font-bold text-primary">TTISA NTUT</span>
            </Link>
            <p className="text-text-secondary text-sm max-w-xs">{t('footer.description')}</p>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <h3 className="font-bold text-text-primary mb-4">{t('footer.contactTitle')}</h3>
            <div className="flex flex-col items-center md:items-start space-y-3 text-sm">
              {socialLinks?.map((link) => (
                <a
                  key={link.id}
                  href={link.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-text-secondary transition-colors hover:text-primary"
                >
                  <SocialIcon platform={(link.platform ?? 'generic') as SocialPlatform} />
                  <span>{link.label}</span>
                </a>
              ))}
              {!socialLinks?.length && (
                <p className="text-xs text-text-secondary">Social links will appear here soon.</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6 text-center text-sm text-text-secondary">
          <p>&copy; {new Date().getFullYear()} TTISA NTUT. {t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};
