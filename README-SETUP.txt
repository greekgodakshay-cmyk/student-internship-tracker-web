STUDENT INTERNSHIP & SKILL TRACKER — SETUP

REQUIREMENTS
1. Install Node.js 20 or newer.
2. Open this extracted folder in VS Code.
3. Restore your private database configuration: copy the .env file from your existing local project into this folder. The archive deliberately does not include database credentials. If you no longer have your .env file, copy .env.example to .env and fill in your own MongoDB Atlas URI and a long random SESSION_SECRET.
4. Open a terminal in this folder and run: npm install
5. Run: npm run dev
6. Open http://localhost:3000

DATABASE
MongoDB Atlas must be reachable from your current IP. If connection fails, check Atlas Network Access / IP access list and database user credentials. Do not set 0.0.0.0/0 permanently for production. Never publish .env or send it to anyone.

FEATURES IN THIS UPDATE
- Professional light UI inspired by LinkedIn and Indeed, with higher-contrast, larger text and restrained blue/white/slate colors.
- Real dashboard analytics from saved data: completed courses, skills shared, completed projects, certificate links, internships applied for, and applications tracked. Counts are not fabricated.
- Course completion tracking saved through /api/progress and the existing MongoDB Progress model.
- Profile visibility switch. Public profiles can appear in people search; private profiles are excluded. Public profile details, skills, and certificate links are returned only for public profiles.
- Search for public people and active internship listings.
- Like, comment, and share actions on public profiles and certificate entries.
- Existing authentication, course, skill, project, internship, application, and admin routes are retained.

IMPORTANT LIMITATIONS / LAUNCH CHECKLIST
- Certificate entries currently use the existing Project.certificateUrl field. This feature displays and shares certificate links; it does not add binary file uploads.
- Public profile visibility is disabled by default. Users must opt in. Accounts with a stored age under 18 cannot turn on public visibility.
- The displayed phone number +91 80000 00000 is a placeholder. Replace it before public deployment.
- Privacy Policy and Terms of Service are starter documents and must be reviewed for your actual service and jurisdiction.
- The age checkbox is a self-declaration, not verified parental consent.
- Run through registration, login/logout, profile privacy, searching, course completion, skill/project CRUD, internship tracking, comments and likes against your own MongoDB Atlas database before deployment.

UPDATE NOTES (2026-10-19)
- Added a dashboard quick-search field that routes queries to the existing community search.
- Expanded community search to include published courses and aggregated skill matches, with a two-character minimum and escaped partial-match queries.
- Added administrator-only PATCH/DELETE endpoints for courses and internships. Course deletion is refused when progress history exists; internship deletion is refused when applications reference the listing, so records are not orphaned.
- Improved logout contrast and responsive search styling.

Verification performed on this update:
- `node --check` passed for server.js, all route files, all model files, and config files.
- Browser, authenticated API, and live MongoDB integration tests were not run in this environment. Configure .env and run against a test database before deployment.
