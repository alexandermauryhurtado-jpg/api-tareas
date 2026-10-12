import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { getAuthenticatedUserId } from "../../../src/controllers/task.controller.js";
import { AuthenticationError } from "../../../src/errors/app-error.js";

describe("getAuthenticatedUserId", () => {
  it("devuelve el id cuando authMiddleware rellenó req.user", () => {
    const req = { user: { id: "10", email: "a@a.com" } } as Request;
    expect(getAuthenticatedUserId(req)).toBe("10");
  });

  it("lanza AuthenticationError (401, no 500) si falta req.user", () => {
    expect(() => getAuthenticatedUserId({} as Request)).toThrow(AuthenticationError);
  });
});
