import { asyncRouter } from "../lib/asyncRouter";
import {
  asc,
  desc,
  eq,
  and,
  like,
  or,
  inArray,
  count,
  gt,
  lt,
  isNotNull,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import {
  users,
  sessions,
  leads,
  collections,
  characters,
  retailPartners,
  stores,
  newsPosts,
  mediaAssets,
  products,
  orders,
  orderItems,
  userCollectionProgress,
  siteSettings,
} from "../db/schema";
import { getDb } from "../db/client";
import { requireAuth, requireAdmin, recordAudit, type AuthedRequest } from "../middleware/auth";
import express from "express";
import { getPresignedUploadUrl, deleteObject, objectExists, r2Diagnostics, putObject } from "../services/r2";
import { sendEmail, shippingEmail } from "../services/email";
import { cfg } from "../config";
import { rowsToCsv, slugify } from "../utils";

const router = asyncRouter();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

function ipOf(req: AuthedRequest) {
  return (req.ip || req.headers["x-forwarded-for"] || "") as string;
}

// ---------------- Dashboard stats ----------------
router.get("/stats", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const countRows = async (table: any, where?: any) => {
    const [r] = await db.select({ c: count() }).from(table).where(where);
    return r?.c ?? 0;
  };

  const [
    ordersToday,
    ordersMonth,
    incomeMonth,
    pendingShipping,
    totalUsers,
    totalLeads,
    lowStock,
    sales30,
    recentOrders,
  ] = await Promise.all([
    countRows(orders, gt(orders.createdAt, today)),
    countRows(orders, gt(orders.createdAt, monthStart)),
    db
      .select({ t: sql<number>`COALESCE(SUM(total_cents),0)` })
      .from(orders)
      .where(and(gt(orders.createdAt, monthStart), eq(orders.status, "paid"))),
    countRows(orders, eq(orders.status, "paid")),
    countRows(users, eq(users.deactivated, false)),
    countRows(leads),
    db
      .select()
      .from(products)
      .where(and(eq(products.status, "active"), lt(products.stock, 10))),
    db
      .select({ day: sql<string>`DATE(created_at)` as any, total: sql<number>`SUM(total_cents)` })
      .from(orders)
      .where(and(gt(orders.createdAt, new Date(Date.now() - 30 * 86400_000)), eq(orders.status, "paid")))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(asc(sql`DATE(created_at)`)),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10),
  ]);

  const [totalCollections, totalCharacters, totalProducts, totalNews, totalPartners, totalStores, totalMedia] = await Promise.all([
    countRows(collections),
    countRows(characters),
    countRows(products),
    countRows(newsPosts),
    countRows(retailPartners),
    countRows(stores),
    countRows(mediaAssets),
  ]);
  res.json({
    stats: {
      orders: await countRows(orders),
      ordersToday,
      ordersMonth,
      incomeMonthCents: incomeMonth[0]?.t ?? 0,
      pendingShipping,
      users: totalUsers,
      leads: totalLeads,
      collections: totalCollections,
      characters: totalCharacters,
      products: totalProducts,
      news: totalNews,
      retailPartners: totalPartners,
      stores: totalStores,
      media: totalMedia,
      lowStockCount: lowStock.length,
      lowStock,
      sales30: sales30.map((s) => ({ day: s.day, totalCents: s.total })),
      recentOrders,
    },
  });
});

// ---------------- Orders ----------------
router.get("/orders", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 25;
  const conds: any[] = [];
  if (req.query.status) conds.push(eq(orders.status, String(req.query.status)));
  if (req.query.q) {
    const q = `%${String(req.query.q)}%`;
    conds.push(
      or(like(orders.orderNumber, q), like(orders.email, q), like(orders.customerName, q))!
    );
  }
  if (req.query.from) conds.push(gt(orders.createdAt, new Date(String(req.query.from))));
  if (req.query.to) conds.push(lt(orders.createdAt, new Date(String(req.query.to))));

  const rows = await db
    .select()
    .from(orders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [countRow] = await db
    .select({ c: count() })
    .from(orders)
    .where(conds.length ? and(...conds) : undefined);
  res.json({ orders: rows, page, pages: Math.max(1, Math.ceil((countRow?.c ?? 0) / limit)) });
});

router.get("/orders/export.csv", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5000);
  const csv = rowsToCsv(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  res.send(csv);
});

router.get("/orders/:id", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, Number(req.params.id))).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  res.json({ order, items });
});

const orderPatchSchema = z.object({
  status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"]).optional(),
  trackingNumber: z.string().max(255).optional(),
  carrier: z.string().max(120).optional(),
  notes: z.string().optional(),
});

router.patch("/orders/:id", async (req: AuthedRequest, res) => {
  const parsed = orderPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const db = await getDb();
  const id = Number(req.params.id);
  const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  await db.update(orders).set(parsed.data).where(eq(orders.id, id));
  await recordAudit(db, req.user?.id, "update", "orders", String(id), parsed.data, ipOf(req));
  if (parsed.data.status === "shipped" && existing.status !== "shipped") {
    sendEmail(
      existing.email,
      `Your YEYPEE order ${existing.orderNumber} has shipped`,
      shippingEmail(existing.orderNumber, parsed.data.trackingNumber, parsed.data.carrier)
    ).catch(() => {});
  }
  const [updated] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  res.json({ order: updated });
});

// Manual order creation (for direct/wholesale sales, or when checkout is enabled)
router.post("/orders", async (req: AuthedRequest, res) => {
  if (!cfg.enableCheckout) {
    // Still allow manual creation from admin regardless of flag
  }
  const schema = z.object({
    email: z.string().email(),
    customerName: z.string().max(255).optional(),
    phone: z.string().max(32).optional(),
    shippingAddress: z.record(z.any()).optional(),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().positive(),
          unitPriceCents: z.number().int().nonnegative(),
        })
      )
      .min(1),
    shippingCents: z.number().int().nonnegative().default(0),
    taxCents: z.number().int().nonnegative().default(0),
    status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"]).default("pending"),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const db = await getDb();
  const [maxRow] = await db.select({ m: sql<number>`COALESCE(MAX(id),0)` }).from(orders);
  const next = (maxRow?.m ?? 0) + 1;
  const orderNumber = `YEY-${String(next).padStart(6, "0")}`;
  const subtotalCents = parsed.data.items.reduce(
    (acc, it) => acc + it.unitPriceCents * it.quantity,
    0
  );
  const totalCents = subtotalCents + parsed.data.shippingCents + parsed.data.taxCents;

  const orderId = (
    await db.insert(orders).values({
      orderNumber,
      userId: req.user?.id ?? null,
      email: parsed.data.email,
      customerName: parsed.data.customerName ?? null,
      phone: parsed.data.phone ?? null,
      shippingAddress: parsed.data.shippingAddress ?? null,
      subtotalCents,
      shippingCents: parsed.data.shippingCents,
      taxCents: parsed.data.taxCents,
      totalCents,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
    })
  )[0];

  for (const it of parsed.data.items) {
    const [p] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
    await db.insert(orderItems).values({
      orderId: Number(orderId.insertId),
      productId: it.productId,
      productNameSnapshot: p?.name ?? "Product",
      skuSnapshot: p?.sku ?? "",
      unitPriceCents: it.unitPriceCents,
      quantity: it.quantity,
      lineTotalCents: it.unitPriceCents * it.quantity,
    });
  }
  await recordAudit(db, req.user?.id, "create", "orders", orderNumber, { items: parsed.data.items }, ipOf(req));
  res.status(201).json({ orderNumber });
});

// ---------------- Users ----------------
router.get("/users", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 25;
  const conds: any[] = [];
  if (req.query.role) conds.push(eq(users.role, String(req.query.role)));
  if (req.query.q) {
    const q = `%${String(req.query.q)}%`;
    conds.push(or(like(users.email, q), like(users.displayName, q))!);
  }
  const rows = await db
    .select()
    .from(users)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [countRow] = await db
    .select({ c: count() })
    .from(users)
    .where(conds.length ? and(...conds) : undefined);
  res.json({ users: rows, page, pages: Math.max(1, Math.ceil((countRow?.c ?? 0) / limit)) });
});

router.get("/users/:id", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const userOrders = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(50);
  const progress = await db.select().from(userCollectionProgress).where(eq(userCollectionProgress.userId, user.id));
  const { passwordHash, verificationToken, resetToken, resetExpires, ...safeUser } = user;
  res.json({ user: safeUser, orders: userOrders, progress });
});

const userPatchSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  deactivated: z.boolean().optional(),
});

router.patch("/users/:id", async (req: AuthedRequest, res) => {
  const parsed = userPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const db = await getDb();
  await db.update(users).set(parsed.data).where(eq(users.id, req.params.id));
  await recordAudit(db, req.user?.id, "update", "users", req.params.id, parsed.data, ipOf(req));
  if (req.body.resendVerification) {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (user) {
      const token = uuidv4();
      await db.update(users).set({ verificationToken: token }).where(eq(users.id, user.id));
      sendEmail(user.email, "Confirm your YEYPEE account", (await import("../services/email")).verificationEmail(token)).catch(() => {});
    }
  }
  const [updated] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  const { passwordHash, verificationToken, resetToken, resetExpires, ...safeUser } = updated;
  res.json({ user: safeUser });
});

router.delete("/users/:id", async (req: AuthedRequest, res) => {
  const db = await getDb();
  if (req.params.id === req.user?.id) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }
  await db.delete(userCollectionProgress).where(eq(userCollectionProgress.userId, req.params.id));
  await db.delete(sessions).where(eq(sessions.userId, req.params.id));
  await db.delete(users).where(eq(users.id, req.params.id));
  await recordAudit(db, req.user?.id, "delete", "users", req.params.id, null, ipOf(req));
  res.json({ ok: true });
});

// ---------------- Leads ----------------
router.get("/leads", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 50;
  const conds: any[] = [];
  if (req.query.source) conds.push(eq(leads.source, String(req.query.source)));
  const rows = await db
    .select()
    .from(leads)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(leads.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [countRow] = await db
    .select({ c: count() })
    .from(leads)
    .where(conds.length ? and(...conds) : undefined);
  res.json({ leads: rows, page, pages: Math.max(1, Math.ceil((countRow?.c ?? 0) / limit)) });
});

router.get("/leads/export.csv", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(50000);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
  res.send(rowsToCsv(rows));
});

router.delete("/leads/:id", async (req: AuthedRequest, res) => {
  const db = await getDb();
  await db.delete(leads).where(eq(leads.id, Number(req.params.id)));
  await recordAudit(db, req.user?.id, "delete", "leads", req.params.id, null, ipOf(req));
  res.json({ ok: true });
});

// ---------------- Media (R2) ----------------

// Reports whether R2 is usable from the server, so upload problems can be told
// apart from browser-side CORS problems. Never returns secret values.
router.get("/r2-status", async (_req: AuthedRequest, res) => {
  res.json(await r2Diagnostics());
});

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive(),
  folder: z.enum(["characters", "collections", "hero", "video", "partners", "news", "products", "other"]).default("other"),
});

router.post("/media/presign", async (req: AuthedRequest, res) => {
  const parsed = presignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { filename, mimeType, sizeBytes, folder } = parsed.data;
  const ext = filename.includes(".") ? filename.split(".").pop() : "";
  const key = `${folder}/${Date.now()}-${uuidv4().slice(0, 8)}${ext ? "." + ext : ""}`;
  const max = mimeType.startsWith("video/") ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
  if (sizeBytes > max) {
    res.status(400).json({ error: `File too large (max ${max / 1024 / 1024} MB)` });
    return;
  }
  const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, mimeType);
  res.json({ uploadUrl, key, publicUrl });
});

// Server-side upload. The browser POSTs the raw file bytes here and the server
// forwards them to R2. Because the browser only ever talks to our own origin,
// this path does not depend on the bucket's CORS policy at all.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

router.post(
  "/media/upload",
  express.raw({ type: "*/*", limit: "210mb" }),
  async (req: AuthedRequest, res) => {
    const filename = String(req.query.filename || "").slice(0, 255);
    const mimeType = String(req.query.mimeType || "application/octet-stream").slice(0, 120);
    const folderRaw = String(req.query.folder || "other");
    const folders = ["characters", "collections", "hero", "video", "partners", "news", "products", "other"];
    const folder = folders.includes(folderRaw) ? folderRaw : "other";

    if (!filename) {
      res.status(400).json({ error: "Missing filename" });
      return;
    }
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "Empty file" });
      return;
    }
    const isVideo = mimeType.startsWith("video/");
    const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (body.length > max) {
      res.status(400).json({ error: `File too large (max ${max / 1024 / 1024} MB)` });
      return;
    }

    const ext = filename.includes(".") ? filename.split(".").pop() : "";
    const key = `${folder}/${Date.now()}-${uuidv4().slice(0, 8)}${ext ? "." + ext : ""}`;
    const { publicUrl } = await putObject(key, body, mimeType);

    const db = await getDb();
    const url = publicUrl || (cfg.r2.publicUrl ? `${cfg.r2.publicUrl}/${key}` : "");
    await db.insert(mediaAssets).values({
      key,
      url,
      filename,
      mimeType,
      type: isVideo ? "video" : "image",
      sizeBytes: body.length,
      folder,
      uploadedBy: req.user?.id ?? null,
    });
    const [row] = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.id)).limit(1);
    await recordAudit(db, req.user?.id, "create", "media", String(row.id), { key, filename }, ipOf(req));
    res.status(201).json(row);
  }
);

const registerMediaSchema = z.object({
  key: z.string().min(1),
  url: z.string().optional(),
  filename: z.string().max(255),
  mimeType: z.string().max(120),
  type: z.enum(["image", "video"]).default("image"),
  sizeBytes: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  altText: z.string().max(512).optional(),
  folder: z.enum(["characters", "collections", "hero", "video", "partners", "news", "products", "other"]).default("other"),
});

router.post("/media", async (req: AuthedRequest, res) => {
  const parsed = registerMediaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const db = await getDb();
  // If publicUrl not provided, build from R2 config
  const url = parsed.data.url || (cfg.r2.publicUrl ? `${cfg.r2.publicUrl}/${parsed.data.key}` : "");
  const [result] = await db.insert(mediaAssets).values({
    ...parsed.data,
    url,
    uploadedBy: req.user?.id ?? null,
  });
  const [row] = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.id)).limit(1);
  await recordAudit(db, req.user?.id, "create", "media", String(row.id), parsed.data, ipOf(req));
  res.status(201).json(row);
});

router.get("/media", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const page = Math.max(1, Number(req.query.page) || 1);
  // The admin grid pages at 40; the media picker asks for a bigger batch so it
  // can resolve thumbnails for records that already have images assigned.
  const limit = Math.min(200, Math.max(1, Number(req.query.pageSize) || 40));
  const conds: any[] = [];
  if (req.query.type) conds.push(eq(mediaAssets.type, String(req.query.type)));
  if (req.query.folder) conds.push(eq(mediaAssets.folder, String(req.query.folder)));
  if (req.query.q) conds.push(like(mediaAssets.filename, `%${String(req.query.q)}%`));
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(mediaAssets.id))
    .limit(limit)
    .offset((page - 1) * limit);
  const [countRow] = await db
    .select({ c: count() })
    .from(mediaAssets)
    .where(conds.length ? and(...conds) : undefined);
  res.json({ assets: rows, page, pages: Math.max(1, Math.ceil((countRow?.c ?? 0) / limit)) });
});

router.patch("/media/:id", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const schema = z.object({
    altText: z.string().max(512).optional(),
    folder: z.enum(["characters", "collections", "hero", "video", "partners", "news", "products", "other"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  await db.update(mediaAssets).set(parsed.data).where(eq(mediaAssets.id, Number(req.params.id)));
  res.json({ ok: true });
});

router.delete("/media/:id", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const id = Number(req.params.id);
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  // Find entities referencing this asset
  const inUse: string[] = [];
  const colls = await db.select().from(collections).where(or(eq(collections.heroImageId, id), eq(collections.cardImageId, id)));
  if (colls.length) inUse.push(`collections (${colls.map((c) => c.name).join(", ")})`);
  const chars = await db.select().from(characters).where(or(eq(characters.imageFrontId, id), eq(characters.imageSideId, id), eq(characters.imageBackId, id)));
  if (chars.length) inUse.push(`characters (${chars.map((c) => c.name).join(", ")})`);
  const news = await db.select().from(newsPosts).where(eq(newsPosts.thumbnailImageId, id));
  if (news.length) inUse.push(`news (${news.map((n) => n.title).join(", ")})`);
  const partners = await db.select().from(retailPartners).where(eq(retailPartners.logoImageId, id));
  if (partners.length) inUse.push(`retail partners (${partners.map((p) => p.name).join(", ")})`);
  const prods = await db.select().from(products).where(eq(products.imageId, id));
  if (prods.length) inUse.push(`products (${prods.map((p) => p.name).join(", ")})`);
  if (req.query.confirm !== "true") {
    res.json({ inUse, warning: inUse.length ? `This asset is used by: ${inUse.join("; ")}. Confirm deletion to proceed.` : null });
    return;
  }
  // Nullify references
  if (colls.length) await db.update(collections).set({ heroImageId: null }).where(eq(collections.heroImageId, id));
  if (colls.length) await db.update(collections).set({ cardImageId: null }).where(eq(collections.cardImageId, id));
  await db.update(characters).set({ imageFrontId: null }).where(eq(characters.imageFrontId, id));
  await db.update(characters).set({ imageSideId: null }).where(eq(characters.imageSideId, id));
  await db.update(characters).set({ imageBackId: null }).where(eq(characters.imageBackId, id));
  await db.update(newsPosts).set({ thumbnailImageId: null }).where(eq(newsPosts.thumbnailImageId, id));
  await db.update(retailPartners).set({ logoImageId: null }).where(eq(retailPartners.logoImageId, id));
  await db.update(products).set({ imageId: null }).where(eq(products.imageId, id));
  // Remove the file from R2 first, then the database row.
  const storageDeleted = await deleteObject(asset.key);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  await recordAudit(db, req.user?.id, "delete", "media", String(id), { inUse, storageDeleted }, ipOf(req));
  res.json({ ok: true, storageDeleted });
});

// ---------------- Generic entity CRUD ----------------
async function entityList(table: any, req: AuthedRequest, res: any, name: string) {
  const db = await getDb();
  const rows = await db.select().from(table).orderBy(asc(table.sortOrder), asc(table.id));
  res.json({ [name]: rows });
}

async function entityGet(table: any, req: AuthedRequest, res: any) {
  const db = await getDb();
  const rows = await db.select().from(table).where(eq(table.id, Number(req.params.id))).limit(1);
  if (!rows.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(rows[0]);
}

async function entityCreate(table: any, schema: any, req: AuthedRequest, res: any, name: string) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const db = await getDb();
  await db.insert(table).values(parsed.data);
  const [row] = await db.select().from(table).orderBy(desc(table.id)).limit(1);
  await recordAudit(db, req.user?.id, "create", name, String(row.id), parsed.data, ipOf(req));
  res.status(201).json(row);
}

async function entityPatch(table: any, schema: any, req: AuthedRequest, res: any, name: string) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const db = await getDb();
  await db.update(table).set(parsed.data).where(eq(table.id, Number(req.params.id)));
  await recordAudit(db, req.user?.id, "update", name, req.params.id, parsed.data, ipOf(req));
  const [row] = await db.select().from(table).where(eq(table.id, Number(req.params.id))).limit(1);
  res.json(row);
}

async function entityDelete(table: any, req: AuthedRequest, res: any, name: string) {
  const db = await getDb();
  await db.delete(table).where(eq(table.id, Number(req.params.id)));
  await recordAudit(db, req.user?.id, "delete", name, req.params.id, null, ipOf(req));
  res.json({ ok: true });
}

const stringish = (min = 1, max = 255) => z.string().min(min).max(max);

// Collections
router.get("/collections", (req, res) => entityList(collections, req, res, "collections"));
router.get("/collections/:id", (req, res) => entityGet(collections, req, res));
const collectionSchema = z.object({
  slug: stringish(1, 120).optional(),
  name: stringish(),
  tagline: z.string().max(512).nullable().optional(),
  description: z.string().nullable().optional(),
  seriesLabel: z.string().max(120).nullable().optional(),
  releaseYear: z.string().max(16).nullable().optional(),
  status: z.enum(["active", "coming_soon", "archived"]).default("active"),
  heroImageId: z.number().int().nullable().optional(),
  cardImageId: z.number().int().nullable().optional(),
  accentColor: z.string().max(20).default("#FF5FA2"),
  sortOrder: z.number().int().default(0),
  featured: z.boolean().default(false),
});
router.post("/collections", (req, res) =>
  entityCreate(
    collections,
    collectionSchema.transform((d) => ({ ...d, slug: d.slug ?? slugify(d.name) })),
    req,
    res,
    "collections"
  )
);
router.patch("/collections/:id", (req, res) => entityPatch(collections, collectionSchema, req, res, "collections"));
router.delete("/collections/:id", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const id = Number(req.params.id);
  const [charCount] = await db.select({ c: count() }).from(characters).where(eq(characters.collectionId, id));
  const [prodCount] = await db.select({ c: count() }).from(products).where(eq(products.collectionId, id));
  if (req.query.confirm !== "true") {
    res.json({ orphans: { characters: charCount.c, products: prodCount.c } });
    return;
  }
  await entityDelete(collections, req, res, "collections");
});

// Characters
router.get("/characters", (req, res) => entityList(characters, req, res, "characters"));
router.get("/characters/:id", (req, res) => entityGet(characters, req, res));
const characterSchema = z.object({
  collectionId: z.number().int().positive(),
  slug: stringish(1, 120).optional(),
  name: stringish(),
  description: z.string().nullable().optional(),
  rarity: z.enum(["common", "rare", "secret_rare"]).default("common"),
  favoriteCandy: z.string().max(255).nullable().optional(),
  bestFriend: z.string().max(255).nullable().optional(),
  birthday: z.string().max(120).nullable().optional(),
  appearsIn: z.string().max(255).nullable().optional(),
  imageFrontId: z.number().int().nullable().optional(),
  imageSideId: z.number().int().nullable().optional(),
  imageBackId: z.number().int().nullable().optional(),
  cardBgColor: z.string().max(20).default("#FFE3EF"),
  sortOrder: z.number().int().default(0),
});
router.post("/characters", (req, res) =>
  entityCreate(
    characters,
    characterSchema.transform((d) => ({ ...d, slug: d.slug ?? slugify(d.name) })),
    req,
    res,
    "characters"
  )
);
router.patch("/characters/:id", (req, res) => entityPatch(characters, characterSchema, req, res, "characters"));
router.delete("/characters/:id", (req, res) => entityDelete(characters, req, res, "characters"));

// Products
router.get("/products", (req, res) => entityList(products, req, res, "products"));
router.get("/products/:id", (req, res) => entityGet(products, req, res));
const productSchema = z.object({
  slug: stringish(1, 120).optional(),
  collectionId: z.number().int().nullable().optional(),
  name: stringish(),
  description: z.string().nullable().optional(),
  sku: z.string().max(120).nullable().optional(),
  priceCents: z.number().int().nonnegative().default(0),
  compareAtPriceCents: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().max(8).default("USD"),
  stock: z.number().int().nonnegative().default(0),
  type: z.enum(["blind_box", "display_case", "bundle", "accessory"]).default("blind_box"),
  imageId: z.number().int().nullable().optional(),
  gallery: z.array(z.number().int()).nullable().optional(),
  status: z.enum(["draft", "active", "sold_out", "archived"]).default("draft"),
  sortOrder: z.number().int().default(0),
});
router.post("/products", (req, res) =>
  entityCreate(
    products,
    productSchema.transform((d) => ({ ...d, slug: d.slug ?? slugify(d.name) })),
    req,
    res,
    "products"
  )
);
router.patch("/products/:id", (req, res) => entityPatch(products, productSchema, req, res, "products"));
router.delete("/products/:id", (req, res) => entityDelete(products, req, res, "products"));

// News
router.get("/news", (req, res) => entityList(newsPosts, req, res, "news"));
router.get("/news/:id", (req, res) => entityGet(newsPosts, req, res));
const newsSchema = z.object({
  slug: stringish(1, 120).optional(),
  title: stringish(),
  excerpt: z.string().max(512).nullable().optional(),
  body: z.string().nullable().optional(),
  thumbnailImageId: z.number().int().nullable().optional(),
  badgeLabel: z.string().max(50).nullable().optional(),
  published: z.boolean().default(false),
  publishedAt: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});
router.post("/news", (req, res) =>
  entityCreate(
    newsPosts,
    newsSchema.transform((d) => ({ ...d, slug: d.slug ?? slugify(d.title) })),
    req,
    res,
    "news"
  )
);
router.patch("/news/:id", (req, res) => entityPatch(newsPosts, newsSchema, req, res, "news"));
router.delete("/news/:id", (req, res) => entityDelete(newsPosts, req, res, "news"));

// Retail partners
router.get("/retail-partners", (req, res) => entityList(retailPartners, req, res, "partners"));
router.get("/retail-partners/:id", (req, res) => entityGet(retailPartners, req, res));
const partnerSchema = z.object({
  name: stringish(),
  logoImageId: z.number().int().nullable().optional(),
  onlineUrl: z.string().max(512).nullable().optional(),
  type: z.enum(["online", "in_store", "both"]).default("both"),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});
router.post("/retail-partners", (req, res) => entityCreate(retailPartners, partnerSchema, req, res, "retail_partners"));
router.patch("/retail-partners/:id", (req, res) => entityPatch(retailPartners, partnerSchema, req, res, "retail_partners"));
router.delete("/retail-partners/:id", (req, res) => entityDelete(retailPartners, req, res, "retail_partners"));

// Stores
router.get("/stores", (req, res) => entityList(stores, req, res, "stores"));
router.get("/stores/:id", (req, res) => entityGet(stores, req, res));
const storeSchema = z.object({
  retailPartnerId: z.number().int().nullable().optional(),
  name: stringish(),
  address: z.string().max(512).nullable().optional(),
  city: z.string().max(255).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  zip: z.string().max(32).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
});
router.post("/stores", (req, res) => entityCreate(stores, storeSchema, req, res, "stores"));
router.patch("/stores/:id", (req, res) => entityPatch(stores, storeSchema, req, res, "stores"));
router.delete("/stores/:id", (req, res) => entityDelete(stores, req, res, "stores"));

// Bulk store import from CSV
router.post("/stores/import-csv", async (req: AuthedRequest, res) => {
  const schema = z.object({ rows: z.array(z.record(z.string())) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid CSV rows" });
    return;
  }
  const db = await getDb();
  let created = 0;
  for (const row of parsed.data.rows) {
    const g = (k: string) => row[k] ?? row[k.toUpperCase()] ?? null;
    const lat = parseFloat(g("lat") ?? g("latitude") ?? "");
    const lng = parseFloat(g("lng") ?? g("longitude") ?? "");
    await db.insert(stores).values({
      name: g("name") ?? "Store",
      address: g("address"),
      city: g("city"),
      state: g("state"),
      zip: g("zip"),
      lat: isNaN(lat) ? null : lat,
      lng: isNaN(lng) ? null : lng,
      phone: g("phone"),
      retailPartnerId: g("retail_partner_id") ? Number(g("retail_partner_id")) : null,
    });
    created++;
  }
  await recordAudit(db, req.user?.id, "import", "stores", undefined, { count: created }, ipOf(req));
  res.json({ created });
});

// Reorder (batch sort_order)
router.patch("/:entity/reorder", async (req: AuthedRequest, res) => {
  const entity = req.params.entity;
  const schema = z.object({ ids: z.array(z.number().int().positive()) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const tables: Record<string, any> = {
    collections,
    characters,
    products,
    news: newsPosts,
    "retail-partners": retailPartners,
    stores,
  };
  const table = tables[entity];
  if (!table) {
    res.status(404).json({ error: "Unknown entity" });
    return;
  }
  const db = await getDb();
  for (let i = 0; i < parsed.data.ids.length; i++) {
    await db.update(table).set({ sortOrder: i }).where(eq(table.id, parsed.data.ids[i]));
  }
  res.json({ ok: true });
});

// Site settings
router.get("/settings", async (req: AuthedRequest, res) => {
  const db = await getDb();
  const rows = await db.select().from(siteSettings);
  const out: Record<string, any> = {};
  for (const r of rows) out[r.key] = r.value;
  // Settings that hold a media asset id are resolved to a URL so the admin can
  // show a thumbnail of what is currently selected.
  const mediaKeys = [
    "logo_header_asset_id",
    "logo_footer_asset_id",
    "hero_banner_asset_id",
    "hero_banner_mobile_asset_id",
    "secret_rare_banner_asset_id",
    "secret_rare_card_asset_id",
    "partners_bg_asset_id",
    "club_bg_asset_id",
    "club_image_asset_id",
    "hero_video_asset_id",
    "hero_poster_asset_id",
  ];
  const ids = mediaKeys
    .map((k) => out[k])
    .filter((v): v is number => typeof v === "number" && v > 0);
  const previews: Record<string, string> = {};
  if (ids.length) {
    const assets = await db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids));
    const byId = new Map(assets.map((a) => [a.id, a.url]));
    for (const k of mediaKeys) {
      const url = typeof out[k] === "number" ? byId.get(out[k]) : undefined;
      if (url) previews[k] = url;
    }
  }
  res.json({ settings: out, previews });
});

router.patch("/settings", async (req: AuthedRequest, res) => {
  const schema = z.record(z.any());
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const db = await getDb();
  for (const [key, value] of Object.entries(parsed.data)) {
    await db
      .insert(siteSettings)
      .values({ key, value })
      .onDuplicateKeyUpdate({ set: { value } });
  }
  await recordAudit(db, req.user?.id, "update", "site_settings", undefined, parsed.data, ipOf(req));
  res.json({ ok: true });
});

export { router as adminRouter };
