# Security and privacy decisions

Status of the open items from the security review. Each entry records what the code does now, the decision, and what remains open.

## 5. Direct messages are not end-to-end encrypted

**Status:** Confirmed. `models/Message.js` stores `text` as plaintext. The server reads and returns message content to the two conversation participants, and database operators with sufficient access can read it.

**Decision:** Keep the current design. Do not describe messaging as end-to-end encrypted anywhere in the product or documentation.

**Consistency check:** `E2EE_DESIGN.md`, `SECURITY_AUDIT.md`, `SECURITY_ACCEPTANCE_REPORT.md` and `public/privacy-policy.html` all state that messaging is not end-to-end encrypted. No document claims otherwise.

**Open:** End-to-end encryption is a future project, gated on the verification steps in `E2EE_DESIGN.md`. Until it ships, keep the privacy-policy wording.

## 6. Age gate for public profiles

**Status:** Confirmed gap. Registration records a consent checkbox but no date of birth. Age is optional and set later on the profile. Before this change, the public-profile route only blocked visibility when a stored age was under 18, so a user who left age blank could make the profile public.

**Fix applied:** `PATCH /api/community/privacy` now refuses to make a profile public unless an age is recorded, and refuses when the recorded age is under 18. The response tells the user to add their age first.

**Verified defaults:** `publicProfile` defaults to `false` in `models/User.js`.

**Open:**
- Age is self-declared. Nothing verifies it, so a minor can enter an adult age. Verifying age would need a date of birth and a method to check it, which is a product and legal decision.
- Registration does not collect age, so new accounts stay private until the user adds one.

## 7. Cross-origin check runs only when an Origin header is sent

**Status:** Behaviour confirmed in `server.js`. The check rejects a cross-origin state-changing request only when the browser sends an `Origin` header.

**Decision:** Accept this. Current browsers send `Origin` on cross-site POST, PATCH, PUT and DELETE requests. Session cookies use `SameSite=lax`, which blocks most cross-site writes even when no header is present. Rejecting requests that lack `Origin` would break non-browser clients for no clear gain.

**Open:** Revisit if the app adds cross-site embedding or a non-SameSite cookie.

## 8. Registration reveals whether an email exists

**Status:** Confirmed. A duplicate email returns 409 with a message.

**Decision:** Keep the current behaviour. The signup form needs a clear message so users know to sign in instead. Enumeration risk is reduced by the registration rate limit (10 attempts per 15 minutes per IP).

**Open:** If the risk changes, replace the message with a neutral one that also emails the existing account holder. That needs an email-delivery path, which the app does not have.
