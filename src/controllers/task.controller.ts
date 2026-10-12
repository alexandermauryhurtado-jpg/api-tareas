import type { Request, RequestHandler } from "express";
import type {
  CreateTaskInput,
  ListTasksQuery,
  PutTaskInput,
  TaskIdParams
} from "../api/schemas/task.schema.js";
import { AuthenticationError } from "../errors/app-error.js";
import {
  createTaskForUser,
  deleteTaskForUser,
  getTaskForUser,
  getTasksForUser,
  updateTaskForUser
} from "../services/task.service.js";

/**
 * Devuelve el id del usuario autenticado.
 *
 * En la práctica `authMiddleware` siempre rellena `req.user` antes de llegar
 * aquí; esta comprobación protege contra un error de configuración de rutas
 * (por ejemplo, olvidar el middleware) devolviendo 401 en lugar de 500.
 *
 * @throws {AuthenticationError}
 */
export function getAuthenticatedUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AuthenticationError("Usuario no autenticado");
  }
  return req.user.id;
}

/** POST /tasks — crea una tarea del usuario autenticado. */
export const createTaskController: RequestHandler<
  Record<string, string>,
  unknown,
  CreateTaskInput
> = async (req, res) => {
  const task = await createTaskForUser(getAuthenticatedUserId(req), req.body);
  res.status(201).json({ message: "Tarea creada correctamente", task });
};

/** GET /tasks — lista las tareas del usuario (filtro opcional `?estado=`). */
export const getTasksController: RequestHandler = async (req, res) => {
  const { estado } = req.query as ListTasksQuery;
  const tasks = await getTasksForUser(
    getAuthenticatedUserId(req),
    estado ? { estado } : {}
  );
  res.status(200).json({ tasks });
};

/** GET /tasks/:id — devuelve una tarea del usuario. */
export const getTaskController: RequestHandler<TaskIdParams> = async (req, res) => {
  const task = await getTaskForUser(req.params.id, getAuthenticatedUserId(req));
  res.status(200).json({ task });
};

/** PUT /tasks/:id — reemplaza los campos editables de una tarea del usuario. */
export const updateTaskController: RequestHandler<
  TaskIdParams,
  unknown,
  PutTaskInput
> = async (req, res) => {
  const task = await updateTaskForUser(
    req.params.id,
    getAuthenticatedUserId(req),
    req.body
  );
  res.status(200).json({ message: "Tarea actualizada correctamente", task });
};

/** DELETE /tasks/:id — elimina una tarea del usuario. */
export const deleteTaskController: RequestHandler<TaskIdParams> = async (req, res) => {
  await deleteTaskForUser(req.params.id, getAuthenticatedUserId(req));
  res.status(200).json({ message: "Tarea eliminada correctamente" });
};
