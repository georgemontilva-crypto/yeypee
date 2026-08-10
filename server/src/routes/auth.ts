import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { sessions, users } from "../db/schema";
import { getDb } from "../db/client";
import { cfg } from "../config";
import { requireAuth, hashToken, type AuthedRequest } from "../middleware/auth";
import { verificationEmail, sendEmail } from "../services/email";

const router = Router();

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setSessionCookie(req: any, res: any, userId: string, token: string) {
  const signed = jwt.sign({ userId, sessionToken: token, iat: Math.floor(Date.now() / 1000) }, cfg.jwtSecret);
  // secure=true whenever the public URL is HTTPS (e.g. Railway domain),
  // since the browser must send it over HTTPS. httpOnly hides it from JS
  // (document.cookie), but the browser still sends it with credentials.
  const isSecure = (req as any)?.secure ?? cfg.appUrl.startsWith("https://");
  res.cookie("session", signed, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function createSession(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  _ua?: string | null,
  _ip?: string | null
): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE);
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: _ua ?? null,
    ip: _ip ?? null,
    expiresAt,
  });
  return token;
}

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().max(255).optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { email, password, displayName } = parsed.data;
  const db = await getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = uuidv4();
  const id = uuidv4();
  await db.insert(users).values({
    id,
    email,
    passwordHash,
    displayName: displayName || null,
    verificationToken,
    role: "user",
  });
  // Auto-login after registration (email verification link also sent)
  const sessionToken = await createSession(db, id, req.headers["user-agent"], req.ip);
  setSessionCookie(req, res, id, sessionToken);
  sendEmail(email, "Confirm your YEYPEE account", verificationEmail(verificationToken)).catch(() => {});
  res.json({ user: { id, email, displayName: displayName || email, role: "user", emailVerified: false } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];
  if (!user || user.deactivated) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const sessionToken = await createSession(db, user.id, req.headers["user-agent"], req.ip);
  setSessionCookie(req, res, user.id, sessionToken);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName || user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
});

router.post("/logout", async (_req, res) => {
  res.clearCookie("session", { path: "/" });
  res.json({ ok: true });
});

router.get("/me", async (req: AuthedRequest, res) => {
  const cookie = req.cookies?.session;
  if (!cookie) {
    res.json({ user: null });
    return;
  }
  try {
    const payload = jwt.verify(cookie, cfg.jwtSecret) as any;
    const db = await getDb();
    const tokenHash = hashToken(payload.sessionToken);
    const session = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (session.length === 0) {
      res.json({ user: null });
      return;
    }
    const rows = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    const user = rows[0];
    if (!user) {
      res.json({ user: null });
      return;
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName || user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch {
    res.json({ user: null });
  }
});

router.get("/verify/:token", async (req, res) => {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.verificationToken, req.params.token)).limit(1);
  const user = rows[0];
  if (!user) {
    res.status(400).json({ error: "Invalid verification link" });
    return;
  }
  await db.update(users).set({ emailVerified: true, verificationToken: null }).where(eq(users.id, user.id));
  // If the user isn't logged in, auto-login
  if (!req.cookies?.session) {
    const sessionToken = await createSession(db, user.id, req.headers["user-agent"], req.ip);
    setSessionCookie(req, res, user.id, sessionToken);
  }
  res.json({ ok: true, email: user.email });
});

const forgotSchema = z.object({ email: z.string().email() });

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];
  if (!user) {
    // Don't reveal whether email exists
    res.json({ ok: true });
    return;
  }
  const resetToken = uuidv4();
  await db
    .update(users)
    .set({ resetToken, resetExpires: new Date(Date.now() + 3600_000) })
    .where(eq(users.id, user.id));
  const url = `${cfg.appUrl}/reset-password?token=${resetToken}`;
  sendEmail(
    user.email,
    "Reset your YEYPEE password",
    `<div style="font-family: Poppins, Arial, sans-serif; max-width:480px;">
       <h1 style="letter-spacing:0.08em;">YEYPEE</h1>
       <p>Reset your password: <a href="${url}">${url}</a></p>
       <p style="color:#999;">This link expires in 1 hour.</p>
     </div>`
  ).catch(() => {});
  res.json({ ok: true });
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.resetToken, parsed.data.token), gt(users.resetExpires, new Date())))
    .limit(1);
  const user = rows[0];
  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset link" });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db
    .update(users)
    .set({ passwordHash, resetToken: null, resetExpires: null })
    .where(eq(users.id, user.id));
  // Revoke all sessions for this user
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  res.json({ ok: true });
});

export { router as authRouter };
