

require("dotenv").config();

const express = require("express");
const path = require("path");
const { randomUUID } = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const MongoSessionStore = require("./config/mongoSessionStore");
const { validateRequestInput } = require("./middleware/validateRequestInput");

const connectDB = require("./config/database");
const authRoutes = require("./routes/auth");
const skillRoutes = require("./routes/skills");
const courseRoutes = require("./routes/courses");
const chatRoutes = require("./routes/chat");
const projectRoutes = require("./routes/projects");
const internshipRoutes = require("./routes/internships");
const applicationRoutes = require("./routes/applications");
const communityRoutes = require("./routes/community");
const progressRoutes = require("./routes/progress");
const socialFeatureRoutes = require("./routes/socialFeatures");
const postRoutes = require("./routes/posts");

const app = express();
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, "public");

if (!process.env.SESSION_SECRET || Buffer.byteLength(process.env.SESSION_SECRET, "utf8") < 32) {
  console.error("SESSION_SECRET must be set to a randomly generated value of at least 32 bytes.");
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing from the environment.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && process.env.TRUST_PROXY !== "1") {
  console.error("Production requires TRUST_PROXY=1 behind a trusted HTTPS-terminating reverse proxy that overwrites forwarded headers.");
  process.exit(1);
}

// Set TRUST_PROXY only when deployed behind a known reverse proxy.
// Avoid blindly trusting arbitrary X-Forwarded-* headers.
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
// Minimal structured request logging. Never log bodies, query strings, cookies,
// authorization headers, user identifiers, or provider/database error objects.
app.use((req, res, next) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  res.setHeader("X-Request-ID", requestId);
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      console.warn(JSON.stringify({
        level: res.statusCode >= 500 ? "error" : "warn",
        event: "http_request_failed",
        requestId,
        method: req.method,
        status: res.statusCode,
        durationMs: Date.now() - startedAt
      }));
    }
  });
  next();
});
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  // Helmet enables HSTS; production must be served only through HTTPS.
  strictTransportSecurity: process.env.NODE_ENV === "production"
    ? { maxAge: 31536000, includeSubDomains: true, preload: false }
    : false
}));

// The trusted reverse proxy must overwrite X-Forwarded-Proto and redirect HTTP
// to HTTPS at the edge. Reject any request the app does not recognize as secure
// rather than building a redirect from an untrusted Host header.
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && !req.secure) {
    return res.status(400).json({ message: "HTTPS is required." });
  }
  next();
});

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use("/api", validateRequestInput);

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." }
  })
);

// Additional controls for endpoints that trigger database fan-out or social writes.
app.use("/api/community", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many community requests. Please try again later." }
}));
app.use("/api/social", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many social requests. Please try again later." }
}));

// Separate, stricter limits for account-creation and credential-checking endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." }
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Cookie-authenticated state changes must originate from this same host when a
// browser supplies Origin. SameSite cookies are an additional, not sole, defense.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || !req.get("origin")) return next();
  try {
    const origin = new URL(req.get("origin"));
    const expectedHost = req.get("host");
    if (origin.host !== expectedHost || !["http:", "https:"].includes(origin.protocol)) {
      return res.status(403).json({ message: "Cross-origin request blocked." });
    }
  } catch {
    return res.status(403).json({ message: "Invalid request origin." });
  }
  return next();
});

app.use(
  session({
    name: "sit.sid",
    secret: process.env.SESSION_SECRET,
    store: new MongoSessionStore({ collectionName: "app_sessions" }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/"
    }
  })
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/social", socialFeatureRoutes);
app.use("/api/posts", postRoutes);

// Keep unknown API routes and malformed requests on a consistent JSON error path.
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error && (error.type === "entity.too.large" || error.status === 413)) {
    return res.status(413).json({ message: "Request body is too large." });
  }
  if (error && (error.type === "entity.parse.failed" || error.status === 400)) {
    return res.status(400).json({ message: "Request body is invalid." });
  }
  console.error("Unhandled request error.");
  return res.status(500).json({ message: "An unexpected server error occurred." });
});

// Authentication guard for protected pages
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login.html");
  }

  next();
}

// Public landing page. Authenticated users go directly to their existing dashboard.
app.get("/", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/index.html");
  }

  return res.sendFile(path.join(publicPath, "landing.html"));
});

// Public pages
app.get("/landing.html", (req, res) => {
  res.sendFile(path.join(publicPath, "landing.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(publicPath, "login.html"));
});

app.get("/register.html", (req, res) => {
  res.sendFile(path.join(publicPath, "register.html"));
});

// Protected dashboard
app.get("/index.html", requireAuth, (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Dedicated follower/following view; its data remains behind authenticated APIs.
app.get("/connections.html", requireAuth, (req, res) => {
  res.sendFile(path.join(publicPath, "connections.html"));
});

// Serve CSS and JavaScript assets
app.use(express.static(publicPath, { index: false }));

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

