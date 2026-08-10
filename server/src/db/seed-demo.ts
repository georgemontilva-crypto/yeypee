import mysql from "mysql2/promise";

const sql = async (q: string, args: any[] = []) => {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });
  const [res] = await conn.execute(q, args);
  await conn.end();
  return res;
};

async function upsertSetting(key: string, value: string) {
  await sql(
    "INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    [key, JSON.stringify(value)]
  );
}

async function seed() {
  await upsertSetting("brand_name", "YEYPEE");
  await upsertSetting(
    "hero_title",
    "Collect the Magic"
  );
  await upsertSetting(
    "hero_subtitle",
    "Step into the magical world of YEYPEE. Blind box figures, secret rares and collector worlds."
  );
  await upsertSetting("hero_cta_label", "Explore Collections");
  await upsertSetting("hero_cta_link", "/collections");
  await upsertSetting("instagram_url", "https://instagram.com/yeypee");
  await upsertSetting("tiktok_url", "https://tiktok.com/@yeypee");
  await upsertSetting("youtube_url", "https://youtube.com/@yeypee");

  await sql("DELETE FROM characters");
  await sql("DELETE FROM collections");

  await sql(
    `INSERT INTO collections (id, slug, name, tagline, status, accent_color, series_label, release_year, description, featured, sort_order) VALUES
(1, 'candy-carnival', 'Candy Carnival', 'The sweetest world of all', 'active', '#FF5FA2', 'Series 01', '2026', 'A carnival made of candy, where every figure hides a sweet surprise. Collect the whole set and reveal the secret rare.', 1, 0),
(2, 'jungle-dream', 'Jungle Dream', 'Wild adventures await', 'active', '#2E7D4F', 'Series 02', '2026', 'Dive into the wild jungle. New characters, new textures and a new secret rare waiting to be discovered.', 1, 1),
(3, 'galaxy-pop', 'Galaxy Pop', 'Out of this world', 'active', '#9B84E8', 'Series 03', '2027', 'A cosmic collection coming soon.', 0, 2)`
  );

  const chars = [
    [1, "bonbon", "Bonbon", "common", 0],
    [1, "lolli", "Lolli", "common", 1],
    [1, "caramello", "Caramello", "rare", 2],
    [1, "marshmallow", "Marshmallow", "rare", 3],
    [1, "pudding", "Pudding", "ultra-rare", 4],
    [1, "golden-star", "Golden Star", "secret_rare", 5],
    [2, "leafy", "Leafy", "common", 0],
    [2, "vine", "Vine", "common", 1],
    [2, "mossy", "Mossy", "rare", 2],
    [2, "jaguar", "Jaguar", "ultra-rare", 3],
  ];
  for (const [c, slug, name, rarity, sort] of chars) {
    await sql(
      `INSERT INTO characters (collection_id, slug, name, description, rarity, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [c, slug, name, `Meet ${name}, a magical figure from the collection.`, rarity, sort]
    );
  }

  await sql("DELETE FROM news_posts");
  await sql(
    `INSERT INTO news_posts (slug, title, excerpt, body, badge_label, published, published_at, sort_order) VALUES
('jungle-dream-launch', 'The Jungle Dream collection is here!', 'The wildest collection of the year has arrived. Find out where to get yours.', 'Jungle Dream brings new characters, textures and a brand new secret rare. Available at select retailers and online stores.', 'New', 1, NOW(), 0),
('trading-fair', 'Trading fair this weekend', 'Bring your collection and meet other collectors in the city center.', 'We are hosting a community trading fair. Swap duplicates, reveal your secret rares and take part in the raffle.', 'Event', 1, NOW(), 1)`
  );

  await sql("DELETE FROM products");
  await sql(
    `INSERT INTO products (slug, collection_id, name, description, price_cents, compare_at_price_cents, currency, stock, type, status, sort_order) VALUES
('blind-box', 1, 'Blind Box', 'One random figure from the current collection.', 599, NULL, 'USD', 120, 'blind_box', 'live', 0),
('blind-box-display', 1, 'Blind Box Display (6 + 1)', 'A complete display case with 6 boxes plus 1 guaranteed secret rare.', 3499, 3999, 'USD', 25, 'display', 'live', 1)`
  );

  await sql("DELETE FROM stores");
  await sql(
    `INSERT INTO stores (name, address, city, zip, lat, lng) VALUES
('Toy City Downtown', '123 Main St', 'Downtown', '10001', 0, 0),
('Pop Shop Mall', '456 Mall Avenue, Second Floor', 'Mall District', '10002', 0, 0)`
  );

  await sql("DELETE FROM retail_partners");
  await sql(
    `INSERT INTO retail_partners (name, logo_url, online_url, type, sort_order, active) VALUES
('Toy City', '', 'https://example.com/toycity', 'both', 0, 1),
('Pop Shop', '', 'https://example.com/popshop', 'online', 1, 1)`
  );

  console.log("Demo seed complete");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
