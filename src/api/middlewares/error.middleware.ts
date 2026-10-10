
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

/**
 * Centraliza los errores y devuelve respuestas JSON.
 */
const errorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  next
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Los datos enviados no son válidos",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  const statusCode =
    typeof error?.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  const message =
    statusCode === 500
      ? "Error interno del servidor"
      : error instanceof Error
        ? error.message
        : "Error en la solicitud";

  res.status(statusCode).json({ message });
};

export default errorMiddleware;
