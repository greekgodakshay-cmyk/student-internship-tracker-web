# Student Internship & Skill Tracker — social features update

## Included changes
- Added persistent notifications, follow relationships, and messages using new Mongoose models.
- Added authenticated `/api/social` endpoints for notification inbox/read state, follow/unfollow, follow requests, profile counts, conversations, and messages.
- Course publish and internship activation/create events create stored notifications.
- Profile/certificate likes and comments create profile-activity notifications.
- Added notification badge, inbox panel, messages icon/panel, follow buttons, and public profile counts in the existing dashboard.
- Existing models and routes are retained; no destructive migrations or existing record rewrites are performed.

## Setup
1. Copy these source files into your existing project (or use this complete source archive as a replacement for source files).
2. Keep your existing local `.env` file. It must contain `MONGODB_URI` and a strong `SESSION_SECRET`; this archive intentionally excludes `.env` and `node_modules`.
3. From the project folder run `npm install`, then `npm run dev`.
4. Log in with an existing account. Course/internship notifications are generated for events occurring after this update is installed.

## Security notes
- All social endpoints require an authenticated, valid session.
- Message reads and writes require an accepted follow relationship in at least one direction.
- Follow requests for private profiles remain pending until accepted; public profiles are followed immediately.
- Message text is validated and length-limited; profile IDs are validated server-side.
- Never commit `.env` or share its contents.

## Verification performed
- `node --check` passed for all 24 JavaScript files.
- Static inspection confirmed the existing server route registration, models, routes, and dashboard scripts remain present.
- A live MongoDB-backed integration test was not run in this environment; verify with your configured Atlas connection before deployment.
