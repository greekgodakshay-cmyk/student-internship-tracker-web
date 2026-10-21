const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("production sessions use Mongo-backed storage and secure cookie controls", () => {
  const server = read("server.js");
  assert.match(server, /new MongoSessionStore/);
  assert.match(server, /httpOnly:\s*true/);
  assert.match(server, /sameSite:\s*"lax"/);
  assert.match(server, /secure:\s*process\.env\.NODE_ENV === "production"/);
  assert.match(server, /maxAge:\s*8 \* 60 \* 60 \* 1000/);
  assert.doesNotMatch(server, /MemoryStore/);
});

test("server rejects missing or weak session secrets and missing database URI", () => {
  const server = read("server.js");
  assert.match(server, /Buffer\.byteLength\(process\.env\.SESSION_SECRET[\s\S]{0,100}< 32/);
  assert.match(server, /if \(!process\.env\.MONGODB_URI\)/);
});

test("login regenerates session and logout destroys it and clears the correct cookie", () => {
  const auth = read("routes/auth.js");
  assert.match(auth, /req\.session\.regenerate/);
  assert.match(auth, /req\.session\.destroy/);
  assert.match(auth, /clearCookie\("sit\.sid"/);
});

test("sensitive auth endpoints have a dedicated limiter", () => {
  const server = read("server.js");
  assert.match(server, /app\.use\("\/api\/auth\/login", authLimiter\)/);
  assert.match(server, /app\.use\("\/api\/auth\/register", authLimiter\)/);
});

test("uploaded environment secrets are not included in release and example is placeholder-only", () => {
  assert.equal(fs.existsSync(path.join(root, ".env")), false);
  const example = read(".env.example");
  assert.match(example, /replace-with-at-least-32-random-bytes/);
  assert.doesNotMatch(example, /mongodb\+srv:\/\/[^<\s]+/i);
});

test("admin role is not accepted from registration request body", () => {
  const auth = read("routes/auth.js");
  assert.match(auth, /role:\s*"student"/);
  assert.doesNotMatch(auth, /role:\s*req\.body\.role/);
});


test("NoSQL input guard rejects operator and dotted keys recursively", () => {
  const { inspectValue } = require("../middleware/validateRequestInput");
  assert.match(inspectValue({ email: "x@example.com", $where: "return true" }, { nodes: 0 }), /unsupported field/i);
  assert.match(inspectValue({ profile: { "role.admin": true } }, { nodes: 0 }), /unsupported field/i);
  assert.equal(inspectValue({ name: "Alice", skills: ["JS", "MongoDB"] }, { nodes: 0 }), null);
});

test("NoSQL input guard bounds nested and oversized structures", () => {
  const { inspectValue } = require("../middleware/validateRequestInput");
  let nested = "x";
  for (let i = 0; i < 14; i++) nested = { value: nested };
  assert.match(inspectValue(nested, { nodes: 0 }), /nested too deeply/i);
  assert.match(inspectValue({ a: Array.from({ length: 1002 }, () => "x") }, { nodes: 0 }), /too many values/i);
});

test("user schema supports teacher while retaining existing admin role compatibility", () => {
  const model = read("models/User.js");
  assert.match(model, /enum:\s*\["student",\s*"teacher",\s*"admin"\]/);
});


test("database connections enable TLS by default and bound pool/timeout settings", () => {
  const database = read("config/database.js");
  assert.match(database, /tls:\s*tlsEnabled/);
  assert.match(database, /maxPoolSize:/);
  assert.match(database, /waitQueueTimeoutMS:/);
  assert.match(database, /NODE_ENV === "production" && !tlsEnabled/);
});

test("production transport expects trusted proxy and enables HTTPS/HSTS controls", () => {
  const server = read("server.js");
  assert.match(server, /NODE_ENV === "production" && process\.env\.TRUST_PROXY !== "1"/);
  assert.match(server, /strictTransportSecurity:/);
  assert.match(server, /!req\.secure/);
  assert.match(server, /HTTPS is required/);
});

test("direct-message E2EE limitations are documented accurately", () => {
  const design = read("E2EE_DESIGN.md");
  assert.match(design, /not end-to-end encrypted/i);
  assert.match(design, /Double Ratchet/);
  assert.match(design, /server must not have decryption keys/i);
  assert.match(design, /implementation intentionally gated/i);
});

test("Atlas dashboard hardening and manual configuration are documented", () => {
  const guide = read("ATLAS_HARDENING.md");
  assert.match(guide, /Database Access/);
  assert.match(guide, /Network Access/);
  assert.match(guide, /backup/i);
  assert.match(guide, /0\.0\.0\.0\/0/);
});


test("write endpoint allowlists reject unexpected mass-assignment fields", () => {
  const { FIELD_RULES } = require("../middleware/validateRequestInput");
  const rule = FIELD_RULES.find(([method, pattern]) => method === "PATCH" && pattern.test("/api/auth/me"));
  assert.ok(rule);
  assert.ok(rule[2].includes("bio"));
  assert.equal(rule[2].includes("role"), false);
  assert.equal(rule[2].includes("password"), false);
});

test("input middleware rejects non-JSON writes and invalid pagination consistently", () => {
  const { validateRequestInput } = require("../middleware/validateRequestInput");
  const invoke = (overrides = {}) => {
    let status = 200;
    let body;
    let nextCalled = false;
    const req = {
      method: "POST", path: "/auth/register", originalUrl: "/api/auth/register",
      url: "/auth/register", body: { name: "A", email: "a@example.com", password: "password" },
      query: {}, get: (name) => ({ "content-length": "20", "content-type": "text/plain" }[name]),
      ...overrides
    };
    const res = { status(code) { status = code; return this; }, json(value) { body = value; return this; } };
    validateRequestInput(req, res, () => { nextCalled = true; });
    return { status, body, nextCalled, req };
  };
  const badType = invoke();
  assert.equal(badType.status, 415);
  assert.equal(badType.nextCalled, false);
  const badPage = invoke({ method: "GET", originalUrl: "/api/projects?page=0", body: undefined, query: { page: "0" }, get: () => undefined });
  assert.equal(badPage.status, 400);
  const good = invoke({ method: "POST", originalUrl: "/api/auth/register", get: (name) => ({ "content-length": "20", "content-type": "application/json" }[name]) });
  assert.equal(good.nextCalled, true);
  assert.equal(good.req.pagination.limit, 100);
});

test("list endpoints expose bounded pagination and total counts", () => {
  for (const file of ["routes/projects.js", "routes/skills.js", "routes/applications.js", "routes/progress.js", "routes/courses.js", "routes/internships.js"]) {
    const source = read(file);
    assert.match(source, /\.skip\(skip\)/, `${file} should apply skip`);
    assert.match(source, /\.limit\(limit\)/, `${file} should apply a bounded limit`);
    assert.match(source, /pagination:/, `${file} should report pagination metadata`);
  }
});


test("API responses disable caching and errors are logged without request payloads", () => {
  const server = read("server.js");
  assert.match(server, /Cache-Control", "no-store"/);
  assert.match(server, /X-Request-ID/);
  assert.match(server, /http_request_failed/);
  assert.doesNotMatch(server, /console\.(?:log|warn|error)\([^\n]*(?:req\.body|req\.query|authorization|cookie)/i);
});

test("profile photo data must match PNG/JPEG/WebP file signatures", () => {
  const auth = read("routes/auth.js");
  assert.match(auth, /isPng/);
  assert.match(auth, /isJpeg/);
  assert.match(auth, /isWebp/);
});
