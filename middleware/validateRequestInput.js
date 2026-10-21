"use strict";

const MAX_DEPTH = 12;
const MAX_KEYS = 1000;
const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Route-level field allowlists prevent mass assignment even when a handler
// accidentally passes request data onward. Existing handlers still perform
// semantic validation (formats, ranges, enums, ownership, etc.).
const FIELD_RULES = [
  ["POST", /^\/api\/auth\/register$/, ["name", "email", "password", "ageConsent", "termsConsent"]],
  ["POST", /^\/api\/auth\/login$/, ["email", "password"]],
  ["PATCH", /^\/api\/auth\/me$/, ["age", "professionType", "college", "degree", "studyYear", "fieldOfStudy", "location", "hobbies", "bio", "photoData"]],
  ["POST", /^\/api\/chat\/?$/, ["message"]],
  ["POST", /^\/api\/skills\/?$/, ["name", "category", "proficiency"]],
  ["POST", /^\/api\/projects\/?$/, ["title", "description", "technologies", "projectUrl", "certificateUrl", "completedAt"]],
  ["PUT", /^\/api\/projects\/[^/]+$/, ["title", "description", "technologies", "projectUrl", "certificateUrl", "completedAt"]],
  ["POST", /^\/api\/applications\/?$/, ["internshipId", "status", "notes"]],
  ["PATCH", /^\/api\/applications\/[^/]+$/, ["status", "notes"]],
  ["POST", /^\/api\/courses\/?$/, ["title", "description", "category", "level", "instructor", "lessons", "isPublished"]],
  ["POST", /^\/api\/courses\/[^/]+\/lessons$/, ["title", "description", "videoUrl", "resourceUrl"]],
  ["PATCH", /^\/api\/courses\/[^/]+$/, ["title", "description", "category", "level", "instructor", "isPublished"]],
  ["PATCH", /^\/api\/courses\/[^/]+\/lessons\/[^/]+$/, ["title", "description", "videoUrl", "resourceUrl"]],
  ["POST", /^\/api\/internships\/?$/, ["title", "company", "description", "location", "workMode", "requiredSkills", "applicationUrl", "deadline", "isActive"]],
  ["PATCH", /^\/api\/internships\/[^/]+\/active$/, ["isActive"]],
  ["PATCH", /^\/api\/internships\/[^/]+$/, ["title", "company", "description", "location", "workMode", "requiredSkills", "applicationUrl", "deadline", "isActive"]],
  ["PATCH", /^\/api\/community\/privacy$/, ["publicProfile"]],
  ["POST", /^\/api\/community\/interactions\/[^/]+\/[^/]+\/comments$/, ["text"]],
  ["PATCH", /^\/api\/social\/notifications\/read$/, ["id"]],
  ["POST", /^\/api\/social\/messages\/[^/]+$/, ["text"]]
];

function inspectValue(value, state, depth = 0) {
  if (depth > MAX_DEPTH) return "Request input is nested too deeply.";
  if (++state.nodes > MAX_KEYS) return "Request input contains too many values.";
  if (value === null || typeof value !== "object") return null;

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      return "Request contains an unsupported field name.";
    }
    const error = inspectValue(value[key], state, depth + 1);
    if (error) return error;
  }
  return null;
}

function validateRequestInput(req, res, next) {
  const state = { nodes: 0 };
  for (const value of [req.body, req.query]) {
    const error = inspectValue(value, state);
    if (error) return res.status(400).json({ message: error });
  }

  if (req.body !== undefined && req.body !== null &&
      (typeof req.body !== "object" || Array.isArray(req.body))) {
    return res.status(400).json({ message: "Request body must be a JSON object." });
  }

  // API writes accept JSON only. Empty-body actions (e.g. follow/like) remain
  // valid without a Content-Type header. This blocks unexpected form/text types.
  const hasRequestBody = req.body !== undefined || Number(req.get("content-length") || 0) > 0 || Boolean(req.get("transfer-encoding"));
  if (BODY_METHODS.has(req.method) && hasRequestBody) {
    const contentType = (req.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json" && !contentType.endsWith("+json")) {
      return res.status(415).json({ message: "Use Content-Type: application/json for API writes." });
    }
  }

  const pathname = String(req.originalUrl || req.url).split("?")[0];
  const rule = FIELD_RULES.find(([method, pattern]) => method === req.method && pattern.test(pathname));
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    const keys = Object.keys(req.body);
    if (rule) {
      const allowed = new Set(rule[2]);
      if (keys.some((key) => !allowed.has(key))) {
        return res.status(400).json({ message: "Request contains an unsupported field." });
      }
    } else if (BODY_METHODS.has(req.method) && keys.length > 0) {
      return res.status(400).json({ message: "This endpoint does not accept request fields." });
    }
  }

  // Cap common pagination parameters consistently; individual handlers may
  // use their own fixed limits where the client has no pagination interface.
  for (const key of ["limit", "page", "offset"]) {
    if (req.query[key] !== undefined) {
      const raw = req.query[key];
      if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
        return res.status(400).json({ message: `Invalid ${key} parameter.` });
      }
      const value = Number(raw);
      const max = key === "limit" ? 100 : (key === "page" ? 10000 : 1000000);
      const minimum = key === "page" || key === "limit" ? 1 : 0;
      if (!Number.isSafeInteger(value) || value < minimum || value > max) {
        return res.status(400).json({ message: `The ${key} parameter is outside the allowed range.` });
      }
    }
  }
  if (req.query.page !== undefined && req.query.offset !== undefined) {
    return res.status(400).json({ message: "Use either page or offset, not both." });
  }
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
  const skip = req.query.offset === undefined ? (page - 1) * limit : Number(req.query.offset);
  req.pagination = { page, limit, skip };
  if (req.pagination.skip > 1000000) {
    return res.status(400).json({ message: "Requested page is too far into the result set." });
  }
  return next();
}

module.exports = { validateRequestInput, inspectValue, FIELD_RULES };
