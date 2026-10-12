import type { RequestHandler } from "express";
import { AuthenticationError } from "../../errors/app-error.js";
import { verifyAccessToken } from "../../services/token.service.js";

const BEARER_PREFIX = "Bearer ";

/**
 * Protege rutas que requieren usuario autenticado.
 *
 * 1. Lee la cabecera `Authorization: Bearer <token>`.
 * 2. Verifica el token con `verifyAccessToken` (firma, algoritmo HS256, expiración).
 * 3. Guarda `{ id, email }` en `req.user` y deja pasar la petición.
 *
 * Ante cualquier fallo llama a `next(AuthenticationError)`; la respuesta 401
 * la construye el middleware de errores (formato único de error).
 */
const authMiddleware: RequestHandler = (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith(BEARER_PREFIX)) {
    next(new AuthenticationError("Token de autenticación requerido"));
    return;
  }

  const token = authorization.slice(BEARER_PREFIX.length).trim();

  if (!token) {
    next(new AuthenticationError("Token de autenticación requerido"));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
