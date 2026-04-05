'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/providers/LanguageProvider';
import { fetchTeams } from '@/lib/data/publicContent';
import { LoadingHamster } from '@/components/public/LoadingHamster';

const heroAuras = [
  'absolute top-[5%] left-[10%] w-72 h-72 lg:w-96 lg:h-96 bg-accent-purple rounded-full filter blur-3xl animate-pulse',
  'absolute bottom-[10%] right-[5%] w-72 h-72 lg:w-96 lg:h-96 bg-accent-green rounded-full filter blur-3xl animate-pulse animation-delay-4000',
];

const ALLOWED_AVATAR_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'res.cloudinary.com',
  'lh3.googleusercontent.com',
  'api.dicebear.com',
]);

const AnimatedSection = ({ children }: { children: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.8, ease: 'easeOut' }}
  >
    {children}
  </motion.section>
);

const toSafeAvatarUrl = (value?: string | null) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (!ALLOWED_AVATAR_HOSTS.has(url.hostname)) return null;
    return value;
  } catch {
    return null;
  }
};

const getMemberAvatar = (fallback?: string | null) => toSafeAvatarUrl(fallback);

const getInitials = (name?: string | null) => {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'T';
  return trimmed[0]!.toUpperCase();
};

export default function TeamsPage() {
  const { t, language } = useTranslation();
  const {
    data: teams,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
  });

  if (error) {
    return (
      <div className="bg-background py-40 text-center text-system-danger">
        Error: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="bg-background">
      <section className="relative flex items-center justify-center overflow-hidden px-4 pb-20 pt-40 text-center">
        <div className="absolute inset-0 opacity-50">
          {heroAuras.map((className) => (
            <div key={className} className={className} />
          ))}
        </div>
        <div className="relative z-10 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-extrabold text-text-primary md:text-6xl"
          >
            {t('teams.pageTitle')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-4 text-lg text-text-secondary md:text-xl"
          >
            {t('teams.pageSubtitle')}
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 space-y-16">
        {isLoading ? (
          <div className="py-20 text-center">
            <LoadingHamster />
          </div>
        ) : teams && teams.length > 0 ? (
          teams.map((team) => {
            const teamName = language === 'zh-HANT' && team.nameZhHant ? team.nameZhHant : team.name;
            const teamDescription =
              language === 'zh-HANT' && team.descriptionZhHant ? team.descriptionZhHant : team.description;
            return (
              <AnimatedSection key={team.id}>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-primary">{teamName}</h2>
                  {teamDescription && (
                    <p className="mx-auto mt-2 max-w-2xl text-text-secondary">{teamDescription}</p>
                  )}
                </div>
                <div className="mt-12 flex flex-wrap justify-center gap-8">
                  {(team.members ?? []).map((member, index) => {
                    const position =
                      language === 'zh-HANT' && member.positionZhHant ? member.positionZhHant : member.positionEn;
                    const avatarUrl = getMemberAvatar(member.avatarUrl);
                    return (
                      <motion.div
                        key={member.id ?? `${team.id}-${index}`}
                        className="w-40 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                      >
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt={member.englishName ?? 'Team member'}
                            width={96}
                            height={96}
                            className="mx-auto h-24 w-24 rounded-full border-4 border-white/50 object-cover shadow-lg"
                            sizes="96px"
                          />
                        ) : (
                          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/50 bg-muted text-2xl font-bold text-text-primary shadow-lg">
                            {getInitials(member.englishName)}
                          </div>
                        )}
                        <h3 className="mt-3 font-bold text-text-primary">{member.englishName ?? 'TTISA Member'}</h3>
                        {position && <p className="text-sm font-semibold text-text-secondary">{position}</p>}
                      </motion.div>
                    );
                  })}
                </div>
                {(team.members?.length ?? 0) === 0 && (
                  <p className="mt-6 text-center text-sm text-text-secondary">No team members added yet.</p>
                )}
              </AnimatedSection>
            );
          })
        ) : (
          <p className="text-center text-text-secondary">No active teams found.</p>
        )}
      </div>
    </div>
  );
}
