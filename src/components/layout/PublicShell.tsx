'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslation } from '@/providers/LanguageProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import { fetchUserProfile } from '@/lib/data/publicContent';
import { getAuthErrorMessage } from '@/lib/firebase/errorMessages';

const navItems = [
  { href: '/events', translationKey: 'nav.events' },
  { href: '/teams', translationKey: 'nav.teams' },
];

const getPublicPageTitle = (pathname: string) => {
  if (pathname === '/') return 'Home';
  if (pathname === '/events') return 'Events';
  if (/^\/events\/[^/]+\/register$/.test(pathname)) return 'Event Registration';
  if (/^\/events\/[^/]+$/.test(pathname)) return 'Event Details';
  if (pathname === '/teams') return 'Teams';
  if (pathname === '/profile') return 'Profile';
  if (pathname === '/login') return 'Login';
  if (pathname === '/forgot-password') return 'Forgot Password';
  if (pathname === '/update-password') return 'Update Password';
  if (pathname.startsWith('/checkin/')) return 'Check In';
  return 'TTISA NTUT';
};

export const PublicShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isRegisterFormPage = /^\/events\/[^/]+\/register$/.test(pathname ?? '');
  const { t } = useTranslation();
  const { user, signOut, signInWithGoogle } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const title = getPublicPageTitle(pathname ?? '/');
    document.title = title === 'TTISA NTUT' ? title : `${title} - TTISA NTUT`;
  }, [pathname]);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.uid],
    queryFn: () => fetchUserProfile(user!.uid),
    enabled: Boolean(user?.uid),
    staleTime: 1000 * 60 * 2,
  });

  const canAccessCms = userProfile?.role === 'admin' || userProfile?.role === 'developer';

  const navLinkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return clsx(
      'block md:inline-block px-3 py-2 rounded-md text-base font-medium no-underline transition-colors',
      isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary',
    );
  };

  const renderNavLinks = (onNavigate?: () => void) => (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className={navLinkClass(item.href)} onClick={onNavigate}>
          {t(item.translationKey)}
        </Link>
      ))}
      {user && (
        <Link href="/profile" className={navLinkClass('/profile')} onClick={onNavigate}>
          {t('nav.profile')}
        </Link>
      )}
      {canAccessCms && (
        <Link href="/cms" className={navLinkClass('/cms')} onClick={onNavigate}>
          {t('nav.cms')}
        </Link>
      )}
    </>
  );

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      setIsMenuOpen(false);
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Google sign-in failed.'));
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      {!isRegisterFormPage && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm">
          <nav className="mx-auto w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 no-underline">
                <Image src="/ttisa-logo.png" alt="TTISA Logo" width={32} height={32} priority className="h-8 w-8" />
                <span className="text-xl font-bold text-text-primary">TTISA NTUT</span>
              </Link>
              <div className="hidden md:flex items-center space-x-2">
                {renderNavLinks()}
                <div className="ml-4 flex items-center gap-4">
                  {user ? (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="appearance-none border-0 bg-transparent font-semibold text-system-danger transition-colors hover:text-red-700 focus-visible:outline-none"
                    >
                      {t('nav.logout')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="appearance-none border-0 bg-transparent font-semibold text-primary transition-colors hover:text-primary-hover"
                    >
                      {t('nav.login')}
                    </button>
                  )}
                  <LanguageSwitcher />
                </div>
              </div>
              <div className="md:hidden flex items-center gap-4">
                <LanguageSwitcher />
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="appearance-none border-0 bg-transparent p-2 text-text-secondary focus-visible:outline-none"
                  aria-label="Toggle navigation menu"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16m-7 6h7'} />
                  </svg>
                </button>
              </div>
            </div>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="md:hidden mt-4 overflow-hidden"
                >
                  <div className="p-4 rounded-lg bg-card-bg/80 backdrop-blur-md border border-border">
                    <div className="flex flex-col space-y-2">
                      {renderNavLinks(() => setIsMenuOpen(false))}
                      <div className="pt-4 mt-2 border-t border-border">
                        {user ? (
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full appearance-none border-0 bg-transparent px-3 py-2 text-left font-semibold text-system-danger focus-visible:outline-none"
                          >
                            {t('nav.logout')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="block w-full appearance-none border-0 bg-transparent px-3 py-2 text-center font-semibold text-primary"
                          >
                            {t('nav.login')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        </header>
      )}
      <main className={clsx('flex-grow', !isRegisterFormPage && '-mt-[80px]')}>
        {children}
      </main>
      {!isRegisterFormPage && <Footer />}
    </div>
  );
};
