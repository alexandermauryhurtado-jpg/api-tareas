import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Variables de entorno de prueba: la app nunca lee el .env real en los tests.
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "test_db",
      DB_USER: "test",
      DB_PASSWORD: "test",
      JWT_SECRET: "test_secret_with_at_least_32_characters!!",
      JWT_EXPIRES_IN: "1h",
      BCRYPT_SALT_ROUNDS: "4",
      CORS_ORIGIN: "*"
    },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts", // arranque del proceso (listen + señales); se prueba manualmente
        "src/types/**" // solo tipos, no generan código
      ],
      reporter: ["text", "html", "lcov"],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 }
    }
  }
});
