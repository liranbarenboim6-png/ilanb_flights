# Deploy the Vue application to Firebase

This guide publishes the Vue SPA to Firebase Hosting and the API to Cloud Functions, with Cloud Firestore, Firebase Authentication and private Cloud Storage in the same real project. The local project `demo-aviation-rights` is only for emulators.

## Configured project

The repository's `.firebaserc` selects **`ilanb-flights`**. Its public Hosting address is **[https://ilanb-flights.web.app](https://ilanb-flights.web.app)**; deployment and live-test results are tracked in **[VERIFICATION.md](VERIFICATION.md)**.

Billing is linked, and the default **Standard edition, Native mode Firestore database** and private bucket **`ilanb-flights.firebasestorage.app`** are provisioned in **Tel Aviv, Israel (`me-west1`)**. The API and Hosting rewrite also target `me-west1`. Public frontend assets are served through Firebase Hosting's global infrastructure; report records, private evidence and API processing use the Israel region.

Email/Password sign-in, Identity Platform, disabled public signup, the Hosting authentication domains, reCAPTCHA Enterprise App Check, runtime service permissions and `RATE_LIMIT_SALT` are configured. Staff use email and password, with verified email and active staff membership required by the API. MFA providers are disabled for this login policy. Production environment files stay outside Git. A fresh checkout still needs those configuration values and an authorized Google sign-in before deployment.

The reusable steps below also cover setting up another project. For this configured project, substitute **`ilanb-flights`** for `YOUR_PROJECT_ID` and retain existing resources and secrets rather than creating replacements.

For a different project, update both `.firebaserc` and `hosting.site` in `firebase.json` to its actual project and Hosting site IDs before deploying.

## 1. Create the project

1. Open the [Firebase console](https://console.firebase.google.com/) and create a new project in the Google account that will own the application.
2. Record its **project ID**. Use that value wherever this guide says `YOUR_PROJECT_ID`; do not use a `demo-` ID.
3. Register a **Web app** in Project settings. Copy its Firebase web configuration values into the environment file in step 4.
4. Enable the **Blaze** billing plan and review the project's billing account and budget alerts. This application deploys Cloud Functions and uses Cloud Storage, which require billing. See [Functions deployment requirements](https://firebase.google.com/docs/functions/get-started) and [Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
5. Create a **Cloud Firestore Standard edition, Native mode** default database in **Tel Aviv, Israel (`me-west1`)**, then create the default Cloud Storage bucket in the same region. The production API and Hosting rewrite use `me-west1`, matching the selected location for reports and private evidence. Database and bucket locations must be chosen when those resources are created; changing this source configuration does not move existing data.

Use production rules when creating the database and bucket. The app's rules deny direct browser access; all report and evidence operations pass through its API.

## 2. Configure staff authentication

1. In Firebase Authentication, enable **Email/Password** sign-in.
2. Keep SMS and TOTP multi-factor authentication disabled. If this project previously enabled either provider, complete the migration in step 6. The existing Identity Platform upgrade can remain; a new project does not need to enable MFA for this login flow.
3. Add your Hosting domains to Authentication's authorized domains, including `YOUR_PROJECT_ID.web.app` and any custom domain you will use.
4. Create the initial administrator's email/password account in Firebase Authentication. The web application does not offer self-registration.

Keep public signup disabled and use Email/Password sign-in. A successful password sign-in alone does not grant a staff role: the API verifies the email, token, account status and active Firestore membership. Do not grant public access to Firestore to work around an authentication error. App Check continues protecting production API writes.

## 3. Register Firebase App Check

Register the Web app with **App Check using reCAPTCHA Enterprise**. Add the real Hosting/custom domains to the provider configuration and record the public site key. Follow the [Firebase web App Check instructions](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider).

The browser sends App Check tokens to the API. The server checks them for production write requests. Firebase Security Rules also block direct database and file access, including from a browser signed into Firebase.

## 4. Create production environment files

From this source folder, copy `.env.example` to **`.env.production.local`** and fill in the Web app values:

```dotenv
VITE_FIREBASE_API_KEY=YOUR_WEB_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_ACTUAL_BUCKET_NAME
VITE_FIREBASE_APP_ID=YOUR_WEB_APP_ID
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=YOUR_PUBLIC_SITE_KEY
VITE_USE_EMULATORS=false
```

These Firebase Web app settings and the App Check site key are public client configuration. Server permissions protect the data. Never put service-account private keys, passwords or server secrets into a `VITE_` variable.

Copy `functions/.env.example` to **`functions/.env.YOUR_PROJECT_ID`** and set:

```dotenv
APP_ORIGIN=https://YOUR_PROJECT_ID.web.app,https://YOUR_PROJECT_ID.firebaseapp.com
EVIDENCE_BUCKET=YOUR_ACTUAL_BUCKET_NAME
```

`APP_ORIGIN` is a comma-separated list of exact HTTPS origins, without trailing slashes or paths. Add your custom origin before using a custom domain. The bucket value must match the existing bucket and `VITE_FIREBASE_STORAGE_BUCKET`; new default buckets normally end with `.firebasestorage.app`.

Keep production environment files private. The repository ignores the local environment files and downloaded tools. `functions/.secret.local` is an emulator-only placeholder and must not be used as the cloud secret.

## 5. Sign in and set the server secret

Install the project packages if needed, then sign in through Google's browser flow:

```powershell
pnpm install --frozen-lockfile
pnpm exec firebase login
pnpm exec firebase projects:list
```

Check that the intended new project appears. Select it explicitly on deployment commands; no global default is required.

Create **RATE_LIMIT_SALT** in Secret Manager through the Firebase CLI:

```powershell
pnpm exec firebase functions:secrets:set RATE_LIMIT_SALT --project YOUR_PROJECT_ID
```

At the prompt, enter a randomly generated secret of at least 24 characters. Store the value in your password manager. The function binds this secret; changes require redeployment. See [Firebase secret configuration](https://firebase.google.com/docs/functions/config-env).

If `node` or `pnpm` is unavailable in this computer's PowerShell PATH, the local launcher already detects the Codex bundled runtime. For manual CLI commands you can use:

```powershell
$aviationNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$aviationPnpm = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.mjs'
& $aviationNode $aviationPnpm exec firebase login
```

Use the same `& $aviationNode $aviationPnpm` prefix in place of `pnpm` for the other commands. You do not need to change PowerShell execution policy.

## 6. Configure password-only access and provision the first administrator

The one-time setup uses **Application Default Credentials** with permission to administer the selected project's Authentication and Firestore data. Firebase CLI login and Admin SDK credentials are separate. A project administrator can authenticate locally with the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install):

```powershell
gcloud auth application-default login
```

For an existing Identity Platform project that previously enabled MFA, run the following from this source folder in PowerShell after selecting and checking the real project ID. This changes only the project MFA configuration, preserving accounts, passwords, staff memberships, reports, authorized domains, public-signup restrictions and other provider settings:

```powershell
$env:GOOGLE_CLOUD_PROJECT = 'YOUR_PROJECT_ID'
@'
import {createRequire} from 'node:module';
const require=createRequire(new URL('./functions/package.json',import.meta.url));
const {initializeApp,applicationDefault}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const projectId=process.env.GOOGLE_CLOUD_PROJECT;
if(!projectId||projectId.startsWith('demo-')||projectId==='YOUR_PROJECT_ID')throw Error('Select the intended real Firebase project first.');
if(Object.keys(process.env).some(key=>key.endsWith('_EMULATOR_HOST')&&process.env[key]))throw Error('Unset emulator variables before configuring cloud authentication.');
initializeApp({credential:applicationDefault(),projectId});
const manager=getAuth().projectConfigManager();
const current=await manager.getProjectConfig();
await manager.updateProjectConfig({multiFactorConfig:{
 state:'DISABLED',
 factorIds:[],
 providerConfigs:(current.multiFactorConfig?.providerConfigs||[]).map(provider=>({...provider,state:'DISABLED'})),
}});
const verified=await manager.getProjectConfig();
if(verified.multiFactorConfig?.state!=='DISABLED'||verified.multiFactorConfig?.factorIds?.length||verified.multiFactorConfig?.providerConfigs?.some(provider=>provider.state!=='DISABLED'))throw Error('MFA disabling was not confirmed.');
console.log(`Password-only project authentication configured in ${projectId}.`);
'@ | node --input-type=module
```

Inspect the selected project's Authentication settings afterward: Email/Password remains enabled, public signup remains disabled, and SMS/TOTP MFA providers are disabled. The legacy `scripts/enable-totp.mjs` command now refuses to change configuration and points to this password-only setup.

Disabling project providers does not remove an existing user's enrolled factors. If a staff account still receives a Firebase MFA challenge, an authorized project administrator must review that account and remove its enrolled second factors as part of this migration. Use the Admin SDK against that specific existing UID, then revoke its refresh tokens so the user signs in afresh:

```javascript
await getAuth().updateUser('REVIEWED_STAFF_UID', {multiFactor: {enrolledFactors: null}});
await getAuth().revokeRefreshTokens('REVIEWED_STAFF_UID');
```

Do not delete or recreate the account, reset its password, or remove its Firestore role or reports. Do not apply this user migration to unrelated accounts. The [Admin SDK user-update documentation](https://firebase.google.com/docs/auth/admin/manage-users#update_a_user) describes updating existing accounts.

Complete the first deployment in step 7, then return here to verify and provision the initial administrator. The deployed app login offers the email verification flow after a correct email/password sign-in. Open the received verification link, then sign in again. The production API will refuse staff data access until verified email and an active staff role are both present.

After the email has been verified, grant the first role:

```powershell
node scripts/bootstrap-admin.mjs YOUR_PROJECT_ID admin@YOUR_ORGANIZATION_DOMAIN
```

The script looks up the existing verified Auth account and creates its Firestore administrator membership with an audit record. It refuses emulator endpoints and does not create a password or bypass email verification.

After deployment, the verified and provisioned first admin signs in using their email and password. There is no phone-number, QR-code or second-factor enrollment step. Additional staff are created in Firebase Authentication and receive roles in the app's **Users and permissions** screen. A valid Firebase account without an active staff membership cannot access the dashboard.

## 7. Build and deploy

Unset emulator environment variables in the deployment terminal if you set any manually. Leave the local `demo-` project out of the production configuration.

Run from the source folder:

```powershell
node scripts/deploy.mjs YOUR_PROJECT_ID
```

Or, with pnpm available:

```powershell
pnpm run deploy YOUR_PROJECT_ID
```

The helper checks the real project ID, production configuration, HTTPS origins, bucket consistency, App Check site key and Firebase CLI sign-in. It runs type checks, tests and the production build, then deploys **hosting, functions, firestore and storage**. It uses `dist`, not `dist-emulator`. Deployment is interactive by default. The first deployment can prompt for required Google Cloud API setup and the number of days to retain function container images in Artifact Registry. Choose an image cleanup retention period to control accumulated storage costs. Firebase deployment may also require the deployer to have appropriate IAM permissions; complete those project setup steps and rerun if needed.

For CI after the project's APIs, secret, IAM permissions and Artifact Registry cleanup policy are configured, explicitly disable prompts:

```powershell
node scripts/deploy.mjs YOUR_PROJECT_ID --non-interactive
```

If a noninteractive first deployment reports that Functions were deployed but their cleanup policy could not be set, configure the policy for this app's region, then rerun the deployment:

```powershell
pnpm exec firebase functions:artifacts:setpolicy --project YOUR_PROJECT_ID --location me-west1 --days 30
```

This example retains container images for 30 days. Set a period that fits your rollback and cost requirements. It does not delete reports or evidence files.

After a successful deployment, the application address is:

**`https://YOUR_PROJECT_ID.web.app`**

Firebase Hosting rewrites `/api/**` to the `api` function in `me-west1` and remaining routes to `index.html`, so direct links to `/report` and `/admin/login` work. This uses [Firebase Hosting rewrites](https://firebase.google.com/docs/hosting/full-config). Hosting serves public website files through Firebase's global infrastructure; the regional choice applies to the API, Firestore reports and private Storage bucket.

The local emulator configuration deliberately keeps its existing `europe-west1` function URL. Local requests stay on this computer; this emulator URL does not determine the production data location.

## Custom domain: 911teufa.com

Firebase Hosting resources are prepared for `911teufa.com` to serve this site and `www.911teufa.com` to redirect to it. Firebase Authentication and reCAPTCHA Enterprise allow both names. The function's private production environment includes both HTTPS origins in `APP_ORIGIN` alongside the existing Firebase Hosting origins.

Firebase returned these exact DNS requirements for GoDaddy:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `199.36.158.100` |
| TXT | `@` | `hosting-site=ilanb-flights` |
| CNAME | `www` | `ilanb-flights.web.app` |

In GoDaddy, open the domain's DNS management page and add or edit the website records to match. Preserve email MX records and unrelated TXT records. Remove conflicting website A/AAAA/CNAME records only after inspecting their current purpose. The app stays on Firebase; DNS connects the purchased name to it.

At preparation time, public DNS and the .com registry did not return the domain. Confirm its exact spelling, completed registration and nameserver status in GoDaddy. The custom domain is not live until ownership, DNS and HTTPS certificate checks pass. Firebase's [custom-domain guide](https://firebase.google.com/docs/hosting/custom-domain) allows up to 24 hours after correct DNS changes for certificate provisioning.

## 8. Verify the live application

- Open the home page and a direct `/report` link. Confirm that no local emulator banner appears.
- Submit a clearly labeled test report without attachments. Confirm the report and consent records in Firestore and no new evidence records. The form has six steps and no file picker; multipart requests containing file parts must be rejected.
- Sign in as a verified administrator using email and password. Confirm the login shows no phone, QR-code or second-factor prompt, the test report appears, and note updates and authenticated evidence download remain protected. Confirm wrong passwords, unverified accounts and accounts without active staff membership are denied access.
- Create a reviewer account and role. Confirm that personal-data export, staff role changes and privacy administration remain unavailable to that account.
- Confirm unauthenticated requests cannot list reports, fetch evidence or directly read/write the private Firestore and Storage paths.
- Delete or retain the clearly labeled test report under the organization's policy. Verify project logs, budget alerts and backup configuration.

Firebase Hosting imposes a 60-second timeout on requests forwarded to functions. Slow requests or cold starts can time out after the server has received a report. Keep the report form open and retry from that same form: the stable idempotency key recovers the original reference instead of creating a duplicate. Do not refresh and re-enter the report while its outcome is uncertain. See [Hosting and Cloud Functions timeouts](https://firebase.google.com/docs/hosting/functions).

The runtime service account needs the intended Firestore, Authentication and private bucket permissions. Do not make the bucket public if an authenticated file download fails; inspect the function's service-account permissions and logs.

## Before accepting live consumer reports

Review the draft organizational, privacy and consent text, provide the organization's real contact information, and approve retention, access-request and deletion procedures. Email report confirmations are currently disabled; only the on-screen reference is provided.

Configure backups and recovery, monitoring, staff password recovery and ownership of billing/domain accounts. The current API calculates staff search, statistics and patterns by reading the relevant collections in pages; plan indexed queries and maintained aggregates before substantial growth.

Public uploads are disabled at the form and API. Existing private evidence is retained for authorized staff access. An authorized operator must reconcile any historical staged objects against `submissions`, report records and evidence metadata before deleting confirmed orphans. Privacy workflow status changes do not automatically delete records or objects.
