const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('social posts use a separate bounded model and existing User relationship', () => {
  const model = read('models/Post.js');
  assert.match(model, /author:[\s\S]*ref:\s*'User'/);
  assert.match(model, /content:[\s\S]*maxlength:\s*2000/);
  assert.match(model, /timestamps:\s*true/);
});

test('post routes require a valid authenticated session and protect private profiles', () => {
  const route = read('routes/posts.js');
  assert.match(route, /router\.use\(\(req, res, next\)/);
  assert.match(route, /req\.session\?\.userId/);
  assert.match(route, /!profile\.publicProfile && String\(profile\._id\) !== String\(currentUserId\(req\)\)/);
  assert.match(route, /canViewAuthor\(post\.author, currentUserId\(req\)\)/);
});

test('post interaction targets are added without removing profile or certificate support', () => {
  const interactions = read('models/SocialInteraction.js');
  assert.match(interactions, /enum:\s*\['profile', 'certificate', 'post'\]/);
  assert.match(interactions, /partialFilterExpression:\s*\{ action: 'like' \}/);
});

test('post writes pass the existing request field allowlist and route is mounted', () => {
  const middleware = read('middleware/validateRequestInput.js');
  const server = read('server.js');
  assert.match(middleware, /POST.*api\\\/posts.*content/);
  assert.match(middleware, /api\\\/posts\\\/\[\^\/\]\+\\\/comments.*text/);
  assert.match(server, /app\.use\("\/api\/posts", postRoutes\)/);
});

test('post frontend uses safe text nodes and exposes all requested actions', () => {
  const frontend = read('public/js/posts.js');
  assert.match(frontend, /textContent\s*=\s*String\(text\)/);
  assert.match(frontend, /Appreciate/);
  assert.match(frontend, /element\('button', 'Comment'\)/);
  assert.match(frontend, /element\('button', 'Share'\)/);
  assert.doesNotMatch(frontend, /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/);
});
