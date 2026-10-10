
import {
  createTask,
  findTasksByUser,
  findTaskById,
  updateTask,
  deleteTask,
  type CreateTaskData,
  type UpdateTaskData
} from "../persistence/task.repository.js";

/**
 * Crea una tarea para el usuario autenticado.
 */
export async function createTaskForUser(
  userId: string,
  data: CreateTaskData
) {
  return createTask(userId, data);
}

/**
 * Obtiene todas las tareas del usuario autenticado.
 */
export async function getTasksForUser(userId: string) {
  return findTasksByUser(userId);
}

/**
 * Obtiene una tarea específica del usuario.
 */
export async function getTaskForUser(
  taskId: string,
  userId: string
) {
  const task = await findTaskById(taskId, userId);

  if (!task) {
    const error = new Error("Tarea no encontrada");
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  return task;
}

/**
 * Actualiza una tarea del usuario.
 */
export async function updateTaskForUser(
  taskId: string,
  userId: string,
  data: UpdateTaskData
) {
  const task = await updateTask(taskId, userId, data);

  if (!task) {
    const error = new Error("Tarea no encontrada");
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  return task;
}

/**
 * Elimina una tarea del usuario.
 */
export async function deleteTaskForUser(
  taskId: string,
  userId: string
): Promise<void> {
  const deleted = await deleteTask(taskId, userId);

  if (!deleted) {
    const error = new Error("Tarea no encontrada");
    Object.assign(error, { statusCode: 404 });
    throw error;
  }
}
