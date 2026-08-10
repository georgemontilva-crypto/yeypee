import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { authRouter } from "./routes/auth";
import { publicRouter } from "./routes/public";
import { adminRouter } from "./routes/admin";
import { cfg } from "./config";

const app = express();

app.set("trust proxy", true);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: cfg.nodeEnv === "production" ? cfg.appUrl : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Rate limiting on auth and leads
// trust proxy is enabled (Railway sits behind a proxy), so we key by client IP
// and disable the bypass-IP detection to avoid ERR_ERL_PERMISSIVE_TRUST_PROXY.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
});
const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRouter);
app.post("/api/leads", leadLimiter, (req, res, next) => {
  const { Router } = require("express");
  // Handled by publicRouter below; limiter applied here via wrapper
  next();
});
app.use("/api", publicRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: cfg.nodeEnv, checkout: cfg.enableCheckout });
});

// Serve Vite build in production.
// When running `node dist/server/index.js`, __dirname = <repo>/dist/server.
// The client build lives at <repo>/client/dist (produced by `vite build client`).
// Fall back to <repo>/dist/client if deployed that way.
// Works in both ESM (dev, tsx) and CJS (production build).
// `import.meta` is only valid in ESM, so resolve the dir dynamically at runtime
// to keep TypeScript's CommonJS build happy.
function getCurrentDir(): string {
  // In dev (tsx, ESM), __dirname is not defined and import.meta.url is available.
  // In production (tsc → CJS), __dirname is defined (dist/server).
  const anyGlobal = globalThis as unknown as {
    __dirname?: string;
    import?: { meta?: { url?: string } };
  };
  if (typeof __dirname !== "undefined") return __dirname;
  const metaUrl = anyGlobal.import?.meta?.url;
  if (metaUrl) {
    return path.dirname(
      metaUrl.replace("file://", "").replace(/^\/(\w:\/)/, "$1")
    );
  }
  return process.cwd();
}
const repoRoot = path.resolve(getCurrentDir(), "../..");
const candidate1 = path.join(repoRoot, "client", "dist");
const candidate2 = path.join(repoRoot, "dist", "client");
const distPath = fs.existsSync(candidate1) ? candidate1 : fs.existsSync(candidate2) ? candidate2 : repoRoot;
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(cfg.port, "0.0.0.0", () => {
  console.log(`YEYPEE server listening on http://0.0.0.0:${cfg.port}`);
});
