import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { validate } from "../../../src/api/middlewares/validate.middleware.js";
import { ValidationError } from "../../../src/errors/app-error.js";

function run(schemas: Parameters<typeof validate>[0], req: Partial<Request>) {
  const next = vi.fn() as unknown as NextFunction;
  validate(schemas)(req as Request, {} as Response, next);
  return vi.mocked(next);
}

describe("validate middleware", () => {
  it("reemplaza body, params y query por los datos parseados", () => {
    const req: Partial<Request> = {
      body: { nombre: "  Ana  " },
      params: { id: "5" },
      query: { estado: "pendiente" }
    };

    const next = run(
      {
        body: z.object({ nombre: z.string().trim() }),
        params: z.object({ id: z.string() }),
        query: z.object({ estado: z.string() })
      },
      req
    );

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ nombre: "Ana" });
    expect(req.params).toEqual({ id: "5" });
    expect(req.query).toEqual({ estado: "pendiente" });
  });

  it("acumula los errores de todas las partes con el prefijo del origen", () => {
    const next = run(
      {
        params: z.object({ id: z.string().regex(/^\d+$/) }),
        body: z.object({ titulo: z.string() })
      },
      { params: { id: "abc" }, body: {} }
    );

    const error = next.mock.calls[0]?.[0] as unknown as ValidationError;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details?.map((d) => d.field)).toEqual(["params.id", "body.titulo"]);
  });

  it("si no hay esquemas, deja pasar", () => {
    expect(run({}, {})).toHaveBeenCalledWith();
  });
});
