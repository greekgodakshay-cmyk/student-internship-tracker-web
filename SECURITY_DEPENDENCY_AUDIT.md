# Dependency, secrets, and deployment review

## Dependency inventory

The release lockfile pins these direct dependencies:

| Package | Locked version | Purpose |
| --- | --- | --- |
| `@google/genai` | `2.30.0` | AI assistant integration |
| `bcryptjs` | `3.0.3` | One-way password hashing |
| `dotenv` | `18.0.8` | Local environment configuration |
| `express` | `5.3.0` | HTTP server |
| `express-rate-limit` | `8.7.1` | Request throttling |
| `express-session` | `1.19.0` | Session management |
| `helmet` | `8.3.0` | HTTP security headers |
| `mongoose` | `9.11.2` | MongoDB object modeling |

These are inventory values, not a statement that every version is current or vulnerability-free.

## Audit status

`npm audit --json` was attempted while preparing this release, but the npm registry could not be resolved (`EAI_AGAIN registry.npmjs.org`). Consequently, no current vulnerability database response was received and **dependency vulnerability status remains unverified**. Re-run in a network-enabled build environment:

```sh
npm ci
npm audit --omit=dev
npm audit
npm outdated
```

Review each finding and its fix range before upgrading. Do not blindly force major-version upgrades. Commit the resulting lockfile only after the test suite and a staging smoke test pass.

## Secret and repository-history status

- `.env` is excluded from this release package; `.env.example` contains placeholders.
- `.gitignore` excludes environment files, logs, database exports, and common private-key/certificate bundle extensions.
- This input was a ZIP archive without a `.git` directory. Repository history could not be inspected, so no claim is made that past commits are secret-free.
- If credentials were ever committed or shared, rotate them at the issuing service first. Deleting a secret from the latest tree is not sufficient; clean repository history with a coordinated history rewrite and invalidate old credentials.

## Deployment checks

- Set `NODE_ENV=production` and supply secrets using the hosting provider's server-side environment-variable settings.
- Keep frontend API calls same-origin or configure an explicit, reviewed CORS allowlist if the architecture changes. Do not use wildcard credentialed CORS.
- Configure the HTTPS edge to redirect HTTP to HTTPS and overwrite forwarded headers. Set `TRUST_PROXY=1` only behind the documented single trusted reverse proxy; do not set it for direct public exposure.
- Confirm `sit.sid` is Secure in production, the hosting domain matches the cookie scope, and staging/production secrets and databases differ.
- Session data is stored in MongoDB. Profile photos are currently stored as data URLs in MongoDB, not on ephemeral local disk. There is no general-purpose file upload endpoint in this codebase.
- Review the fixed external AI provider integration, set spending/usage limits at the provider, and retain the chat-specific rate limit.
- Validate the actual deployed frontend API URLs, TLS certificate chain, proxy behavior, cookie behavior, CORS policy, and error responses with a staging browser test.

## Validation note

This release adds centralized NoSQL key rejection, request-shape checks, per-route field allowlists for known write endpoints, JSON-only API writes, pagination parameter bounds, bounded request sizes, and additional social/community rate limits. The existing endpoint handlers retain field-specific validation and ownership checks. A maintained schema-validation package could not be installed or lockfile-verified because npm registry access was unavailable in this environment. Treat migration to a maintained validator (for example, Zod or express-validator) as a required follow-up in a network-enabled build, and cover every endpoint with schema-level and integration tests before production.
