# Firebase Setup & Admin Seeding

Follow these steps to make the Next.js + Firebase build behave exactly like the legacy TTISA NTUT app and to avoid runtime errors such as `Firebase: Error (auth/configuration-not-found)`.

## 1. Configure environment variables

1. Copy `.env.example` to `.env.local` (and `.env` for production) inside `next-firebase/`.
2. Fill in every `NEXT_PUBLIC_FIREBASE_*` value from the Firebase console → Project settings → General.
3. Generate a service account JSON (Project settings → Service accounts → Firebase Admin SDK) and paste the values into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (remember to keep the `\n` escapes inside quotes).

## 2. Enable the required auth providers (fixes `auth/configuration-not-found`)

1. Go to **Firebase Console → Authentication → Sign-in method**.
2. Enable **Email/Password** and **Google** providers.
3. In the same screen, add `http://localhost:3000`, your preview URL, and the production domain under **Authorized domains**.
4. Still under Authentication → Templates, set the action URL to `NEXT_PUBLIC_SITE_URL` (e.g. `https://ttisa.app/update-password`) so password reset links land back in the Next app.

If Email/Password is disabled, Firebase throws `auth/configuration-not-found` the moment users try to log in or reset their password, so the step above is mandatory.

## 3. Seed the default CMS admin (ntut.ttisa@gmail.com)

The repo ships with `scripts/seed-admin.mjs`, which uses the Admin SDK to create/ensure an `admin` role document inside `cms_users`.

```bash
# From the next-firebase directory, after exporting FIREBASE_* env vars
npm run seed:admin

# Optionally override the email/display name
npm run seed:admin -- ntut.ttisa@gmail.com "TTISA Admin"
```

What the script does:

- Creates the Firebase Auth user if it does not exist (prints a strong temporary password when it has to create one).
- Ensures `cms_users/{uid}` has `role: "admin"`, `englishName`, and timestamps.

> **Tip:** run the script whenever you refresh the Firebase project or need to elevate another account. Pass their email + human-friendly name as arguments.

## 4. (Optional) Seed public content

Populate the Firestore collections used by the public UI for parity with `TTISA-NTUT`:

- `cms_events`
- `cms_posts`
- `cms_teams`
- `cms_testimonials`
- `cms_social_links`

You can use the CMS screens inside `/cms` or write similar scripts following `scripts/seed-admin.mjs` as a template.
