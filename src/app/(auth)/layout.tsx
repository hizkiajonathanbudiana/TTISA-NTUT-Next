import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[5%] left-[10%] h-72 w-72 rounded-full bg-accent-blue opacity-50 blur-3xl animate-aura-1 lg:h-96 lg:w-96" />
        <div className="absolute bottom-[10%] right-[5%] h-72 w-72 rounded-full bg-accent-green opacity-50 blur-3xl animate-aura-2 animation-delay-2000 lg:h-96 lg:w-96" />
        <div className="absolute top-[20%] right-[15%] h-64 w-64 rounded-full bg-accent-purple opacity-40 blur-3xl animate-aura-3 animation-delay-4000 lg:h-80 lg:w-80" />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
