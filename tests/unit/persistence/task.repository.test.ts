import { beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../../../src/config/database.js";
import {
  createTask,
  deleteTask,
  findTaskById,
  findTasksByUser,
  updateTask
} from "../../../src/persistence/task.repository.js";
import { buildTask } from "../../helpers/fixtures.js";

vi.mock("../../../src/config/database.js", () => ({ pool: { query: vi.fn() } }));

const query = vi.mocked(pool.query) as unknown as ReturnType<typeof vi.fn>;
const lastCall = () => query.mock.calls.at(-1) as [string, unknown[]];
const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

beforeEach(() => query.mockReset());

describe("task.repository", () => {
  it("createTask inserta con valores por defecto y el user_id", async () => {
    const task = buildTask();
    query.mockResolvedValueOnce({ rows: [task] });

    await expect(createTask("10", { titulo: "Estudiar" })).resolves.toBe(task);

    const [sql, values] = lastCall();
    expect(sql).toContain("INSERT INTO tasks");
    expect(values).toEqual(["Estudiar", null, null, "pendiente", "10"]);
  });

  it("createTask respeta los campos opcionales enviados", async () => {
    query.mockResolvedValueOnce({ rows: [buildTask()] });

    await createTask("10", {
      titulo: "x",
      descripcion: "d",
      fecha_vencimiento: "2026-12-31T00:00:00Z",
      estado: "en curso"
    });

    expect(lastCall()[1]).toEqual(["x", "d", "2026-12-31T00:00:00Z", "en curso", "10"]);
  });

  it("findTasksByUser filtra SIEMPRE por user_id", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(findTasksByUser("10")).resolves.toEqual([]);

    const [sql, values] = lastCall();
    expect(normalize(sql)).toBe(
      "SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC, id DESC"
    );
    expect(values).toEqual(["10"]);
  });

  it("findTasksByUser añade el filtro por estado como parámetro", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await findTasksByUser("10", { estado: "completada" });

    const [sql, values] = lastCall();
    expect(sql).toContain("AND estado = $2");
    expect(values).toEqual(["10", "completada"]);
  });

  it("findTaskById busca por id Y user_id; null si no hay filas", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(findTaskById("1", "10")).resolves.toBeNull();
    expect(lastCall()[0]).toContain("WHERE id = $1 AND user_id = $2");
    expect(lastCall()[1]).toEqual(["1", "10"]);
  });

  it("findTaskById devuelve la fila encontrada", async () => {
    const task = buildTask();
    query.mockResolvedValueOnce({ rows: [task] });
    await expect(findTaskById("1", "10")).resolves.toBe(task);
  });

  describe("updateTask", () => {
    it("construye el SET solo con los campos enviados (null incluido)", async () => {
      const task = buildTask();
      query.mockResolvedValueOnce({ rows: [task] });

      await expect(
        updateTask("1", "10", { titulo: "Nuevo", descripcion: null })
      ).resolves.toBe(task);

      const [sql, values] = lastCall();
      expect(normalize(sql)).toBe(
        "UPDATE tasks SET titulo = $1, descripcion = $2, updated_at = CURRENT_TIMESTAMP " +
          "WHERE id = $3 AND user_id = $4 RETURNING *"
      );
      expect(values).toEqual(["Nuevo", null, "1", "10"]);
    });

    it("con todos los campos (PUT) usa 4 parámetros + id + user_id", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await expect(
        updateTask("1", "10", {
          titulo: "t",
          descripcion: "d",
          fecha_vencimiento: null,
          estado: "completada"
        })
      ).resolves.toBeNull();

      const [sql, values] = lastCall();
      expect(sql).toContain("WHERE id = $5 AND user_id = $6");
      expect(values).toEqual(["t", "d", null, "completada", "1", "10"]);
    });

    it("ignora claves que no están en la lista blanca de columnas", async () => {
      query.mockResolvedValueOnce({ rows: [buildTask()] });

      await updateTask("1", "10", { estado: "pendiente", user_id: "99" } as never);

      const [sql] = lastCall();
      expect(sql).not.toContain("user_id = $1");
      expect(sql).toContain("estado = $1");
    });

    it("sin campos, no hace UPDATE y devuelve la tarea actual", async () => {
      const task = buildTask();
      query.mockResolvedValueOnce({ rows: [task] });

      await expect(updateTask("1", "10", {})).resolves.toBe(task);
      expect(lastCall()[0]).toContain("SELECT");
    });
  });

  it("deleteTask devuelve true solo si se borró una fila", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    await expect(deleteTask("1", "10")).resolves.toBe(true);
    expect(lastCall()[1]).toEqual(["1", "10"]);

    query.mockResolvedValueOnce({ rowCount: 0 });
    await expect(deleteTask("1", "99")).resolves.toBe(false);
  });
});
