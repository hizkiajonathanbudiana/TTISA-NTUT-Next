import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx,mdx}',
    './src/components/**/*.{ts,tsx,mdx}',
    './src/providers/**/*.{ts,tsx,mdx}',
    './src/lib/**/*.{ts,tsx,mdx}',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
        },
        background: 'var(--color-background)',
        surface: 'var(--color-card-bg)',
        'card-bg': 'var(--color-card-bg)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        system: {
          success: 'var(--color-system-success)',
          danger: 'var(--color-system-danger)',
        },
        danger: 'var(--color-system-danger)',
        accent: 'var(--color-accent-blue)',
        'accent-blue': 'var(--color-accent-blue)',
        'accent-green': 'var(--color-accent-green)',
        'accent-purple': 'var(--color-accent-purple)',
      },
      fontFamily: {
        sans: ['sans-serif'],
      },
      boxShadow: {
        card: '0 20px 45px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
