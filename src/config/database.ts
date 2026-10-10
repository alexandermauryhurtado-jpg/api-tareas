
import { Pool } from "pg";
import { env } from "./env.js";

/**
 * Pool de conexiones reutilizable para PostgreSQL.
 */
export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 10
});

/**
 * Comprueba que PostgreSQL responde a las consultas.
 */
export async function checkDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}
