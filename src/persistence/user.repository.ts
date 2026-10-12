import { pool } from "../config/database.js";
import type { CreateUserData, User } from "../types/user.types.js";

/**
 * Busca un usuario por correo electrónico.
 *
 * @param email - Email ya normalizado (minúsculas, sin espacios).
 * @returns El usuario o `null` si no existe.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT id, nombre, email, password_hash
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] ?? null;
}

/**
 * Inserta un usuario.
 *
 * @throws El error original de `pg` (código 23505) si el email ya existe.
 *         El servicio es quien lo traduce a `ConflictError`.
 */
export async function createUser(data: CreateUserData): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (nombre, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, email, password_hash`,
    [data.nombre, data.email, data.passwordHash]
  );

  return result.rows[0]!;
}
