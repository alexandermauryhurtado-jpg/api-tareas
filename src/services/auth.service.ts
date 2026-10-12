import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { AuthenticationError, ConflictError } from "../errors/app-error.js";
import { isUniqueViolation } from "../persistence/pg-errors.js";
import {
  createUser,
  findUserByEmail
} from "../persistence/user.repository.js";
import type { PublicUser, User } from "../types/user.types.js";
import { signAccessToken } from "./token.service.js";

/** Mensaje único para credenciales inválidas (no revela si el email existe). */
const INVALID_CREDENTIALS = "Correo o contraseña incorrectos";

export interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

/** Quita el hash de la contraseña antes de devolver un usuario. */
function toPublicUser(user: User): PublicUser {
  return { id: user.id, nombre: user.nombre, email: user.email };
}

/** Normaliza el email para que "Ana@Mail.com " y "ana@mail.com" sean el mismo. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Hash "señuelo" con el mismo coste que los reales. Se compara contra él
 * cuando el email no existe para que el login tarde lo mismo en ambos casos
 * (evita descubrir emails registrados midiendo el tiempo de respuesta).
 * Se calcula una sola vez, la primera vez que se necesita.
 */
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= bcrypt.hash("dummy-password-for-timing", env.BCRYPT_SALT_ROUNDS);
  return dummyHashPromise;
}

/**
 * Registra un usuario nuevo guardando la contraseña con bcrypt.
 *
 * @throws {ConflictError} Si el email ya está registrado (incluso si dos
 *         peticiones simultáneas intentan registrar el mismo email).
 */
export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const email = normalizeEmail(input.email);

  if (await findUserByEmail(email)) {
    throw new ConflictError("El correo ya está registrado");
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  try {
    const user = await createUser({
      nombre: input.nombre.trim(),
      email,
      passwordHash
    });
    return toPublicUser(user);
  } catch (error) {
    // Carrera: otra petición insertó el mismo email entre el SELECT y el INSERT.
    if (isUniqueViolation(error)) {
      throw new ConflictError("El correo ya está registrado");
    }
    throw error;
  }
}

/**
 * Verifica las credenciales y, si son correctas, emite un JWT.
 *
 * El token se genera con `signAccessToken` (HS256, `sub` = id del usuario,
 * expira según `JWT_EXPIRES_IN`).
 *
 * @throws {AuthenticationError} Si el email no existe o la contraseña no coincide.
 */
export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const user = await findUserByEmail(normalizeEmail(input.email));

  const hashToCompare = user?.password_hash ?? (await getDummyHash());
  const passwordIsValid = await bcrypt.compare(input.password, hashToCompare);

  if (!user || !passwordIsValid) {
    throw new AuthenticationError(INVALID_CREDENTIALS);
  }

  const token = signAccessToken({ id: user.id, email: user.email });

  return { token, user: toPublicUser(user) };
}
