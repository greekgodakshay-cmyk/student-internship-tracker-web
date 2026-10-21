const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function filesUnder(relativePath, predicate = () => true) {
  const base = path.join(root, relativePath);
  const found = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (predicate(full)) found.push(full);
    }
  }
  walk(base);
  return found;
}

test("passwords are hashed, excluded by default, and not returned in auth responses", () => {
  const model = read("models/User.js");
  const auth = read("routes/auth.js");
  assert.match(model, /password:\s*\{[\s\S]*?select:\s*false/);
  assert.match(auth, /bcrypt\.hash\(password,\s*12\)/);
  assert.match(auth, /bcrypt\.compare\(password,\s*user\.password\)/);
  assert.doesNotMatch(auth, /password:\s*user\.password/);
});

test("project, application, and progress data access is scoped to the session user", () => {
  const projects = read("routes/projects.js");
  const applications = read("routes/applications.js");
  const progress = read("routes/progress.js");
  assert.match(projects, /router\.use\(requireAuth\)/);
  assert.match(projects, /\{\s*_id:\s*id,\s*user:\s*req\.session\.userId\s*\}/);
  assert.match(applications, /router\.use\(requireAuth\)/);
  assert.match(applications, /user:\s*req\.session\.userId/);
  assert.match(progress, /router\.use\(auth\)/);
  assert.match(progress, /filter\s*=\s*\{user:req\.session\.userId\}/);
});

test("admin course and internship operations re-check the database role", () => {
  const courses = read("routes/courses.js");
  const internships = read("routes/internships.js");
  assert.match(courses, /User\.findById\(req\.session\.userId\)\.select\("role"\)/);
  assert.match(courses, /router\.post\("\/",\s*requireAuth,\s*requireAdmin/);
  assert.match(internships, /User\.findById\(req\.session\.userId\)\.select\("role"\)/);
  assert.match(internships, /router\.post\("\/",\s*requireAdmin/);
});

test("unsafe HTML injection sinks are absent from shipped frontend JavaScript", () => {
  const scripts = filesUnder("public/js", (file) => file.endsWith(".js"));
  assert.ok(scripts.length > 0);
  const unsafeSink = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser)\b|\beval\s*\(|new\s+Function\s*\(/;
  for (const file of scripts) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, unsafeSink, `${path.relative(root, file)} contains a dangerous DOM/code sink`);
  }
});

test("state-changing browser requests are same-origin checked and no wildcard CORS is configured", () => {
  const server = read("server.js");
  assert.match(server, /\["GET", "HEAD", "OPTIONS"\]\.includes\(req\.method\)/);
  assert.match(server, /origin\.host !== expectedHost/);
  assert.match(server, /Cross-origin request blocked/);
  assert.doesNotMatch(server, /Access-Control-Allow-Origin.*\*/i);
  assert.doesNotMatch(server, /cors\(\s*\{\s*origin:\s*true/i);
});

test("API errors do not expose stacks, raw exception messages, or request bodies", () => {
  const server = read("server.js");
  assert.match(server, /An unexpected server error occurred/);
  assert.doesNotMatch(server, /res\.(?:json|send)\([^\n]*(?:error\.stack|error\.message|err\.stack|err\.message)/i);
  assert.doesNotMatch(server, /console\.(?:log|warn|error)\([^\n]*(?:req\.body|req\.headers|req\.query|cookie|authorization)/i);
});

test("social path identifiers reject malformed ObjectIds before database operations", () => {
  const social = read("routes/socialFeatures.js");
  assert.match(social, /router\.delete\('\/follow\/:id',async\(req,res\)=>\{const target=req\.params\.id;if\(!mongoose\.isValidObjectId\(target\)\)/);
  assert.match(social, /router\.post\('\/follow-requests\/:id\/accept',async\(req,res\)=>\{if\(!mongoose\.isValidObjectId\(req\.params\.id\)\)/);
});

test("profile image uploads are bounded and checked against actual file signatures", () => {
  const auth = read("routes/auth.js");
  assert.match(auth, /850 \* 1024/);
  assert.match(auth, /imageBytes\.subarray\(0, 8\)\.equals/);
  assert.match(auth, /imageBytes\.toString\("ascii", 8, 12\) === "WEBP"/);
});

test("release hygiene excludes environment files and dependency audit status is explicitly documented", () => {
  assert.equal(fs.existsSync(path.join(root, ".env")), false);
  const ignore = read(".gitignore");
  assert.match(ignore, /\.env/);
  assert.match(ignore, /\.pem/);
  const audit = read("SECURITY_DEPENDENCY_AUDIT.md");
  assert.match(audit, /npm audit/i);
  assert.match(audit, /registry|network|unknown|unverified/i);
});

test("persisted external URLs are scheme-checked before browser navigation", () => {
  const frontend = read("public/js/script.js");
  assert.match(frontend, /function safeHttpUrl\(value\)[\s\S]*?\["http:", "https:"\]\.includes\(url\.protocol\)/);
  assert.match(frontend, /const videoHref[\s\S]*?safeHttpUrl\(lesson\.videoUrl\)/);
  assert.match(frontend, /const resourceHref = safeHttpUrl\(lesson\.resourceUrl\)/);
  assert.match(frontend, /const applicationHref = safeHttpUrl\(internship\.applicationUrl\)/);
  assert.doesNotMatch(frontend, /videoLink\.href\s*=\s*lesson\.videoUrl/);
  assert.doesNotMatch(frontend, /resourceLink\.href\s*=\s*lesson\.resourceUrl/);
  assert.doesNotMatch(frontend, /link\.href\s*=\s*internship\.applicationUrl/);
  assert.ok(frontend.includes('data:image\\/(?:png|jpeg|webp);base64,'));

  // Execute the actual helper with a minimal browser-origin stub.
  const helper = frontend.match(/function safeHttpUrl\(value\) \{[\s\S]*?\n\}/);
  assert.ok(helper, "safeHttpUrl helper must be present");
  const context = { window: { location: { origin: "https://app.example" } }, URL };
  vm.runInNewContext(`${helper[0]}\nglobalThis.safeHttpUrl = safeHttpUrl;`, context);
  assert.equal(context.safeHttpUrl("javascript:alert(1)"), "");
  assert.equal(context.safeHttpUrl("data:text/html,hello"), "");
  assert.equal(context.safeHttpUrl("https://example.com/path"), "https://example.com/path");
});
