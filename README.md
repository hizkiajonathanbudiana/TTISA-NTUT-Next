# TTISA Next + Firebase

A Next.js 16 + Firebase rewrite of the TTISA NTUT public site and CMS.

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in every Firebase credential.
3. Run `npm run dev`

For detailed Firebase configuration, enabling Email/Password/Google auth, and seeding the default admin user (`ntut.ttisa@gmail.com`), follow [docs/firebase-setup.md](docs/firebase-setup.md).

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint with `--max-warnings=0` |
| `npm run seed:admin` | Create/ensure the TTISA admin user + Firestore role |

## Folder highlights

- `src/app/(public)` – public site routes with TTISA’s UI/UX
- `src/app/(cms)` – protected CMS routes
- `src/app/(auth)` – glassmorphism auth stack matching TTISA-NTUT
- `src/lib` – Firebase client/admin helpers, CMS schemas, data loaders
- `scripts/` – maintenance scripts (admin seeding, etc.)
