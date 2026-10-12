import { Router } from "express";
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  getTasksController,
  updateTaskController
} from "../../controllers/task.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  putTaskSchema,
  taskIdParamsSchema
} from "../schemas/task.schema.js";

/**
 * Rutas de tareas. Montadas en `/tasks`. Todas requieren JWT.
 */
const tasksRouter = Router();

tasksRouter.use(authMiddleware);

const withId = { params: taskIdParamsSchema };

tasksRouter.post("/", validate({ body: createTaskSchema }), createTaskController);
tasksRouter.get("/", validate({ query: listTasksQuerySchema }), getTasksController);
tasksRouter.get("/:id", validate(withId), getTaskController);
tasksRouter.put("/:id", validate({ ...withId, body: putTaskSchema }), updateTaskController);
tasksRouter.delete("/:id", validate(withId), deleteTaskController);

export default tasksRouter;
