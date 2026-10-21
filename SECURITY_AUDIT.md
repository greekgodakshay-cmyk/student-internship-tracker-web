# Security audit and hardening notes

## Scope and limitations
Reviewed the supplied Node.js/Express application source, authentication routes, Mongoose models, database setup, and feature routes. Changes were made to the source package and checked with Node syntax validation and automated baseline tests. No live MongoDB/Atlas connection, production environment, browser session, or third-party API was exercised. The uploaded `.env` was deliberately excluded from the release artifact.

## Prioritized findings

### High — Express default in-memory session store
**Observed:** `express-session` had no `store`, so it used its default in-memory store.
**Change:** Added a MongoDB-backed `express-session` store using the already configured Mongoose connection, with an expiry timestamp and TTL index. Session cookies now use a non-default name, HttpOnly, SameSite=Lax, Secure in production, rolling 8-hour expiry, and session fixation protection remains in the login route.
**Verification:** Automated baseline test checks the configured store/cookie properties; source syntax checks pass. A live Atlas test is still required.

### High — secrets bundled in the uploaded archive
**Observed:** The uploaded archive contained a populated `.env` file.
**Change:** Removed `.env` from the deliverable; added a placeholder-only `.env.example` and strengthened `.gitignore`.
**Required action:** If any values in the uploaded `.env` are real or have ever been used outside a local sandbox, rotate the MongoDB database credential, session secret, and Gemini API key. Review Atlas network access and database-user privileges. Do not commit `.env`.

### High — authentication endpoint brute-force exposure
**Observed:** The app had a broad API rate limit but no separate limit for login and registration.
**Change:** Added a dedicated 10-request-per-15-minute limiter to login and registration, while retaining the global API limiter.
**Limit:** The configured limiter uses its default in-process store; deployments with multiple instances should use a shared rate-limit store. Password-reset and email-verification routes were not present, so no speculative flows were added.

### Medium — cross-origin state-changing requests
**Observed:** Session cookies authenticate state-changing API requests.
**Change:** Added an Origin-host check for unsafe HTTP methods when browsers supply an Origin header, alongside SameSite=Lax cookies.
**Limit:** Validate this policy against any intentional cross-origin frontend/API deployment before release. If cross-origin use is required, configure an explicit trusted-origin allowlist and a CSRF token strategy instead of weakening checks broadly.

### Medium — stale administrator privileges
**Observed:** Administrator middleware trusted the role copied into the session at login; a database role demotion could leave the session with stale admin access until logout/expiry. Internship listing visibility also relied on the session role.
**Change:** Administrator actions now re-check the user's current database role; the `all=true` internship listing also checks the current role.
**Limit:** This adds database reads to administrator requests; evaluate caching only if revocation semantics remain acceptable.

### Existing positive controls retained
- Passwords are hashed with bcryptjs (cost factor 12).
- Login uses a generic invalid-email-or-password response.
- Login regenerates the session ID.
- Logout destroys the server-side session and clears the configured session cookie.
- The registration route explicitly assigns the `student` role rather than trusting a submitted role.
- User-owned project, skill, and application operations include ownership filters in the reviewed paths.
- Community search escapes regular-expression metacharacters in the query.

## Important unresolved items / release gates
1. **Role schema mismatch:** `models/User.js` allows only `student` and `admin`, despite the project description mentioning teachers. I did not add `teacher` because that is a data-model / authorization-policy change requiring approval and route-by-route policy definition.
2. **Live integration tests:** Tests currently verify security invariants in source and JavaScript syntax; they do not prove MongoDB TTL behavior, session persistence across process restarts, actual HTTP access control, or production proxy behavior. Run staging integration tests against a dedicated non-production database.
3. **MongoDB Atlas:** Use a least-privilege database user, restrict network access, enforce TLS, and keep backups/point-in-time recovery enabled. Confirm the deployment user can create the session TTL index.
4. **Reverse proxy:** Set `TRUST_PROXY=1` only if exactly one trusted reverse proxy sits in front of the app and overwrites forwarded headers. Otherwise leave it unset/0.
5. **Rate limiting:** Use a shared store for multi-instance production deployments.
6. **Account lifecycle:** Password change/reset, email verification, and reauthentication flows were not present in the inspected routes; they were not invented or added.
7. **Security review remains necessary:** Review all API response fields and authorization rules with staging data, then run dependency vulnerability scanning (`npm audit` or an approved SCA scanner) in an environment with registry access.

## Test results
- `npm test`: 6/6 baseline tests passed.
- `node --check` over project JavaScript files: passed.
- No live database or third-party service was contacted.


## Additional NoSQL injection and role hardening

- Added `middleware/validateRequestInput.js`, which rejects client-controlled object keys beginning with `$` or containing `.`, and bounds recursive depth and object-node counts. This is defense in depth; route handlers still need strict field allowlists and type validation.
- Applied the guard to `/api` after JSON/form parsing and before API routes.
- Extended the User role enum with `teacher` while retaining `admin` for compatibility with existing records and middleware. No existing records are rewritten.
- Current permission baseline: unauthenticated users may access public landing/login/register assets and public endpoints; students and teachers may access only the normal authenticated features subject to resource ownership checks; only `admin` may perform existing administrator-only course/internship management. Teacher-specific grading, enrollment management, or student-record access has **not** been granted because no policy was specified. The `admin` value is retained as the existing administrator role label.

### Additional verification and limitations
- Added negative tests for `$` operator keys, dotted keys, excessive nesting, and oversized input structures.
- These checks do not replace route-by-route review. Malformed identifiers, mass assignment, and IDOR still require endpoint-specific tests, and dynamic integration testing should be performed in staging.
- Helmet's default CSP is retained rather than adding `unsafe-inline` or broad source wildcards. Confirm browser console behavior for every existing page in staging.


## Encryption, privacy, and Atlas hardening update (2026-10-21)

- MongoDB connections now use TLS by default with bounded pool sizes and connection/wait timeouts. Production refuses an explicit `MONGODB_TLS=false`; configure a dedicated least-privilege Atlas database user and a restricted network access list as documented in `ATLAS_HARDENING.md`. Atlas network access, backup/PITR, alerts, and encryption-at-rest settings still require dashboard verification.
- Production deployment is expected behind a trusted HTTPS-terminating reverse proxy. Configure `TRUST_PROXY=1` only when that proxy overwrites forwarded headers; production enables HSTS and rejects requests that Express does not recognize as secure; the edge proxy must redirect HTTP to HTTPS. Verify this behavior in the actual host/proxy topology before launch.
- Passwords use bcrypt hashing (cost 12) and are not reversibly encrypted. Password and profile-photo fields are excluded from normal Mongoose selection by default; photo data is explicitly selected only for the signed-in user's own profile and connected conversation list.
- Account, session, and AI-provider error logging no longer emits raw exception details; route handlers were also adjusted to avoid logging raw exception messages that can contain submitted values. Do not enable request-body or cookie/header logging in the hosting platform.
- **Private messaging exists, but is NOT end-to-end encrypted in this release.** `models/Message.js` stores plaintext message text and the authorized server returns plaintext to conversation participants. `E2EE_DESIGN.md` documents a reviewed-protocol direction and explicit design-review gate. No homemade cryptography or misleading E2EE claim was added. In the meantime, HTTPS, database TLS, Atlas at-rest encryption, and current connection-based access controls are the available safeguards.
- The privacy policy now states the current messaging limitation. Operators must still review it for actual retention, deletion, legal basis, jurisdiction, and contact details.
- No custom AES-256-GCM field encryption was added: a server-held encryption key would not provide E2EE, and adding it without an agreed key management, rotation, recovery, and migration plan would risk data loss while conflicting with the proposed E2EE direction. Atlas-managed encryption at rest is the current data-at-rest layer.

Verification remains limited to automated source-level tests and syntax checks; live Atlas settings, HTTPS edge behavior, backup restores, browser testing, and an expert-reviewed E2EE implementation are not verified by this package.

## Additional API, dependency, and deployment hardening (2026-10-21)

- Central request middleware now rejects `$` operator and dotted keys recursively, excessive nesting/keys, non-object payload roots, unexpected write fields on known API routes, and non-JSON content types for non-empty API writes. This is defense in depth; route handlers remain responsible for field types, lengths, enum values, dates, URLs, and authorization.
- List endpoints for projects, skills, applications, progress, courses, and internships now use bounded pagination (`limit` defaults to 100, maximum 100; `page`/`offset` are range-checked) and return pagination metadata. Community search, notifications, and message history retain their existing fixed limits.
- API responses set `Cache-Control: no-store`; unknown API paths return consistent JSON 404s; malformed/oversized request bodies return generic errors. Structured request-failure logs contain only request ID, method, status, and duration, not request bodies, query values, cookies, or authorization headers.
- Community/social endpoints have additional rate limits. The existing AI endpoint retains a stricter dedicated limit.
- Internship and course patch handlers now validate the allowed fields and their types/ranges before updates. Profile image uploads check MIME declaration and common file signatures as well as size; this is not a substitute for full image decoding/rewriting.
- See `SECURITY_DEPENDENCY_AUDIT.md` for exact dependency inventory and audit limitations. The maintained schema-validation package migration remains pending because package registry access was unavailable; do not represent custom guards as equivalent to a maintained schema validator.
- The uploaded source archive does not contain `.git`, so repository-history secret scanning was not possible. Deployment TLS/proxy, CORS, cookies, dependency audit, and end-to-end route authorization still require staging verification.
