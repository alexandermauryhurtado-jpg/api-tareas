import { NotFoundError } from "../errors/app-error.js";
import {
  createTask,
  deleteTask,
  findTaskById,
  findTasksByUser,
  updateTask
} from "../persistence/task.repository.js";
import type {
  CreateTaskData,
  Task,
  TaskFilters,
  UpdateTaskData
} from "../types/task.types.js";

const TASK_NOT_FOUND = "Tarea no encontrada";

/**
 * Crea una tarea para el usuario autenticado.
 */
export function createTaskForUser(
  userId: string,
  data: CreateTaskData
): Promise<Task> {
  return createTask(userId, data);
}

/**
 * Lista las tareas del usuario autenticado, opcionalmente filtradas por estado.
 */
export function getTasksForUser(
  userId: string,
  filters: TaskFilters = {}
): Promise<Task[]> {
  return findTasksByUser(userId, filters);
}

/**
 * Obtiene una tarea del usuario.
 *
 * @throws {NotFoundError} Si no existe **o** pertenece a otro usuario.
 *         Se responde 404 (no 403) para no revelar que la tarea existe.
 */
export async function getTaskForUser(
  taskId: string,
  userId: string
): Promise<Task> {
  const task = await findTaskById(taskId, userId);
  if (!task) throw new NotFoundError(TASK_NOT_FOUND);
  return task;
}

/**
 * Actualiza una tarea del usuario (PUT /tasks/:id).
 *
 * @throws {NotFoundError} Si no existe o no es del usuario.
 */
export async function updateTaskForUser(
  taskId: string,
  userId: string,
  data: UpdateTaskData
): Promise<Task> {
  const task = await updateTask(taskId, userId, data);
  if (!task) throw new NotFoundError(TASK_NOT_FOUND);
  return task;
}

/**
 * Elimina una tarea del usuario.
 *
 * @throws {NotFoundError} Si no existe o no es del usuario.
 */
export async function deleteTaskForUser(
  taskId: string,
  userId: string
): Promise<void> {
  const deleted = await deleteTask(taskId, userId);
  if (!deleted) throw new NotFoundError(TASK_NOT_FOUND);
}
