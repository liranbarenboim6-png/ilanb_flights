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

No cloud project was created or deployed: a Google/Firebase account connection and real project configuration are still required. Production TOTP, App Check, IAM, billing, email verification and real bucket access must be verified against that project after deployment. Email report confirmations are disabled. See DEPLOYMENT.md for setup and operational limits.
