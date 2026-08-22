import { asyncRouter } from "../lib/asyncRouter";
import { eq, and, asc, desc, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  collections,
  characters,
  newsPosts,
  retailPartners,
  stores,
  products,
  mediaAssets,
  userCollectionProgress,
  siteSettings,
  leads,
} from "../db/schema";
import { getDb } from "../db/client";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { recordAudit } from "../middleware/auth";
import { welcomeClubEmail, sendEmail } from "../services/email";
import { haversineKm, zipCoords } from "../utils";

const router = asyncRouter();

async function mediaById(db: Awaited<ReturnType<typeof getDb>>, id: number | null | undefined): Promise<string | null> {
  if (!id) return null;
  const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  return rows[0]?.url ?? null;
}

// ---------- Leads (Collector Club) ----------
const leadSchema = z.object({
  email: z.string().email().max(255),
  source: z.enum(["homepage_club", "footer", "popup"]).default("homepage_club"),
  consent: z.boolean().default(true),
  hp: z.string().optional(), // honeypot
});

router.post("/leads", async (req, res) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  if (parsed.data.hp) {
    res.json({ ok: true }); // silent success for bots
    return;
  }
  const db = await getDb();
  try {
    await db.insert(leads).values({
      email: parsed.data.email,
      source: parsed.data.source,
      consent: parsed.data.consent,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      res.json({ ok: true, already: true });
      return;
    }
    throw err;
  }
  sendEmail(parsed.data.email, "Welcome to the YEYPEE Club!", welcomeClubEmail(parsed.data.email)).catch(() => {});
  res.json({ ok: true });
});

// ---------- Settings (hero video etc.) ----------
router.get("/settings", async (_req, res) => {
  const db = await getDb();
  const rows = await db.select().from(siteSettings);
  const out: Record<string, any> = {};
  for (const row of rows) out[row.key] = row.value;
  // Resolve asset ids to URLs
  const assetIds = [
    out.logo_header_asset_id,
    out.logo_footer_asset_id,
    out.hero_banner_asset_id,
    out.hero_banner_mobile_asset_id,
    out.secret_rare_banner_asset_id,
    out.secret_rare_card_asset_id,
    out.popup_image_asset_id,
    out.page_about_image_1_asset_id,
    out.page_about_image_2_asset_id,
    out.page_about_image_3_asset_id,
    out.page_contact_image_1_asset_id,
    out.partners_bg_asset_id,
    out.club_bg_asset_id,
    out.club_image_asset_id,
    out.hero_video_asset_id,
    out.hero_poster_asset_id,
    out.featured_collection_id,
  ].filter((v): v is number => typeof v === "number");
  // Slider slides: a list of media ids per breakpoint. Falls back to the single
  // banner keys so existing sites keep working with no changes.
  const idList = (v: unknown): number[] =>
    Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
  assetIds.push(...idList(out.hero_banner_ids), ...idList(out.hero_banner_mobile_ids));
  if (out.carousel_character_ids && Array.isArray(out.carousel_character_ids)) {
    assetIds.push(...(out.carousel_character_ids as number[]).filter((v): v is number => typeof v === "number"));
  }
  if (out.secret_rare_character_id) assetIds.push(out.secret_rare_character_id as number);

  // Resolve those ids to public URLs (the ids alone are useless to the client).
  const assetRows = assetIds.length
    ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, assetIds))
    : [];
  const assetById = new Map(assetRows.map((a) => [a.id, a.url]));
  const urlFor = (id: unknown) => (typeof id === "number" ? assetById.get(id) ?? null : null);

  res.json({
    settings: {
      ...out,
      logo_header: urlFor(out.logo_header_asset_id),
      logo_footer: urlFor(out.logo_footer_asset_id),
      hero_banner: urlFor(out.hero_banner_asset_id),
      hero_banner_mobile: urlFor(out.hero_banner_mobile_asset_id),
      hero_banners: idList(out.hero_banner_ids)
        .map((id) => urlFor(id))
        .filter((u): u is string => !!u),
      hero_banners_mobile: idList(out.hero_banner_mobile_ids)
        .map((id) => urlFor(id))
        .filter((u): u is string => !!u),
      secret_rare_banner: urlFor(out.secret_rare_banner_asset_id),
      secret_rare_card: urlFor(out.secret_rare_card_asset_id),
      popup_image: urlFor(out.popup_image_asset_id),
      page_about_image_1: urlFor(out.page_about_image_1_asset_id),
      page_about_image_2: urlFor(out.page_about_image_2_asset_id),
      page_about_image_3: urlFor(out.page_about_image_3_asset_id),
      page_contact_image_1: urlFor(out.page_contact_image_1_asset_id),
      partners_bg: urlFor(out.partners_bg_asset_id),
      club_bg: urlFor(out.club_bg_asset_id),
      club_image: urlFor(out.club_image_asset_id),
      hero_video: urlFor(out.hero_video_asset_id),
      hero_poster: urlFor(out.hero_poster_asset_id),
    },
  });
});

// ---------- Homepage aggregator (single endpoint for the landing page) ----------
router.get("/home", async (_req, res) => {
  const db = await getDb();
  // Settings (with asset ids resolved to public URLs)
  const settingsRows = await db.select().from(siteSettings);
  const settings: Record<string, any> = {};
  for (const row of settingsRows) settings[row.key] = row.value;
  const assetIds: number[] = [
    settings.logo_header_asset_id,
    settings.logo_footer_asset_id,
    settings.hero_banner_asset_id,
    settings.hero_banner_mobile_asset_id,
    settings.secret_rare_banner_asset_id,
    settings.secret_rare_card_asset_id,
    settings.partners_bg_asset_id,
    settings.club_bg_asset_id,
    settings.club_image_asset_id,
    settings.hero_video_asset_id,
    settings.hero_poster_asset_id,
    settings.featured_collection_id,
  ].filter((v): v is number => typeof v === "number");
  const heroSlideIds = (v: unknown): number[] =>
    Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
  assetIds.push(
    ...heroSlideIds(settings.hero_banner_ids),
    ...heroSlideIds(settings.hero_banner_mobile_ids)
  );
  if (settings.carousel_character_ids && Array.isArray(settings.carousel_character_ids)) {
    assetIds.push(...(settings.carousel_character_ids as number[]).filter((v): v is number => typeof v === "number"));
  }
  if (settings.secret_rare_character_id) assetIds.push(settings.secret_rare_character_id as number);

  const [allCollections, allCharacters, newsRows, partnerRows] = await Promise.all([
    db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.id)),
    db.select().from(characters).orderBy(asc(characters.collectionId), asc(characters.sortOrder), asc(characters.id)),
    db.select().from(newsPosts).where(eq(newsPosts.published, true)).orderBy(desc(newsPosts.publishedAt), asc(newsPosts.sortOrder)).limit(6),
    db.select().from(retailPartners).where(eq(retailPartners.active, true)).orderBy(asc(retailPartners.sortOrder), asc(retailPartners.id)).limit(8),
  ]);

  const collById = new Map(allCollections.map((c) => [c.id, c]));

  // Resolve media in parallel
  const resolved = await Promise.all([
    ...allCollections.map((c) => Promise.all([mediaById(db, c.heroImageId), mediaById(db, c.cardImageId)])),
    ...allCharacters.map((ch) => mediaById(db, ch.imageFrontId)),
    ...newsRows.map((n) => mediaById(db, n.thumbnailImageId)),
    ...partnerRows.map((p) => mediaById(db, p.logoImageId)),
    ...assetIds.map((id) => mediaById(db, id)),
  ]);

  const collectionsOut = allCollections.map((c, i) => ({
    ...c,
    heroImage: resolved[i]?.[0] ?? null,
    cardImage: resolved[i]?.[1] ?? null,
  }));
  const charactersOut = allCharacters.map((ch, i) => ({
    ...ch,
    collectionName: collById.get(ch.collectionId)?.name ?? "",
    imageFront: resolved[allCollections.length + i],
  }));
  const newsOut = newsRows.map((n, i) => ({
    ...n,
    thumbnail: resolved[allCollections.length + allCharacters.length + i],
  }));
  const partnersOut = partnerRows.map((p, i) => ({
    ...p,
    logoUrl: resolved[allCollections.length + allCharacters.length + newsRows.length + i],
  }));

  // Resolve asset lookup by id
  const allAssetRows = assetIds.length
    ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, assetIds))
    : [];
  const assetById = new Map(allAssetRows.map((a) => [a.id, a.url]));
  const assetUrls: Record<string, string | string[] | null> = {
    logo_header: settings.logo_header_asset_id ? (assetById.get(settings.logo_header_asset_id) ?? null) : null,
    logo_footer: settings.logo_footer_asset_id ? (assetById.get(settings.logo_footer_asset_id) ?? null) : null,
    hero_banner: settings.hero_banner_asset_id ? (assetById.get(settings.hero_banner_asset_id) ?? null) : null,
    hero_banner_mobile: settings.hero_banner_mobile_asset_id
      ? (assetById.get(settings.hero_banner_mobile_asset_id) ?? null)
      : null,
    hero_banners: heroSlideIds(settings.hero_banner_ids)
      .map((id) => assetById.get(id))
      .filter((u): u is string => !!u),
    hero_banners_mobile: heroSlideIds(settings.hero_banner_mobile_ids)
      .map((id) => assetById.get(id))
      .filter((u): u is string => !!u),
    secret_rare_banner: settings.secret_rare_banner_asset_id
      ? (assetById.get(settings.secret_rare_banner_asset_id) ?? null)
      : null,
    secret_rare_card: settings.secret_rare_card_asset_id
      ? (assetById.get(settings.secret_rare_card_asset_id) ?? null)
      : null,
    partners_bg: settings.partners_bg_asset_id ? (assetById.get(settings.partners_bg_asset_id) ?? null) : null,
    club_bg: settings.club_bg_asset_id ? (assetById.get(settings.club_bg_asset_id) ?? null) : null,
    club_image: settings.club_image_asset_id ? (assetById.get(settings.club_image_asset_id) ?? null) : null,
    hero_video: settings.hero_video_asset_id ? (assetById.get(settings.hero_video_asset_id) ?? null) : null,
    hero_poster: settings.hero_poster_asset_id ? (assetById.get(settings.hero_poster_asset_id) ?? null) : null,
    featured_collection_hero: settings.featured_collection_id ? (assetById.get(settings.featured_collection_id) ?? null) : null,
    secret_rare: settings.secret_rare_character_id ? (assetById.get(settings.secret_rare_character_id) ?? null) : null,
  };

  // Resolve the featured collection object (with its hero image already resolved) and the secret rare character record
  const featuredCollection =
    settings.featured_collection_id
      ? (collectionsOut.find((c) => c.id === settings.featured_collection_id) ??
        collectionsOut.find((c) => c.featured) ??
        collectionsOut[0] ??
        null)
      : (collectionsOut.find((c) => c.featured) ?? collectionsOut[0] ?? null);
  const secretRareCharacter =
    settings.secret_rare_character_id
      ? (charactersOut.find((ch) => ch.id === settings.secret_rare_character_id) ?? null)
      : null;

  res.json({
    home: {
      settings: { ...settings, ...assetUrls },
      featured_collection: featuredCollection,
      secret_rare: secretRareCharacter,
      collections: collectionsOut,
      characters: charactersOut,
      news: newsOut,
      partners: partnersOut,
    },
  });
});

// ---------- Collections ----------
router.get("/collections", async (_req, res) => {
  const db = await getDb();
  const rows = await db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.id));
  const out = await Promise.all(
    rows.map(async (c) => ({
      ...c,
      heroImage: await mediaById(db, c.heroImageId),
      cardImage: await mediaById(db, c.cardImageId),
    }))
  );
  res.json({ collections: out });
});

router.get("/collections/:slug", async (req, res) => {
  const db = await getDb();
  const rows = await db.select().from(collections).where(eq(collections.slug, req.params.slug)).limit(1);
  const c = rows[0];
  if (!c) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }
  const chars = await db
    .select()
    .from(characters)
    .where(eq(characters.collectionId, c.id))
    .orderBy(asc(characters.sortOrder), asc(characters.id));
  const out = await Promise.all(
    chars.map(async (ch) => ({
      ...ch,
      imageFront: await mediaById(db, ch.imageFrontId),
      imageSide: await mediaById(db, ch.imageSideId),
      imageBack: await mediaById(db, ch.imageBackId),
    }))
  );
  res.json({
    collection: {
      ...c,
      heroImage: await mediaById(db, c.heroImageId),
      cardImage: await mediaById(db, c.cardImageId),
      heroVideo: await mediaById(db, c.heroVideoId),
    },
    characters: out,
  });
});

// ---------- Characters ----------
router.get("/characters", async (req, res) => {
  const db = await getDb();
  const conds = [];
  if (req.query.collection) conds.push(eq(characters.collectionId, Number(req.query.collection)));
  if (req.query.rarity) conds.push(eq(characters.rarity, String(req.query.rarity)));
  const rows = await db
    .select()
    .from(characters)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(characters.collectionId), asc(characters.sortOrder), asc(characters.id));
  const colls = await db.select().from(collections);
  const collById = new Map(colls.map((c) => [c.id, c.name]));
  const out = await Promise.all(
    rows.map(async (ch) => ({
      ...ch,
      collectionName: collById.get(ch.collectionId) ?? "",
      imageFront: await mediaById(db, ch.imageFrontId),
    }))
  );
  res.json({ characters: out });
});

router.get("/characters/:slug", async (req, res) => {
  const db = await getDb();
  const rows = await db.select().from(characters).where(eq(characters.slug, req.params.slug)).limit(1);
  const ch = rows[0];
  if (!ch) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  const collRows = await db.select().from(collections).where(eq(collections.id, ch.collectionId)).limit(1);
  const coll = collRows[0];
  const allInColl = await db
    .select()
    .from(characters)
    .where(eq(characters.collectionId, ch.collectionId))
    .orderBy(asc(characters.sortOrder), asc(characters.id));
  const idx = allInColl.findIndex((x) => x.id === ch.id);
  res.json({
    character: {
      ...ch,
      collectionName: coll?.name ?? "",
      collectionSlug: coll?.slug ?? "",
      imageFront: await mediaById(db, ch.imageFrontId),
      imageSide: await mediaById(db, ch.imageSideId),
      imageBack: await mediaById(db, ch.imageBackId),
    },
    prev: idx > 0 ? allInColl[idx - 1] : null,
    next: idx < allInColl.length - 1 ? allInColl[idx + 1] : null,
    // Other characters from the same collection, for the "more from" strip.
    related: await Promise.all(
      allInColl
        .filter((x) => x.id !== ch.id)
        .slice(0, 4)
        .map(async (x) => ({
          id: x.id,
          name: x.name,
          slug: x.slug,
          rarity: x.rarity,
          imageFront: await mediaById(db, x.imageFrontId),
        }))
    ),
  });
});

// ---------- News ----------
router.get("/news", async (_req, res) => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(newsPosts)
    .where(eq(newsPosts.published, true))
    .orderBy(desc(newsPosts.publishedAt), asc(newsPosts.sortOrder));
  const out = await Promise.all(
    rows.map(async (n) => ({ ...n, thumbnail: await mediaById(db, n.thumbnailImageId) }))
  );
  res.json({ news: out });
});

// ---------- Retail partners ----------
router.get("/retail-partners", async (_req, res) => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(retailPartners)
    .where(eq(retailPartners.active, true))
    .orderBy(asc(retailPartners.sortOrder), asc(retailPartners.id));
  const out = await Promise.all(
    rows.map(async (p) => ({ ...p, logoUrl: await mediaById(db, p.logoImageId) }))
  );
  res.json({ partners: out });
});

// ---------- Stores (zip + radius) ----------
const storeQuery = z.object({
  zip: z.string().min(3).max(16),
  radius: z.union([z.literal("10"), z.literal("25"), z.literal("50")]).default("25"),
});

router.get("/stores", async (req, res) => {
  const parsed = storeQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const db = await getDb();
  const rows = await db
    .select()
    .from(stores)
    .where(and(isNotNull(stores.lat), isNotNull(stores.lng)));
  const coords = zipCoords(parsed.data.zip);
  if (!coords) {
    res.json({ stores: [] });
    return;
  }
  const radiusMi = Number(parsed.data.radius);
  const storesWithDist = rows
    .map((s) => {
      const distMi = haversineKm(coords[0], coords[1], s.lat!, s.lng!) * 0.621371;
      return { ...s, distance: Math.round(distMi * 10) / 10 };
    })
    .filter((s) => s.distance <= radiusMi)
    .sort((a, b) => a.distance - b.distance);
  res.json({ stores: storesWithDist });
});

// ---------- Products ----------
router.get("/products", async (req, res) => {
  const db = await getDb();
  const conds = [eq(products.status, "active")];
  if (req.query.collection) conds.push(eq(products.collectionId, Number(req.query.collection)));
  const rows = await db
    .select()
    .from(products)
    .where(and(...conds))
    .orderBy(asc(products.sortOrder), asc(products.id));
  const out = await Promise.all(
    rows.map(async (p) => ({ ...p, image: await mediaById(db, p.imageId) }))
  );
  res.json({ products: out });
});

router.get("/products/:slug", async (req, res) => {
  const db = await getDb();
  const rows = await db.select().from(products).where(eq(products.slug, req.params.slug)).limit(1);
  const p = rows[0];
  if (!p) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({
    product: {
      ...p,
      image: await mediaById(db, p.imageId),
    },
  });
});

// ---------- Collection progress (protected) ----------
router.get("/collection/progress", requireAuth, async (req: AuthedRequest, res) => {
  const db = await getDb();
  const userId = req.user!.id;
  const progress = await db
    .select()
    .from(userCollectionProgress)
    .where(eq(userCollectionProgress.userId, userId));
  res.json({ progress });
});

const toggleSchema = z.object({
  characterId: z.number().int().positive(),
  collected: z.boolean(),
});

router.post("/collection/toggle", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const db = await getDb();
  const { characterId, collected } = parsed.data;
  const userId = req.user!.id;
  if (collected) {
    await db
      .insert(userCollectionProgress)
      .values({ userId, characterId, collected: true })
      .onDuplicateKeyUpdate({ set: { collected: true, collectedAt: new Date() } });
  } else {
    await db
      .delete(userCollectionProgress)
      .where(and(eq(userCollectionProgress.userId, userId), eq(userCollectionProgress.characterId, characterId)));
  }
  res.json({ ok: true });
});

export { router as publicRouter };
