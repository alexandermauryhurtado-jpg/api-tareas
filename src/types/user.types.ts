/** Usuario tal como se guarda en la base de datos (incluye el hash). */
export interface User {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
}

/**
 * Usuario que se puede devolver al cliente.
 * Nunca incluye `password_hash`.
 */
export type PublicUser = Omit<User, "password_hash">;

/** Datos necesarios para insertar un usuario. */
export interface CreateUserData {
  nombre: string;
  email: string;
  passwordHash: string;
}

/** Datos del usuario autenticado que el middleware adjunta a `req.user`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
