import { Pool } from "pg";
import { env } from "./env.js";

/**
 * Pool de conexiones a PostgreSQL.
 *
 * Se crea una sola vez al importar el módulo (los módulos ES se evalúan una
 * única vez), así que todos los repositorios comparten el mismo pool.
 * Un pool reutiliza conexiones abiertas en lugar de abrir una por consulta.
 */
export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 10
});

// Evita que un error en una conexión inactiva tumbe el proceso.
pool.on("error", (error) => {
  console.error("Error inesperado en una conexión inactiva de PostgreSQL:", error);
});

/**
 * Comprueba que PostgreSQL responde. Se usa al arrancar el servidor.
 *
 * @throws Si la base de datos no está disponible o las credenciales son incorrectas.
 */
export async function checkDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}
