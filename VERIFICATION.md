# Verification

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
- Function build-image cleanup is configured for 30 days in `me-west1`.

The initial owner Auth account and inactive administrator membership are prepared. Owner password setup, actual email verification, TOTP enrollment and staff dashboard checks still require the owner's participation. No production MFA or email verification bypass was used. Staff role and workflow integration tests above were completed against the local emulators.

Email report confirmations remain disabled. Public organizational, privacy and consent text remains a draft requiring the organization's review before accepting real consumer reports. See DEPLOYMENT.md for setup and operational limits.
