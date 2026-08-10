import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { sessions, users } from "../db/schema";
import { getDb } from "../db/client";
import { cfg } from "../config";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    displayName: string | null;
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const cookie = req.cookies?.session;
    if (!cookie) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    let payload: any;
    try {
      payload = jwt.verify(cookie, cfg.jwtSecret) as any;
    } catch {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    const sessionToken = payload.sessionToken;
    if (!sessionToken || typeof sessionToken !== "string") {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    const db = await getDb();
    const tokenHash = hashToken(sessionToken);
    const session = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (session.length === 0) {
      res.status(401).json({ error: "Session expired" });
      return;
    }
    const userRows = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    const user = userRows[0];
    if (!user || user.deactivated) {
      res.status(401).json({ error: "Account unavailable" });
      return;
    }
    req.user = { id: user.id, email: user.email, role: user.role, displayName: user.displayName };
    next();
  } catch (err) {
    console.error("requireAuth error", err);
    res.status(500).json({ error: "Internal error" });
  }
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export async function recordAudit(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string | undefined,
  action: string,
  entity: string,
  entityId: string | undefined,
  changes: unknown,
  ip?: string
) {
  const { adminAuditLog } = await import("../db/schema");
  await db.insert(adminAuditLog).values({
    userId: userId ?? null,
    action,
    entity,
    entityId: entityId ?? null,
    changes: changes ?? null,
    ip: ip ?? null,
  });
}
