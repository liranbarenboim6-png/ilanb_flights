# Aviation Rights — Vue 3 + Firebase

Hebrew RTL web application for collecting aviation consumer reports and reviewing them in a private staff interface.

The application uses Vue 3, TypeScript and Vite in the browser, Firebase Hosting for the website, Cloud Firestore for report data, Firebase Authentication for staff accounts, Cloud Storage for private evidence, and Cloud Functions for validation and access control.

## Run locally on Windows

Clone this repository, then run **Start-Local.cmd** from its root folder. You can also double-click that file in Windows Explorer. Keep the terminal window open. The launcher opens the browser when Firebase is ready.

The local website is **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

From PowerShell, you can run:

```powershell
git clone https://github.com/liranbarenboim6-png/ilanb_flights.git
cd ilanb_flights
.\Start-Local.cmd
```

This CMD launcher works without changing PowerShell execution policy. Opening a `.vue` source file does not run the application.

On the first start, the launcher installs project packages, builds the application, and starts the Firebase Emulator Suite. It uses an available Java 21 runtime or downloads a portable Microsoft JDK to `.local/tools` when needed on Windows x64. Downloads and the first build can take several minutes. Node.js 22 or later is required; the launcher detects the Codex bundled Node runtime on this computer and otherwise uses installed Node.js.

Useful launcher options:

```powershell
.\Start-Local.cmd --check
.\Start-Local.cmd --no-open
```

`--check` checks local prerequisites without creating cloud resources. `--no-open` starts the app without automatically opening the browser. `--no-pause` skips the final terminal pause when running from another script.

## Local demonstration accounts

Open **[the admin login](http://127.0.0.1:5000/admin/login)** after starting the app.

| Role | Email | Local password |
| --- | --- | --- |
| Administrator | `admin@example.invalid` | `DemoOnly!2026` |
| Reviewer | `reviewer@example.invalid` | `DemoOnly!2026` |

These accounts and 12 sample reports exist only in the local Firebase emulators under project `demo-aviation-rights`. All sample people, companies and reports are fictional. Production staff access requires verified email, TOTP authentication and an active Firestore role. The emulator bypass is restricted to a demo project with all emulator hosts on the local computer.

The launcher does not export emulator data on shutdown. New local reports and changes are lost when the emulators stop; a new start recreates the fictional samples. Keep real consumer data out of the local demo.

## Features

- Public landing page, mobile layout and seven-stage report wizard in Hebrew.
- Primary and secondary categories, several companies and their roles, flight and booking information, narratives, contact history, financial amounts and category-specific questions.
- Up to five private PDF, JPG, PNG or WEBP files, each up to 5 MiB. The server checks the binary signature, MIME type, extension, size and count.
- Versioned consents and question schema, a unique report reference and retry protection through an idempotency key.
- Staff dashboard with actual database counts, report filters and pagination, detailed review, notes, status changes, related reports and duplicate marking.
- Company editing and controlled merging, rule-based pattern groups, statistical CSV export, and administrator-only exports containing personal information.
- Administrator user access controls and a queue for privacy requests.

Email confirmations are disabled. A successful report submission displays the reference in the browser; the app does not claim that a confirmation email was sent. Public legal and privacy pages are draft text for the organization to review before accepting live reports.

## Source code

| Folder or file | Purpose |
| --- | --- |
| `src/views/` | Landing page, report wizard, staff login, admin shell and public information pages |
| `src/components/admin/` | Dashboard, reports, companies, patterns, users and privacy workflows |
| `src/lib/firebase.ts` | Firebase initialization, in-memory staff authentication and App Check |
| `src/lib/api.ts` | Authenticated requests and evidence/CSV downloads |
| `shared/` | Types, Hebrew catalogs, versioned questions and Zod validation |
| `functions/src/` | HTTP API, security checks, Firestore transactions and private storage |
| `firestore.rules`, `storage.rules` | Deny direct client access to private records and evidence |
| `firebase.json` | Production Hosting and Firebase deployment configuration |
| `firebase.emulator.json` | Local Hosting output and emulator configuration |
| `scripts/` | Local launcher, fictional seed, deployment and first-admin setup |
| `tests/` | Validation, backend and emulator security checks |

## Development commands

With Node.js and pnpm available in your terminal:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build:emulator
```

The launcher uses the built Vue app on Firebase Hosting emulator port 5000. For hot reload, keep the Firebase emulators running and use a second terminal:

```powershell
pnpm dev --mode emulator
```

Then open **[http://127.0.0.1:5173](http://127.0.0.1:5173)**. The Vite server forwards `/api` requests to the local Functions emulator. Emulator UI is available at **[http://127.0.0.1:4000](http://127.0.0.1:4000)**.

| Service | Local port |
| --- | --- |
| Hosting | 5000 |
| Functions | 5001 |
| Firestore | 8080 |
| Authentication | 9099 |
| Storage | 9199 |
| Emulator UI | 4000 |
| Vite development server | 5173 |

## Deploy to a real Firebase project

A real project and Google account connection are required. The supplied local demo project is not a hosted cloud project. Follow **[DEPLOYMENT.md](DEPLOYMENT.md)** to create a new Firebase project, configure billing, authentication, App Check and production values, then publish the application.

The production build is separate from the emulator build. `pnpm build` writes `dist`, while `pnpm build:emulator` writes `dist-emulator`. The deployment helper checks that the selected real project and production environment agree.

## Troubleshooting

**Nothing happens after clicking a file:** run `Start-Local.cmd` from the repository folder, then read the terminal messages. Wait for the website URL and leave that window open.

**PowerShell says a script is disabled:** use the `.cmd` launcher shown above. No execution-policy change is needed.

**A port is already in use:** if the matching complete app is healthy, the launcher reuses it. Otherwise stop the earlier Firebase emulator console with Ctrl+C, then start again. The launcher does not stop unrelated applications.

**Node.js is missing:** install Node.js 22 or later from [nodejs.org](https://nodejs.org/en/download), reopen the terminal and run the launcher again.

**Java download or emulator download fails:** check internet access and disk space. You can install Java 21 yourself and set `JAVA_HOME`, then rerun the launcher. See the [Firebase Emulator Suite instructions](https://firebase.google.com/docs/emulator-suite/install_and_configure).

**The admin page asks you to sign in after a reload:** staff authentication is deliberately kept in memory. Sign in again; tokens are not stored in browser local storage.

**The app says Firebase is not configured:** start using the CMD launcher for the local demo, or complete the production configuration. The app does not silently replace a missing database with browser storage.

**A report submission times out:** keep the same form open and retry there. It retains the same idempotency key so the server can recover an already-saved reference. Firebase Hosting can time out an API request after 60 seconds even while the function is finishing.

## Operational limits

The admin API currently assembles the relevant collections on the server for searching, dashboard aggregation and pattern matching. It pages through Firestore collections without silently truncating them, but large datasets require indexed server queries, maintained aggregates and a search service before scaling. Evidence and contact data remain private throughout this flow.

Completing a privacy request in the admin screen records workflow status; it does not automatically disclose or delete records. The organization must perform identity verification and the actual data action under an approved procedure. Configure retention, backups and incident response before live operation.
