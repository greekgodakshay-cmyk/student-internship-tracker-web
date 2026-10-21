# Security Acceptance Report

Date: 2026-10-21  
Scope: source archive `student-internship-tracker-security-verification(1).zip` and this continuation. No production environment, live Atlas database, or third-party target was tested.

## Executive decision

**Status: NOT YET READY FOR FINAL SECURITY ACCEPTANCE.** The source-level test suite passes, and a client-side unsafe-link handling gap was hardened. There are no confirmed critical/high vulnerabilities from this source-only review, but that is not equivalent to proving none exist. Several required acceptance checks cannot be completed without network-enabled dependency installation, a disposable MongoDB test database, and an authorized staging deployment.

## Phase workflow

| Phase | Work and evidence | Status |
|---|---|---|
| A — Repository inspection and threat model | Inspected `server.js`, all route modules, models, middleware, frontend assets, tests, lockfile, and security/deployment docs. No source changes were made until initial findings were presented. | Reviewed |
| B — Prioritized findings and remediation plan | Priorities: (1) actual multi-user authorization and session integration tests; (2) dependency audit and clean install; (3) maintained schema validator integration; (4) browser URL/XSS and CSRF testing; (5) verify Atlas/proxy/cookie/backup settings. | Documented |
| C — Authentication, sessions, authorization | Existing controls reviewed: bcrypt, session regeneration/destruction, Mongo-backed sessions, admin role checks, route ownership filters. Existing tests assert source patterns only. | Partially verified |
| D — MongoDB security, validation, injection | Existing recursive NoSQL-key guard, field allowlists, JSON-only writes, pagination caps, and TLS/pool config reviewed. No live DB integration tests. | Partially verified |
| E — Browser security, CSRF, XSS, headers | Added scheme checks before using persisted lesson/internship URLs; added regression assertion. Existing sink scan found no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`, `eval`, or `new Function` usage in shipped JS. No browser/DAST run. | Source checks passed; browser tests pending |
| F — Secrets, dependencies, encryption, deployment | `.env` absent; `.env.example` is placeholder-only; `.gitignore` covers environment files, logs, dumps, and private-key extensions. Atlas, TLS, session, E2EE, and dependency limitations are documented. `npm audit` and clean install were blocked by registry DNS/network. Git history unavailable. | Partially verified |
| G — Automated tests and final verification | `node --test`: 28 passed, 0 failed. JavaScript syntax check passed. Archive will exclude `.env`, `.git`, and `node_modules`. | Local source checks passed; integration pending |

## Findings and remediation record

### LOW — Persisted URLs were assigned to navigation links without a final browser-side scheme check

- **Affected file:** `public/js/script.js`; course lesson video/resource links and internship application links.
- **Behavior / scenario:** Server-side create/update validation restricts new values to HTTP(S), but older or manually altered database records could contain `javascript:` URLs. Direct assignment to `href` could permit script execution when a user activates such a link.
- **Fix:** Added `safeHttpUrl()` and now validate lesson video, lesson resource, and internship application URLs immediately before creating links. Profile image data URLs are also limited client-side to PNG/JPEG/WebP base64 prefixes.
- **Test:** `test/security-risk-based.test.js` test `persisted external URLs are scheme-checked before browser navigation`; `node --test` passed.
- **Residual risk:** This is a source-level regression assertion, not browser execution. Verify malicious URLs are omitted in a real browser and inspect historical database records if they may contain legacy values.

### UNASSESSED — Dependency vulnerabilities

- **Affected files:** `package.json`, `package-lock.json`.
- **Behavior / scenario:** The dependency graph has not received a successful vulnerability database response in this environment. No clean bill of health can be claimed.
- **Fix:** No package versions were blindly upgraded. No new validator dependency was added without registry access and a verifiable lockfile.
- **Test evidence:** `npm audit --audit-level=low` failed with `EAI_AGAIN` resolving `registry.npmjs.org`. `npm ci --ignore-scripts --no-audit --no-fund` timed out; the partial `node_modules` directory was removed. `npm ls --depth=0` on the incomplete install reported invalid/extraneous entries and is not a valid installed-tree result.
- **Required action:** In a network-enabled clean checkout, run `npm ci`, `npm audit --omit=dev`, `npm audit`, and `npm outdated`. Review each advisory and update only with a tested lockfile change.

### UNVERIFIED — Endpoint-level authorization and IDOR

- **Affected endpoints:** All authenticated routes, especially project, skill, application, progress, community, social messages, course administration, and internship administration.
- **Behavior / scenario:** A student could attempt to read or modify another user's record by substituting an object ID, or an unauthorized role could attempt admin operations.
- **Current controls:** The source has ownership-scoped queries in reviewed routes and database-backed `admin` role checks for course/internship administration.
- **Test evidence:** Existing Node tests assert selected source patterns; no live HTTP/Mongo test has exercised every route with multiple users and roles.
- **Required action:** Run the staging matrix in `SECURITY_STAGING_CHECKLIST.md`. Treat this as a release blocker until observed results are recorded.

### UNVERIFIED — Maintained schema validation

- **Affected file:** `middleware/validateRequestInput.js` and all write routes.
- **Behavior / scenario:** Central key filtering and endpoint field allowlists reduce injection/mass assignment risk, but do not independently prove every value has the correct type, format, length, enum, and nested shape.
- **Current controls:** Global request-size caps, recursive `$`/dot-key rejection, known-field allowlists, JSON-only writes, pagination bounds, and route-level validation.
- **Required action:** Add a maintained schema-validation library (for example, Zod or express-validator) in a network-enabled change, lock it, and define schemas for every endpoint. Test invalid types and nested objects at the HTTP boundary.

### UNVERIFIED — Production deployment and Atlas configuration

- **Affected files/docs:** `server.js`, `config/database.js`, `config/mongoSessionStore.js`, `ATLAS_HARDENING.md`.
- **Current controls:** MongoDB TLS enabled by default; production rejects TLS disablement; production requires `TRUST_PROXY=1`; HSTS is enabled in production; session cookies use HttpOnly, SameSite=Lax, and Secure in production.
- **Required action:** Verify actual HTTPS redirects, certificate chain, proxy header overwrites, cookie attributes, host/domain behavior, Atlas least-privilege user, IP allowlist/private networking, backups/PITR, restore, monitoring, and distinct staging/production credentials. Source configuration alone is not proof of deployment configuration.

### DOCUMENTED — Direct-message encryption, rate-limit topology, and secrets history

- Private messages are stored as plaintext in MongoDB and are **not end-to-end encrypted**. The E2EE design is a proposal, not an implemented protocol.
- Express rate limits currently use the default in-process store. This is adequate only as a per-process guard; a horizontally scaled deployment should configure a maintained shared store and verify client IP handling behind its proxy.
- The ZIP has no `.git` history, so prior committed secrets cannot be checked. If credentials were ever shared or committed, rotate them at their issuing service and scan/rewrite repository history as a separate controlled operation.

## Commands executed and observed results

| Command | Result |
|---|---|
| `node --test` | **28 passed, 0 failed** |
| `find . -path './node_modules' -prune -o -type f -name '*.js' -print0 \| xargs -0 -n1 node --check` | Passed |
| `npm audit --audit-level=low` | Failed: registry DNS `EAI_AGAIN`; vulnerability status unknown |
| `npm ci --ignore-scripts --no-audit --no-fund` | Timed out waiting for network; clean install unverified |
| `npm ls --depth=0` after timed-out install | Failed on partial tree with invalid/extraneous entries; not a meaningful dependency verification |
| Source scan for obvious dangerous DOM/code sinks | No matches at time of scan |
| Secret-pattern scan of non-document source files | No actual connection string/private key/API key found; `.env.example` contains a placeholder session secret |

## Acceptance checklist

- [x] No `.env` or installed dependencies included in release archive.
- [x] Password hashing, session regeneration/destruction, role checks, ownership patterns, NoSQL guard, write allowlists, rate limiting, headers, and error handling have source-level tests.
- [x] Added regression check for safe HTTP(S) navigation links.
- [x] Atlas manual settings and E2EE limitations documented.
- [ ] Successful dependency audit and clean reproducible `npm ci`.
- [ ] Maintained schema-validation library integrated and schemas/tests cover every endpoint.
- [ ] Live auth/session invalidation and brute-force tests.
- [ ] Multi-user IDOR/role matrix against a disposable MongoDB database.
- [ ] Real-browser CSRF, XSS, cookie, CSP, CORS, and HTTPS checks.
- [ ] Staging regression suite and authorized DAST scan.
- [ ] Atlas IP restriction, least privilege, backups, restore, and production proxy/cookie configuration verified by deployment owner.
- [ ] Git history scanned for secrets; rotate any exposed credentials.

## Final recommendation

This release is suitable for continued staging review, **not final production security acceptance**. Do not mark the project fully accepted until the unchecked items are completed or formally risk-accepted by the service owner. Keep the app off production data while performing negative security tests.
