# API security boundary

The browser cannot directly read or write Firestore or Cloud Storage. Both rulesets deny all client access. The API uses the Admin SDK and therefore must authenticate and authorize every protected operation independently of those rules. It verifies the Firebase token, revocation, active `admins/{uid}` membership, role, and production TOTP claim. Production mutations also require an exact configured HTTPS origin and a valid App Check token.

Public submissions have two independent hourly budgets:

| Operation | Transport/proxy budget before parsing | Validated reporter-address budget |
|---|---:|---:|
| Report | 600 | 15 |
| Privacy request | 300 | 5 |

Firebase Hosting and Cloud Functions can add proxy addresses to `X-Forwarded-For`. The final address is used only as a coarse transport budget; it is not described as the end user's IP. Caller-controlled prefixes cannot split that budget. A shared proxy therefore does not place all visitors in a 15-report bucket. The reporter address is normalized, combined with the operation, time window and Secret Manager salt, and hashed before becoming a Firestore document ID. Rate records contain only a count and TTL timestamp, never the raw address. A supplied email is an abuse-control key, not verified identity. App Check and the transport budget remain necessary because a caller can submit different addresses.

Tune the coarse transport budget to observed traffic before a large public campaign. Limits are atomic Firestore transactions; `rateLimits.expiresAt` has a TTL policy in `firestore.indexes.json`. TTL deletion is asynchronous and does not determine whether a request is allowed.

The only MFA/App Check exemption requires all of: `FUNCTIONS_EMULATOR=true`, a `demo-` project, and explicit loopback endpoints for the Auth, Firestore and Storage emulators. A single development toggle cannot disable production checks.

Reference: [Cloud Functions request headers](https://docs.cloud.google.com/functions/docs/reference/headers).
