import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import authMiddleware from "../../../src/api/middlewares/auth.middleware.js";
import { AuthenticationError } from "../../../src/errors/app-error.js";
import { signAccessToken } from "../../../src/services/token.service.js";

function run(authorization?: string) {
  const req = { headers: { authorization } } as unknown as Request;
  const next = vi.fn() as unknown as NextFunction;
  authMiddleware(req, {} as Response, next);
  return { req, next: vi.mocked(next) };
}

describe("authMiddleware", () => {
  it("con token válido rellena req.user y llama a next() sin error", () => {
    const token = signAccessToken({ id: "10", email: "ana@mail.com" });

    const { req, next } = run(`Bearer ${token}`);

    expect(req.user).toEqual({ id: "10", email: "ana@mail.com" });
    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ["sin cabecera", undefined],
    ["esquema distinto de Bearer", "Basic abc"],
    ["Bearer sin token", "Bearer    "]
  ])("%s → AuthenticationError 'requerido'", (_case, header) => {
    const { req, next } = run(header);

    const error = next.mock.calls[0]?.[0] as unknown as AuthenticationError;
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe("Token de autenticación requerido");
    expect(req.user).toBeUndefined();
  });

  it("token inválido → AuthenticationError", () => {
    const { next } = run("Bearer token.falso.123");

    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AuthenticationError);
  });
});
