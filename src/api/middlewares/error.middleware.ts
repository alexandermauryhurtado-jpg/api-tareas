import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../../config/env.js";
import {
  AppError,
  BadRequestError,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError
} from "../../errors/app-error.js";

/**
 * Convierte errores de terceros conocidos en errores de la aplicación.
 * Lo que no se reconoce se devuelve tal cual (acabará como 500).
 */
function toAppError(error: unknown): unknown {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new ValidationError(
      error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    );
  }

  // Errores de `express.json()` (body-parser) traen una propiedad `type`.
  const type = (error as { type?: unknown } | null)?.type;
  if (type === "entity.parse.failed") {
    return new BadRequestError("El cuerpo de la petición no es un JSON válido");
  }
  if (type === "entity.too.large") {
    return new PayloadTooLargeError();
  }

  return error;
}

/**
 * Manejador centralizado de errores (debe registrarse el último).
 *
 * Formato de respuesta siempre igual:
 * ```json
 * { "error": { "code": "NOT_FOUND", "message": "Tarea no encontrada" } }
 * ```
 * Los errores inesperados responden 500 con un mensaje genérico y se
 * registran en consola, sin exponer trazas ni detalles internos al cliente.
 */
export const errorMiddleware: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = toAppError(error);

  if (appError instanceof AppError) {
    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {})
      }
    });
    return;
  }

  if (env.NODE_ENV !== "test") {
    console.error("Error no controlado:", error);
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor"
    }
  });
};

/** Responde 404 para cualquier ruta que no exista. */
export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.path}`));
};
