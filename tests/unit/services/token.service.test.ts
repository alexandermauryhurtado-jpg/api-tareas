import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "../../../src/config/env.js";
import { AuthenticationError } from "../../../src/errors/app-error.js";
import { signAccessToken, verifyAccessToken } from "../../../src/services/token.service.js";

const user = { id: "10", email: "ana@mail.com" };

describe("signAccessToken", () => {
  it("genera un token HS256 con sub, email, iat y exp", () => {
    const token = signAccessToken(user);
    const decoded = jwt.decode(token, { complete: true });

    expect(decoded?.header.alg).toBe("HS256");
    expect(decoded?.payload).toMatchObject({ sub: "10", email: "ana@mail.com" });
    const payload = decoded?.payload as jwt.JwtPayload;
    expect(payload.exp! - payload.iat!).toBe(3600); // JWT_EXPIRES_IN=1h
  });
});

describe("verifyAccessToken", () => {
  it("devuelve el usuario de un token válido (ida y vuelta)", () => {
    expect(verifyAccessToken(signAccessToken(user))).toEqual(user);
  });

  it("rechaza un token expirado con mensaje específico", () => {
    const expired = jwt.sign({ email: user.email }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: -10
    });
    expect(() => verifyAccessToken(expired)).toThrow("El token ha expirado");
  });

  it("rechaza un token firmado con otro secreto", () => {
    const forged = jwt.sign({ email: user.email }, "otro_secreto_de_al_menos_32_caracteres!!", {
      subject: user.id
    });
    expect(() => verifyAccessToken(forged)).toThrow(AuthenticationError);
  });

  it("rechaza un token con algoritmo distinto de HS256 (ej. HS512)", () => {
    const hs512 = jwt.sign({ email: user.email }, env.JWT_SECRET, {
      subject: user.id,
      algorithm: "HS512"
    });
    expect(() => verifyAccessToken(hs512)).toThrow("Token de autenticación inválido");
  });

  it("rechaza un token sin firma (alg: none)", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ sub: "1", email: "x@x.com" })).toString("base64url");
    expect(() => verifyAccessToken(`${header}.${body}.`)).toThrow(AuthenticationError);
  });

  it("rechaza un token válido pero sin email en el payload", () => {
    const noEmail = jwt.sign({}, env.JWT_SECRET, { subject: user.id });
    expect(() => verifyAccessToken(noEmail)).toThrow("Token de autenticación inválido");
  });

  it("rechaza un token cuyo payload es un string", () => {
    const stringPayload = jwt.sign("texto", env.JWT_SECRET);
    expect(() => verifyAccessToken(stringPayload)).toThrow(AuthenticationError);
  });

  it("rechaza basura", () => {
    expect(() => verifyAccessToken("no.es.jwt")).toThrow(AuthenticationError);
  });
});
