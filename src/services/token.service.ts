import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AuthenticationError } from "../errors/app-error.js";
import type { AuthenticatedUser } from "../types/user.types.js";

/**
 * Algoritmo de firma. Se fija explícitamente tanto al firmar como al
 * verificar para impedir ataques de "confusión de algoritmo"
 * (ej. un token con `alg: none` o firmado con otro algoritmo).
 */
const JWT_ALGORITHM = "HS256" as const;

/**
 * Genera un JWT firmado para el usuario.
 *
 * Contenido del token (payload):
 * - `sub`: id del usuario (claim estándar "subject").
 * - `email`: correo del usuario.
 * - `iat` / `exp`: fecha de emisión y de expiración (los añade la librería).
 *
 * @example
 * const token = signAccessToken({ id: "1", email: "ana@mail.com" });
 */
export function signAccessToken(user: AuthenticatedUser): string {
  return jwt.sign({ email: user.email }, env.JWT_SECRET, {
    subject: user.id,
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
}

/**
 * Verifica la firma y la expiración de un JWT y extrae el usuario.
 *
 * @throws {AuthenticationError} Si el token está expirado, mal firmado,
 *         usa otro algoritmo o su contenido no tiene la forma esperada.
 */
export function verifyAccessToken(token: string): AuthenticatedUser {
  let payload: string | jwt.JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM]
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError("El token ha expirado");
    }

    throw new AuthenticationError("Token de autenticación inválido");
  }

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string"
  ) {
    throw new AuthenticationError("Token de autenticación inválido");
  }

  return { id: payload.sub, email: payload.email };
}
