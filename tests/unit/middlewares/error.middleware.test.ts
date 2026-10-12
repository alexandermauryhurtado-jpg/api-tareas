import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  errorMiddleware,
  notFoundMiddleware
} from "../../../src/api/middlewares/error.middleware.js";
import {
  NotFoundError,
  ValidationError
} from "../../../src/errors/app-error.js";

function mockResponse(headersSent = false) {
  const res = { headersSent } as Response & { body?: unknown };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  }) as unknown as Response["json"];
  return res;
}

function handle(error: unknown, res = mockResponse()) {
  const next = vi.fn() as unknown as NextFunction;
  errorMiddleware(error, {} as Request, res, next);
  return { res, next: vi.mocked(next) };
}

describe("errorMiddleware", () => {
  it("responde con status, código y mensaje de un AppError", () => {
    const { res } = handle(new NotFoundError("Tarea no encontrada"));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Tarea no encontrada" } });
  });

  it("incluye details para ValidationError", () => {
    const { res } = handle(new ValidationError([{ field: "body.titulo", message: "requerido" }]));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({
      error: { code: "VALIDATION_ERROR", details: [{ field: "body.titulo" }] }
    });
  });

  it("convierte un ZodError suelto en 400 VALIDATION_ERROR", () => {
    const zodError = z.object({ a: z.string() }).safeParse({}).error;
    const { res } = handle(zodError);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ error: { code: "VALIDATION_ERROR", details: [{ field: "a" }] } });
  });

  it("JSON mal formado (body-parser) → 400 BAD_REQUEST", () => {
    const { res } = handle(Object.assign(new SyntaxError("Unexpected token"), { type: "entity.parse.failed" }));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  it("body demasiado grande → 413", () => {
    const { res } = handle(Object.assign(new Error("too large"), { type: "entity.too.large" }));

    expect(res.status).toHaveBeenCalledWith(413);
  });

  it.each([new Error("detalle interno de la BD"), "un string", null])(
    "error desconocido (%s) → 500 genérico sin filtrar detalles",
    (error) => {
      const { res } = handle(error);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Error interno del servidor" }
      });
    }
  );

  it("si las cabeceras ya se enviaron, delega en Express", () => {
    const error = new Error("tarde");
    const { res, next } = handle(error, mockResponse(true));

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("notFoundMiddleware", () => {
  it("pasa un NotFoundError con método y ruta", () => {
    const next = vi.fn() as unknown as NextFunction;
    notFoundMiddleware({ method: "GET", path: "/nada" } as Request, {} as Response, next);

    const error = vi.mocked(next).mock.calls[0]?.[0] as unknown as NotFoundError;
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe("Ruta no encontrada: GET /nada");
  });
});
