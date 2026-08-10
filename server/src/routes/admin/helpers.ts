import type { Router, Request, Response } from "express";
import {
  asc,
  desc,
  eq,
  and,
  like,
  sql,
  count,
  gt,
  or,
  inArray,
} from "drizzle-orm";
import type { MySqlTable, MySqlColumn } from "drizzle-orm/mysql-core";

export interface CrudOptions<T extends MySqlTable> {
  table: T;
  orderBy?: any;
  searchColumns?: string[]; // db column names to search against
}

export function makeCrudRouter(opts: CrudOptions<any>, name: string): Router {
  const { Router } = require("express");
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    const db = (await import("../../db/client")).getDb();
    const { requireAdmin, recordAudit } = await import("../../middleware/auth");
    // listing: generic select with optional q search
    const qb = (await db).select().from(opts.table);
    const rows = await qb.orderBy(opts.orderBy ?? asc((opts.table as any).id));
    res.json({ [name]: rows });
  });

  router.post("/", async (req: Request, res: Response) => {
    const db = await (await import("../../db/client")).getDb();
    await db.insert(opts.table).values(req.body);
    const [created] = await db.select().from(opts.table).orderBy(desc((opts.table as any).id)).limit(1);
    res.status(201).json(created);
  });

  router.patch("/:id", async (req: Request, res: Response) => {
    const db = await (await import("../../db/client")).getDb();
    await db.update(opts.table).set(req.body).where(eq((opts.table as any).id, Number(req.params.id)));
    const [row] = await db.select().from(opts.table).where(eq((opts.table as any).id, Number(req.params.id))).limit(1);
    res.json(row);
  });

  router.delete("/:id", async (req: Request, res: Response) => {
    const db = await (await import("../../db/client")).getDb();
    await db.delete(opts.table).where(eq((opts.table as any).id, Number(req.params.id)));
    res.json({ ok: true });
  });

  return router;
}
