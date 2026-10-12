import { afterEach, describe, expect, it } from "vitest";
import { Config, env, parseEnv } from "../../../src/config/env.js";

const validEnv = {
  DB_HOST: "localhost",
  DB_NAME: "db",
  DB_USER: "user",
  DB_PASSWORD: "pass",
  JWT_SECRET: "x".repeat(32)
};

describe("parseEnv", () => {
  it("aplica valores por defecto y convierte números", () => {
    const config = parseEnv({ ...validEnv, PORT: "8080" });

    expect(config.PORT).toBe(8080);
    expect(config.DB_PORT).toBe(5432);
    expect(config.NODE_ENV).toBe("development");
    expect(config.JWT_EXPIRES_IN).toBe("1h");
    expect(config.BCRYPT_SALT_ROUNDS).toBe(12);
    expect(config.CORS_ORIGIN).toBe("*");
  });

  it("devuelve un objeto congelado (inmutable)", () => {
    expect(Object.isFrozen(parseEnv(validEnv))).toBe(true);
  });

  it("falla con un mensaje claro si falta una variable obligatoria", () => {
    const { DB_HOST: _omit, ...withoutHost } = validEnv;
    expect(() => parseEnv(withoutHost)).toThrow(/Configuración de entorno inválida[\s\S]*DB_HOST/);
  });

  it("rechaza un JWT_SECRET demasiado corto", () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: "corto" })).toThrow(/32 caracteres/);
  });

  it("rechaza un puerto fuera de rango", () => {
    expect(() => parseEnv({ ...validEnv, PORT: "70000" })).toThrow();
  });
});

describe("Config (Singleton)", () => {
  afterEach(() => Config.resetForTests());

  it("devuelve siempre la misma instancia", () => {
    expect(Config.getInstance()).toBe(Config.getInstance());
  });

  it("crea una instancia nueva después de resetForTests", () => {
    const first = Config.getInstance();
    Config.resetForTests();
    expect(Config.getInstance()).not.toBe(first);
  });

  it("expone los valores de prueba a través de `env`", () => {
    expect(env.NODE_ENV).toBe("test");
    expect(env.BCRYPT_SALT_ROUNDS).toBe(4);
  });
});
