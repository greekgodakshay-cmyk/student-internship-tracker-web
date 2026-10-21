# Authorized Staging Security Test Checklist

Use a disposable staging database and test accounts only. Do not run negative tests against production or third-party systems. Record request/response evidence with passwords, cookies, tokens, and private-message content redacted.

## Test fixtures

Create at least four accounts: Student A, Student B, Teacher, and Admin. Create records owned by A and B, a private and public profile, one active internship, one published and one draft course, and an accepted connection between two test accounts. Keep staging credentials separate from production.

## HTTP/API checks

1. **Auth bypass:** For each protected route, call it with no cookie and with a random invalid session cookie. Expect 401/redirect as documented; never data.
2. **Session fixation:** Save a pre-login session cookie, log in, and verify the authenticated session ID changes. Log out, replay the post-login cookie, and verify it no longer authorizes requests.
3. **Password handling:** Register a test user, inspect the DB record and verify password is a bcrypt hash and never appears in any API response. Test invalid password lengths and login failures.
4. **Rate limits:** Repeatedly call login/register/chat/community endpoints within the configured window. Verify 429 responses and that proxy configuration yields correct client IP behavior. Do not use real accounts.
5. **NoSQL/malformed input:** Submit `$where`, `$gt`, dotted keys, arrays/objects where strings are expected, overlong strings, malformed IDs, deeply nested JSON, invalid JSON, wrong content types, and oversized bodies. Expect 400/413/415, not a 500 or query behavior change.
6. **IDOR:** As Student A, attempt GET/PATCH/PUT/DELETE using Student B's project, skill, application, progress, notification, message, and follow IDs. Expect no disclosure or modification. Repeat in reverse.
7. **Privilege escalation:** Try to submit `role`, `publicProfile`, ownership IDs, publication flags, and other server-managed fields where not allowed. Verify only Admin can create/edit/delete courses and internships. Verify Teacher has no implicit admin privileges.
8. **XSS/navigation:** Put harmless test payloads such as `<img src=x onerror=alert(1)>` into permitted text fields and `javascript:alert(1)` into legacy/test URL fixtures. Verify text is rendered as text and unsafe links are omitted. Do not use destructive payloads.
9. **CSRF/CORS:** Send state-changing requests with a foreign `Origin`; verify 403. Test requests with no Origin only from a controlled test client and confirm intended API behavior. Confirm no wildcard credentialed CORS.
10. **Information leakage:** Trigger validation errors, invalid IDs, missing records, and controlled server-side failures. Responses must not contain stack traces, connection strings, provider keys, raw database errors, cookies, or request bodies.
11. **Upload abuse:** Try invalid base64, oversized profile images, MIME/signature mismatch, SVG, and valid PNG/JPEG/WebP. Expect rejection for unsupported content and bounded acceptance for valid images.
12. **Headers/cookies:** In a real browser against staging HTTPS, verify HSTS, CSP, X-Content-Type-Options, Referrer-Policy, `HttpOnly`, `Secure`, `SameSite=Lax`, and session expiry. Verify HTTP is redirected/rejected at the edge and `X-Forwarded-Proto` cannot be spoofed past the trusted proxy.
13. **Function regression:** Exercise registration/login/logout, profile edits/privacy, skills/projects CRUD, course progress, internship search/tracking, notifications, follows, comments/likes, direct messages, and admin workflows.
14. **Database controls:** Verify Atlas app user is scoped to the app database, IP list is restricted, TLS is active, backup/PITR policy is enabled as required, and restore works into a separate test cluster.

## Dependency and secret checks

Run from a clean checkout with registry access:

```sh
npm ci
npm audit --omit=dev
npm audit
npm outdated
```

Scan the real repository and its history with an approved secret scanner. If a secret is found, rotate it first; removing it from the latest tree is not sufficient.

## Exit criteria

For each check, record date, tester, build hash, request/response status, expected vs observed result, evidence path, severity, remediation owner, and retest result. Any unresolved critical/high finding requires an explicit written risk decision; otherwise block release.
