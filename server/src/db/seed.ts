// db:seed — creates ONLY the initial admin user and blank site_settings.
// All content (collections, characters, products, news, partners) is created
// by the admin from the admin panel. No example content is seeded.
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

async function main() {
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL });
  try {
    const [tables] = await conn.query("SHOW TABLES");
    console.log("Connected. Tables found:", (tables as any[]).length);

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin creation.");
      return;
    }

    // Upsert admin user
    const [existing] = await conn.query<any[]>(
      "SELECT id FROM users WHERE email = ?",
      [adminEmail]
    );

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const id = existing.length > 0 ? existing[0].id : uuidv4();

    if (existing.length > 0) {
      await conn.query(
        `UPDATE users SET password_hash = ?, role = 'admin', deactivated = FALSE,
         display_name = COALESCE(display_name, 'Administrator') WHERE email = ?`,
        [passwordHash, adminEmail]
      );
      console.log(`Admin ${adminEmail} updated (role=admin).`);
    } else {
      await conn.query(
        `INSERT INTO users (id, email, password_hash, display_name, email_verified, role)
         VALUES (?, ?, ?, 'Administrator', 1, 'admin')`,
        [id, adminEmail, passwordHash]
      );
      console.log(`Admin ${adminEmail} created.`);
    }

    // Upsert blank site settings (empty values — admin fills them from the panel)
    const blankSettings: Record<string, unknown> = {
      hero_video_asset_id: null,
      hero_poster_asset_id: null,
      featured_collection_id: null,
      carousel_character_ids: null,
      secret_rare_character_id: null,
    };
    for (const [key, value] of Object.entries(blankSettings)) {
      await conn.query(
        `INSERT INTO site_settings (\`key\`, \`value\`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
        [key, JSON.stringify(value)]
      );
    }
    console.log("site_settings initialized (all blank).");
    console.log("Seed complete. Create content from the admin panel.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
