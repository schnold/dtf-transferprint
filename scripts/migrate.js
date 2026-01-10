import { Pool } from "pg";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function migrate() {
  try {
    const sql = readFileSync(
      "./better-auth_migrations/2026-01-10T20-53-44.927Z.sql",
      "utf-8"
    );
    await pool.query(sql);
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await pool.end();
  }
}

migrate();
