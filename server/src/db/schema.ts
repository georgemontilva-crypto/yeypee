import {
  mysqlTable,
  varchar,
  boolean,
  datetime,
  int,
  bigint,
  text,
  json,
  uniqueIndex,
  index,
  double,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }),
    emailVerified: boolean("email_verified").notNull().default(false),
    verificationToken: varchar("verification_token", { length: 255 }),
    resetToken: varchar("reset_token", { length: 255 }),
    resetExpires: datetime("reset_expires"),
    role: varchar("role", { length: 20 }).notNull().default("user"),
    deactivated: boolean("deactivated").notNull().default(false),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex("email_unique").on(table.email),
  })
);

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  userAgent: varchar("user_agent", { length: 512 }),
  ip: varchar("ip", { length: 64 }),
  expiresAt: datetime("expires_at").notNull(),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const leads = mysqlTable(
  "leads",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    source: varchar("source", { length: 50 }).notNull().default("homepage_club"),
    consent: boolean("consent").notNull().default(true),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailIdx: uniqueIndex("leads_email_unique").on(table.email),
  })
);

export const collections = mysqlTable("collections", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  tagline: varchar("tagline", { length: 512 }),
  description: text("description"),
  seriesLabel: varchar("series_label", { length: 120 }),
  releaseYear: varchar("release_year", { length: 16 }),
  // Captions of the three-figure stats bar, so each collection can word it its
  // own way ("7 GUARDIANS", "6 CHARACTERS + 2 SECRET RARES", ...).
  statCountValue: varchar("stat_count_value", { length: 40 }),
  statCountLabel: varchar("stat_count_label", { length: 120 }),
  statSeriesLabel: varchar("stat_series_label", { length: 120 }),
  statYearLabel: varchar("stat_year_label", { length: 120 }),
  // Some worlds do not run on candy: this renames the "Favorite Candy" row on
  // every character of the collection.
  favoriteLabel: varchar("favorite_label", { length: 120 }),
  // Text of the banner button. Empty = counted from the characters.
  ctaLabel: varchar("cta_label", { length: 120 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  heroImageId: int("hero_image_id"),
  cardImageId: int("card_image_id"),
  // Optional video that takes over the hero after a delay.
  heroVideoId: int("hero_video_id"),
  heroVideoDelayMs: int("hero_video_delay_ms").notNull().default(2000),
  accentColor: varchar("accent_color", { length: 20 }).notNull().default("#FF5FA2"),
  sortOrder: int("sort_order").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
});

export const characters = mysqlTable(
  "characters",
  {
    id: int("id").autoincrement().primaryKey(),
    collectionId: int("collection_id").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
    favoriteCandy: varchar("favorite_candy", { length: 255 }),
    bestFriend: varchar("best_friend", { length: 255 }),
    birthday: varchar("birthday", { length: 120 }),
    appearsIn: varchar("appears_in", { length: 255 }),
    imageFrontId: int("image_front_id"),
    imageSideId: int("image_side_id"),
    imageBackId: int("image_back_id"),
    cardBgColor: varchar("card_bg_color", { length: 20 }).notNull().default("#FFE3EF"),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => ({
    slugIdx: uniqueIndex("characters_slug_unique").on(table.slug),
    collectionIdx: index("characters_collection_idx").on(table.collectionId),
  })
);

export const retailPartners = mysqlTable("retail_partners", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoImageId: int("logo_image_id"),
  logoUrl: varchar("logo_url", { length: 512 }),
  onlineUrl: varchar("online_url", { length: 512 }),
  type: varchar("type", { length: 20 }).notNull().default("both"),
  sortOrder: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const stores = mysqlTable(
  "stores",
  {
    id: int("id").autoincrement().primaryKey(),
    retailPartnerId: int("retail_partner_id"),
    name: varchar("name", { length: 255 }).notNull(),
    address: varchar("address", { length: 512 }),
    city: varchar("city", { length: 255 }),
    state: varchar("state", { length: 100 }),
    zip: varchar("zip", { length: 32 }),
    lat: double("lat"),
    lng: double("lng"),
    phone: varchar("phone", { length: 32 }),
  },
  (table) => ({
    partnerIdx: index("stores_partner_idx").on(table.retailPartnerId),
  })
);

export const newsPosts = mysqlTable("news_posts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: varchar("excerpt", { length: 512 }),
  body: text("body"),
  thumbnailImageId: int("thumbnail_image_id"),
  badgeLabel: varchar("badge_label", { length: 50 }),
  published: boolean("published").notNull().default(false),
  publishedAt: datetime("published_at"),
  sortOrder: int("sort_order").notNull().default(0),
});

export const mediaAssets = mysqlTable(
  "media_assets",
  {
    id: int("id").autoincrement().primaryKey(),
    key: varchar("key", { length: 512 }).notNull(),
    url: varchar("url", { length: 512 }),
    filename: varchar("filename", { length: 255 }),
    mimeType: varchar("mime_type", { length: 120 }),
    type: varchar("type", { length: 20 }).notNull().default("image"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    width: int("width"),
    height: int("height"),
    altText: varchar("alt_text", { length: 512 }),
    folder: varchar("folder", { length: 50 }).notNull().default("other"),
    uploadedBy: varchar("uploaded_by", { length: 36 }),
    // CURRENT_TIMESTAMP, not new Date(): the latter is evaluated once when the
    // module loads, so every row would share the process start time.
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: uniqueIndex("media_key_unique").on(table.key),
  })
);

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    collectionId: int("collection_id"),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    sku: varchar("sku", { length: 120 }),
    priceCents: bigint("price_cents", { mode: "number" }).notNull().default(0),
    // When false the price is hidden on the public shop for this product.
    showPrice: boolean("show_price").notNull().default(true),
    compareAtPriceCents: bigint("compare_at_price_cents", { mode: "number" }),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    stock: int("stock").notNull().default(0),
    type: varchar("type", { length: 40 }).notNull().default("blind_box"),
    imageId: int("image_id"),
    gallery: json("gallery"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugIdx: uniqueIndex("products_slug_unique").on(table.slug),
  })
);

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 32 }).notNull(),
  userId: varchar("user_id", { length: 36 }),
  email: varchar("email", { length: 255 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  shippingAddress: json("shipping_address"),
  billingAddress: json("billing_address"),
  subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull().default(0),
  shippingCents: bigint("shipping_cents", { mode: "number" }).notNull().default(0),
  taxCents: bigint("tax_cents", { mode: "number" }).notNull().default(0),
  totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  paymentProvider: varchar("payment_provider", { length: 120 }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  carrier: varchar("carrier", { length: 120 }),
  notes: text("notes"),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  productId: int("product_id"),
  productNameSnapshot: varchar("product_name_snapshot", { length: 255 }),
  skuSnapshot: varchar("sku_snapshot", { length: 120 }),
  unitPriceCents: bigint("unit_price_cents", { mode: "number" }).notNull().default(0),
  quantity: int("quantity").notNull().default(1),
  lineTotalCents: bigint("line_total_cents", { mode: "number" }).notNull().default(0),
});

export const userCollectionProgress = mysqlTable(
  "user_collection_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    characterId: int("character_id").notNull(),
    collected: boolean("collected").notNull().default(true),
    collectedAt: datetime("collected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uniqueProgress: uniqueIndex("progress_unique").on(table.userId, table.characterId),
  })
);

export const adminAuditLog = mysqlTable(
  "admin_audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 }),
    action: varchar("action", { length: 120 }).notNull(),
    entity: varchar("entity", { length: 120 }),
    entityId: varchar("entity_id", { length: 36 }),
    changes: json("changes"),
    ip: varchar("ip", { length: 64 }),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    entityIdx: index("audit_entity_idx").on(table.entity),
  })
);

/** Wholesale / retail partnership enquiries sent from the public form. */
export const wholesaleInquiries = mysqlTable(
  "wholesale_inquiries",
  {
    id: int("id").autoincrement().primaryKey(),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 60 }),
    email: varchar("email", { length: 255 }).notNull(),
    address: text("address"),
    notes: text("notes"),
    status: varchar("status", { length: 20 }).notNull().default("new"),
    ip: varchar("ip", { length: 60 }),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailIdx: index("wholesale_email_idx").on(table.email),
  })
);

export const siteSettings = mysqlTable(
  "site_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    value: json("value"),
    updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
  },
  (table) => ({
    keyIdx: uniqueIndex("settings_key_unique").on(table.key),
  })
);
