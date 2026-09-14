# Bluecrest Logistics

Logistics website, browser-local admin dashboard, and Firebase-backed shipment tracking built with Next.js.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and fill in the Firebase and Supabase configuration.
3. Run `npm run dev` and open `http://localhost:3000`.

The Supabase shipment-photo bucket is `blue`. Firestore uses the `shipments` collection. Environment files with real values, dependencies, and generated build output are excluded from Git.

## Features

- Public logistics pages and testimonial slideshow.
- Admin access at `/admin?admin=1`, or type `admin` on `/admin`.
- Super-admin and admin accounts stored in the current browser, with password verifiers.
- Shipment creation, editing, deletion, photo upload, ETA date pickers, and optional customer notes.
- Public tracking at `/track?code=TRACKING_CODE`, with live Firestore updates and a map of the last recorded location.

See [ADMIN.md](ADMIN.md) for account behavior, storage requirements, and verification scripts. Admin accounts created in one browser are not shared with other browser profiles. Maps show recorded locations, not continuous GPS positions. Example testimonials are labeled as illustrative.

## Checks

Run `npm run lint` and `npm run build`. Browser checks require Microsoft Edge and the development server running on port 3000.

- `node scripts/check-admin.mjs`: isolated login and cloud-failure handling tests.
- `node scripts/check-site.mjs`: public-page and navigation checks.
- `node --env-file=.env scripts/verify-cloud.mjs`: live temporary storage verification.
- `node --env-file=.env scripts/check-live-tracking.mjs`: live dashboard, photo, date, note, map, and tracking verification.

Live verification scripts create temporary test records and remove them afterward; use only with a project where that verification is authorized.
