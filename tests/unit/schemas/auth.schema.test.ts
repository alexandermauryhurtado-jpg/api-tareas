import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "../../../src/api/schemas/auth.schema.js";

const validRegister = {
  nombre: "Ana Pérez",
  email: "ana@mail.com",
  password: "UnaClaveSegura123"
};

describe("registerSchema", () => {
  it("normaliza el email (trim + minúsculas)", () => {
    const result = registerSchema.parse({ ...validRegister, email: "  Ana@MAIL.com " });
    expect(result.email).toBe("ana@mail.com");
  });

  it.each([
    ["email inválido", { email: "no-es-email" }],
    ["contraseña corta", { password: "corta" }],
    ["nombre de 1 letra", { nombre: "A" }],
    ["campo extra", { rol: "admin" }]
  ])("rechaza: %s", (_case, override) => {
    expect(registerSchema.safeParse({ ...validRegister, ...override }).success).toBe(false);
  });

  it("acepta 72 bytes pero rechaza 73 bytes (límite de bcrypt)", () => {
    expect(registerSchema.safeParse({ ...validRegister, password: "a".repeat(72) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...validRegister, password: "a".repeat(73) }).success).toBe(false);
  });

  it("cuenta bytes, no caracteres: 40 'ñ' = 80 bytes", () => {
    const password = "ñ".repeat(40); // 40 caracteres pero 80 bytes en UTF-8
    expect(registerSchema.safeParse({ ...validRegister, password }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("acepta credenciales con formato válido", () => {
    expect(loginSchema.safeParse({ email: "ana@mail.com", password: "x" }).success).toBe(true);
  });

  it("rechaza contraseña vacía o demasiado larga", () => {
    expect(loginSchema.safeParse({ email: "ana@mail.com", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "ana@mail.com", password: "a".repeat(73) }).success).toBe(false);
  });
});
