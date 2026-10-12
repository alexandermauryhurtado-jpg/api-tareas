/**
 * Detalle de un error de validación sobre un campo concreto.
 */
export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * Error base de la aplicación.
 *
 * Todos los errores "esperados" (datos inválidos, recurso inexistente,
 * credenciales incorrectas...) heredan de esta clase. El middleware de
 * errores la reconoce con `instanceof AppError` y responde con su
 * `statusCode`, `code` y `message`.
 *
 * Cualquier error que NO sea AppError se considera inesperado y se
 * responde como 500 sin filtrar detalles internos.
 */
export class AppError extends Error {
  /**
   * @param message - Mensaje seguro para mostrar al cliente.
   * @param statusCode - Código HTTP de la respuesta.
   * @param code - Código estable y legible por máquinas (ej. `NOT_FOUND`).
   * @param details - Información adicional opcional (ej. errores por campo).
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: ErrorDetail[]
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 - Los datos enviados no cumplen el esquema. */
export class ValidationError extends AppError {
  constructor(
    details: ErrorDetail[],
    message = "Los datos enviados no son válidos"
  ) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/** 400 - Petición mal formada (ej. JSON con sintaxis incorrecta). */
export class BadRequestError extends AppError {
  constructor(message = "Petición inválida") {
    super(message, 400, "BAD_REQUEST");
  }
}

/** 401 - Falta el token, es inválido/expirado o las credenciales no coinciden. */
export class AuthenticationError extends AppError {
  constructor(message = "No autenticado") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

/** 404 - El recurso no existe (o no pertenece al usuario autenticado). */
export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

/** 409 - Conflicto con el estado actual (ej. email ya registrado). */
export class ConflictError extends AppError {
  constructor(message = "Conflicto con el estado actual del recurso") {
    super(message, 409, "CONFLICT");
  }
}

/** 413 - El cuerpo de la petición supera el límite permitido. */
export class PayloadTooLargeError extends AppError {
  constructor(message = "El cuerpo de la petición es demasiado grande") {
    super(message, 413, "PAYLOAD_TOO_LARGE");
  }
}
