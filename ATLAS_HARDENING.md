# MongoDB Atlas and production transport hardening

This application uses Mongoose. `config/database.js` enables MongoDB TLS by default (`MONGODB_TLS=true`), sets bounded connection-pool and timeout values, and disables automatic index creation in production. For Atlas SRV connection strings (`mongodb+srv://`), TLS is also enabled by the driver by default; the explicit TLS option makes the requirement visible. Never set `MONGODB_TLS=false` in production.

## Required manual Atlas dashboard configuration

1. **Database Access → Database Users:** create a dedicated application user for this app and database. Grant only the database-level read/write role needed for the application's database (for example, `readWrite` on the one application database). Do not use the Atlas project owner or an Atlas administrator account as the application credential. Use a separate, more restricted read-only account for reporting if needed.
2. **Network Access → IP Access List:** allow only the production egress IP addresses or private-network ranges used by the hosting provider. Avoid `0.0.0.0/0` as a permanent production rule. If the host has dynamic egress, configure private networking or a stable egress gateway. Keep development and production allowlists separate.
3. **Database → Clusters → Security/Backup settings:** verify encryption at rest is enabled (Atlas-managed encryption is normally enabled by default), and enable the backup/PITR tier appropriate to the service's recovery-point and recovery-time objectives. Confirm backup retention and test a restore into a separate test cluster. Do not assume a backup exists without checking the selected cluster tier and settings.
4. **Monitoring:** configure alerts for failed authentication, unusual connection volume, storage, CPU, and backup failures. Review database audit-log availability for the chosen Atlas tier. Do not log request bodies, passwords, session cookies, authorization headers, private-message content, or full connection strings in the application.
5. **Credentials:** keep `MONGODB_URI` in the deployment platform's server-side secret manager/environment configuration, not in source control, browser JavaScript, or client-visible build variables. Rotate the database password on a documented schedule and immediately after suspected exposure. Use separate database users and credentials for development, test, and production.
6. **Indexes:** review indexes using Atlas Performance Advisor and query profiling. This project has schema indexes for common relationships; production index creation is intentionally not automatic. Apply reviewed index migrations in a maintenance window and monitor query plans. Keep API result limits and request limits in place.

## HTTPS / TLS at the application edge

The Node app expects a trusted HTTPS-terminating reverse proxy in production. Set `NODE_ENV=production` and `TRUST_PROXY=1` only when that single trusted proxy overwrites forwarded headers; configure TLS certificates, modern TLS versions, and HTTP-to-HTTPS redirects at that proxy/platform. The application rejects requests it does not recognize as secure and sends HSTS in production; the edge proxy must perform the HTTP-to-HTTPS redirect. Do not expose the app directly to the public internet while bypassing the proxy. If your hosting platform uses a different proxy topology, adapt and verify the trust-proxy setting before deployment rather than blindly trusting forwarded headers.

## Environment variables

- `MONGODB_URI`: server-only Atlas connection string.
- `MONGODB_TLS`: defaults to enabled; production must keep it enabled.
- `MONGODB_MAX_POOL_SIZE` / `MONGODB_MIN_POOL_SIZE`: connection pool bounds; tune to the app's concurrency and Atlas tier.
- `TRUST_PROXY=1`: only behind the trusted single HTTPS-terminating proxy described above.

The app cannot configure Atlas project settings, IP access lists, backup plans, or dashboard alerts from code. These are deployment-owner actions and must be verified in Atlas.
