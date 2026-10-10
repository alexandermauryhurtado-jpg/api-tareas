
import { pool } from "../config/database.js";

export interface User {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
}

export interface CreateUserData {
  nombre: string;
  email: string;
  passwordHash: string;
}

/**
 * Busca un usuario por correo electrónico.
 */
export async function findUserByEmail(
  email: string
): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT id, nombre, email, password_hash
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] ?? null;
}

/**
 * Crea un usuario y devuelve sus datos.
 */
export async function createUser(
  data: CreateUserData
): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (nombre, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, email, password_hash`,
    [data.nombre, data.email, data.passwordHash]
  );

  return result.rows[0]!;
}
