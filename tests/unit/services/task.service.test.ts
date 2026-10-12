import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../src/errors/app-error.js";
import * as repo from "../../../src/persistence/task.repository.js";
import {
  createTaskForUser,
  deleteTaskForUser,
  getTaskForUser,
  getTasksForUser,
  updateTaskForUser
} from "../../../src/services/task.service.js";
import { buildTask } from "../../helpers/fixtures.js";

vi.mock("../../../src/persistence/task.repository.js", () => ({
  createTask: vi.fn(),
  findTasksByUser: vi.fn(),
  findTaskById: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn()
}));

const mocked = vi.mocked(repo);

beforeEach(() => vi.resetAllMocks());

describe("task.service", () => {
  it("createTaskForUser delega en el repositorio con el userId", async () => {
    const task = buildTask();
    mocked.createTask.mockResolvedValueOnce(task);

    await expect(createTaskForUser("10", { titulo: "x" })).resolves.toBe(task);
    expect(mocked.createTask).toHaveBeenCalledWith("10", { titulo: "x" });
  });

  it("getTasksForUser pasa el filtro (vacío por defecto)", async () => {
    mocked.findTasksByUser.mockResolvedValue([]);

    await getTasksForUser("10");
    await getTasksForUser("10", { estado: "completada" });

    expect(mocked.findTasksByUser).toHaveBeenNthCalledWith(1, "10", {});
    expect(mocked.findTasksByUser).toHaveBeenNthCalledWith(2, "10", { estado: "completada" });
  });

  describe("getTaskForUser", () => {
    it("devuelve la tarea si es del usuario", async () => {
      const task = buildTask();
      mocked.findTaskById.mockResolvedValueOnce(task);

      await expect(getTaskForUser("1", "10")).resolves.toBe(task);
      expect(mocked.findTaskById).toHaveBeenCalledWith("1", "10");
    });

    it("NotFoundError si no existe o es de otro usuario", async () => {
      mocked.findTaskById.mockResolvedValueOnce(null);

      await expect(getTaskForUser("1", "99")).rejects.toThrow(new NotFoundError("Tarea no encontrada"));
    });
  });

  describe("updateTaskForUser", () => {
    it("devuelve la tarea actualizada", async () => {
      const task = buildTask({ estado: "completada" });
      mocked.updateTask.mockResolvedValueOnce(task);

      await expect(updateTaskForUser("1", "10", { estado: "completada" })).resolves.toBe(task);
    });

    it("NotFoundError si no se actualizó nada", async () => {
      mocked.updateTask.mockResolvedValueOnce(null);

      await expect(updateTaskForUser("1", "10", { estado: "completada" })).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  describe("deleteTaskForUser", () => {
    it("resuelve si se borró", async () => {
      mocked.deleteTask.mockResolvedValueOnce(true);
      await expect(deleteTaskForUser("1", "10")).resolves.toBeUndefined();
    });

    it("NotFoundError si no se borró", async () => {
      mocked.deleteTask.mockResolvedValueOnce(false);
      await expect(deleteTaskForUser("1", "10")).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
