import { describe, expect, it, vi } from "vitest";
import { checkDatabaseConnection, pool } from "../../../src/config/database.js";

describe("database", () => {
  it("checkDatabaseConnection ejecuta SELECT 1", async () => {
    const query = vi.spyOn(pool, "query").mockResolvedValueOnce({ rows: [] } as never);

    await checkDatabaseConnection();

    expect(query).toHaveBeenCalledWith("SELECT 1");
  });

  it("propaga el error si la BD no responde", async () => {
    vi.spyOn(pool, "query").mockRejectedValueOnce(new Error("ECONNREFUSED") as never);

    await expect(checkDatabaseConnection()).rejects.toThrow("ECONNREFUSED");
  });

  it("registra (sin tumbar el proceso) errores de conexiones inactivas", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    pool.emit("error", new Error("conexión perdida"));

    expect(log).toHaveBeenCalled();
  });
});
