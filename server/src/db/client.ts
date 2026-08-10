import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Shared singleton connection pool
let _conn: mysql.Connection | null = null;

export async function getDb() {
  if (!_conn) {
    _conn = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
    });
  }
  return drizzle(_conn, { schema, mode: "default" });
}
