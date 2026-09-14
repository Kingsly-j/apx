# Bluecrest administration

Type `admin` outside inputs or editable fields on any page to open the admin login. On mobile, append `?admin=1` (or `&admin=1` when a query already exists) or `#admin` to any page URL. `/admin?admin=1` also opens login directly.

The super admin email is `support@bluecrestlogistics.com`. The generated initial password is stored in the ignored `.env` file as `BLUECREST_SUPER_ADMIN_PASSWORD`. The client includes its SHA-256 verifier in `lib/admin-bootstrap.ts`.

Admin accounts and sessions use browser localStorage, matching the requested Atlas workflow. Added admins are available only in the browser profile where they were created. Clearing browser storage removes those accounts and sessions. Role filtering is a browser behavior, not server authorization.

Super admins can see all available shipment records and add admins. Regular admins see the records they created. Shipment codes begin with `BC-`. The dashboard supports creating records, changing status/location/ETA, uploading and replacing a photo, copying tracking codes, and deleting records.

Shipments use the Firebase `shipments` collection. Creates, updates, and deletes report success only after Firestore acknowledges the operation. Shipment data no longer falls back to localStorage; existing old browser caches are not deleted, but are not used as cloud records. If the service does not respond within 15 seconds, the app reports an unconfirmed operation and asks the operator to refresh before retrying. Public tracking is at `/track?code=TRACKING_CODE`.

Photos use Supabase Storage bucket `blue`, configured by `NEXT_PUBLIC_SUPABASE_SHIPMENT_PHOTOS_BUCKET`. Uploads require existing bucket policies that allow the configured client access. No Firebase rules or Supabase policies were changed by this implementation.

Run `node scripts/check-admin.mjs` with the development server on port 3000 for isolated browser tests. The test simulates denied cloud access and checks that failures never become successful local-only shipments. It reads the bootstrap password from `.env` without logging it.

Live verification on 2026-09-14 after the policy updates: Supabase uploads to bucket blue pass, including byte-for-byte public image read-back. The real admin dashboard successfully created a shipment with an uploaded photo in Firebase. A separate visitor session loaded that photo and verified route, ETA, delivered status, progress, homepage tracking navigation, and unknown-code handling. Temporary Firebase records were removed and their deletion verified; test photos were removed from Supabase. Browser-local admin sessions remain separate from Supabase Auth sessions.

Run `node --env-file=.env scripts/verify-cloud.mjs` for temporary cloud upload/write/read-back/cleanup checks, or `node --env-file=.env scripts/check-live-tracking.mjs` for the live dashboard-to-tracking browser workflow. Both create only clearly identified temporary records and clean up their test data.
