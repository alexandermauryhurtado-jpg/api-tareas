import { describe, expect, it } from "vitest";
import {
  AppError,
  AuthenticationError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError
} from "../../../src/errors/app-error.js";

describe("Clases de error personalizadas", () => {
  it.each([
    [new BadRequestError(), 400, "BAD_REQUEST", "BadRequestError"],
    [new AuthenticationError(), 401, "AUTHENTICATION_ERROR", "AuthenticationError"],
    [new NotFoundError(), 404, "NOT_FOUND", "NotFoundError"],
    [new ConflictError(), 409, "CONFLICT", "ConflictError"],
    [new PayloadTooLargeError(), 413, "PAYLOAD_TOO_LARGE", "PayloadTooLargeError"]
  ])("%s tiene status %i y código %s", (error, status, code, name) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(code);
    expect(error.name).toBe(name);
    expect(error.message).not.toBe("");
  });

  it("ValidationError incluye los detalles por campo", () => {
    const error = new ValidationError([{ field: "body.email", message: "inválido" }]);

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details).toEqual([{ field: "body.email", message: "inválido" }]);
  });

  it("permite mensajes personalizados", () => {
    expect(new NotFoundError("Tarea no encontrada").message).toBe("Tarea no encontrada");
  });
});
