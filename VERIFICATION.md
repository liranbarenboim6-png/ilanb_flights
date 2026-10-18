# Verification

## File uploads removed

The current form has six steps and no file picker, drop zone or attachment summary. Public upload instructions have been removed. The API advertises `uploadsEnabled: false` with zero file limits and rejects multipart requests containing any file part, including requests from older browser tabs. Staff access to previously stored private evidence is retained.

- 18 unit tests passed, including payload-only parsing, rejection of valid/empty/renamed file parts, malformed payloads and oversized requests.
- Vue and Functions TypeScript checks and production/emulator builds passed.
- 39 integration checks passed through local Hosting: actual attachment rejection, new report without evidence, idempotent retry, staff workflow permissions, historical evidence downloads and direct Firestore/Storage denial.
- Deployed to live Hosting version `e9826ecf252f874b`. All 10 live HTTP checks passed, including production configuration with uploads disabled and zero file limits.
- Live browser verification confirmed no file inputs, six-step progress, required contact validation and the review-to-contact edit link. A fictional report without attachments was saved successfully: `AV-2026-33149F1CAC02`.

The initial release checks below describe the earlier version with attachments enabled.

Verified locally on Windows on 2026-10-18 with Node.js 22.23.3, Java 21, Vue 3.5.44, Firebase SDK 13.0.0 and Firebase CLI 15.34.0.

- Vue and Functions TypeScript checks passed.
- Both production and emulator Vue builds passed; Functions bundle targets Node.js 22.
- 17 unit tests passed: dynamic/conditional validation, consents, money and boolean values, upload limits and signatures, CSV injection, timezones, emulator restrictions and private rate-limit keys.
- 37 API and permission checks passed against Firebase Hosting + Functions + Auth + Firestore + Storage emulators. These include actual saved report/evidence retrieval, retries and conflicts, roles, personal/statistical exports, privacy requests, simultaneous last-admin changes, and denied direct Firestore/Storage reads/writes.
- Browser verification completed a seven-stage fictional report and confirmed its reference and appearance in the staff dashboard, including separately saved purchase/refund amounts.
- Windows CMD launcher checked with the normal Windows PATH; full emulator startup and reuse of an existing matching local server passed.
- Frozen dependency install passed. Production dependency audit reported no known vulnerabilities after pinning the patched gRPC dependency.

Run from the source folder after installing dependencies:

```powershell
pnpm typecheck
pnpm test
pnpm build
```

Start `Start-Local.cmd`, then run the integration checks through Hosting:

```powershell
$env:API_BASE = 'http://127.0.0.1:5000'
node tests/backend-emulator.mjs
```

Integration checks create fictional local test reports, private test files and privacy requests. They briefly change emulator staff roles to check concurrent protection, then restore the demo roles. The test intentionally expects permission-denied messages from Firebase Security Rules.

## Live Firebase deployment

Deployed on 2026-10-18 to **[https://ilanb-flights.web.app](https://ilanb-flights.web.app)**, project `ilanb-flights`. Hosting release version: `d65b7ce472883ce9`.

- Vue frontend published to Firebase Hosting; direct `/report` and `/admin/login` routes return the SPA.
- Node.js 22 API deployed to `me-west1`, with the Hosting rewrite pinned to its revision.
- Firestore Standard Native default database and private evidence bucket are in `me-west1` (Tel Aviv, Israel). Direct browser access rules are denied; bucket public-access prevention is enforced.
- Billing, runtime IAM, server secret, rate-limit TTL configuration, Email/Password sign-in, Identity Platform TOTP and reCAPTCHA Enterprise App Check are configured. Public account signup is disabled.
- All 10 live HTTP checks passed: production configuration, home/direct routes, unauthorized staff report/export rejection, missing App Check and foreign-origin write rejection, and direct Firestore/Storage access rejection.
- A complete seven-stage fictional report with one JPEG evidence file was submitted through the public browser form using real App Check. Reference: `AV-2026-3ADDDB1FCF0B`. The browser confirmed successful storage. An image with a mismatched extension was correctly rejected first.
- All 16 read-only persistence checks passed: exactly one report and evidence record, normalized reporter/consent/flight/answer links and schema versions, separate purchase/refund-request amounts of 123.45, and matching private JPEG object metadata and size. Anonymous object downloads returned 401/403.
- Function build-image cleanup is configured for 30 days in `me-west1`.

The initial owner Auth account and inactive administrator membership are prepared. Owner password setup, actual email verification, TOTP enrollment and staff dashboard checks still require the owner's participation. No production MFA or email verification bypass was used. Staff role and workflow integration tests above were completed against the local emulators.

Email report confirmations remain disabled. Public organizational, privacy and consent text remains a draft requiring the organization's review before accepting real consumer reports. See DEPLOYMENT.md for setup and operational limits.
