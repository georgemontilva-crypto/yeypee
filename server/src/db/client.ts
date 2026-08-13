import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/**
 * Shared connection POOL.
 *
 * This used to be a single `createConnection` kept in a module variable. MySQL
 * closes idle connections after a while (and Railway restarts the database for
 * maintenance); once that happened, every query failed with
 * "Can't add new command when connection is in closed state" until the app was
 * redeployed — the site looked empty even though the data was intact.
 *
 * A pool hands out a healthy connection per query and replaces dead ones on its
 * own, so an idle night or a database restart no longer takes the site down.
 */
let _pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 4,
      // Recycle idle connections well before MySQL's own wait_timeout.
      idleTimeout: 60_000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
    });
  }
  return _pool;
}

export async function getDb() {
  return drizzle(getPool(), { schema, mode: "default" });
}
