
import type { RequestHandler } from "express";
import {
  createTaskForUser,
  getTasksForUser,
  getTaskForUser,
  updateTaskForUser,
  deleteTaskForUser
} from "../services/task.service.js";
import type {
  CreateTaskData,
  UpdateTaskData
} from "../persistence/task.repository.js";

function getAuthenticatedUserId(
  req: Parameters<RequestHandler>[0]
): string {
  if (!req.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  return req.user.id;
}


function getTaskId(
  req: Parameters<RequestHandler>[0]
): string {
  const id = req.params.id;

  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    const error = new Error("Identificador de tarea inválido");
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  return id;
}



/**
 * POST /tasks
 */
export const createTaskController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const task = await createTaskForUser(
      userId,
      req.body as CreateTaskData
    );

    res.status(201).json({
      message: "Tarea creada correctamente",
      task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tasks
 */
export const getTasksController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const tasks = await getTasksForUser(userId);

    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tasks/:id
 */
export const getTaskController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const task = await getTaskForUser(
     getTaskId(req),
      userId
    );

    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /tasks/:id
 */
export const updateTaskController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const task = await updateTaskForUser(
      getTaskId(req),
      userId,
      req.body as UpdateTaskData
    );

    res.status(200).json({
      message: "Tarea actualizada correctamente",
      task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /tasks/:id
 */
export const deleteTaskController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const userId = getAuthenticatedUserId(req);

    await deleteTaskForUser(getTaskId(req), userId);

    res.status(200).json({
      message: "Tarea eliminada correctamente"
    });
  } catch (error) {
    next(error);
  }
};
