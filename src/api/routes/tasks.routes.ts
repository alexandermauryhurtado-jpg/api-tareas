
import { Router } from "express";
import { z } from "zod";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  createTaskController,
  getTasksController,
  getTaskController,
  updateTaskController,
  deleteTaskController
} from "../../controllers/task.controller.js";

const router = Router();

const taskSchema = z.object({
  titulo: z.string().trim().min(1).max(150),
  descripcion: z.string().max(5000).nullable().optional(),
  fecha_vencimiento: z.iso.datetime({ offset: true }).nullable().optional(),
  estado: z.enum(["pendiente", "en curso", "completada"]).optional()
}).strict();

const updateTaskSchema = taskSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" }
);

router.use(authMiddleware);

router.post("/", (req, res, next) => {
  const result = taskSchema.safeParse(req.body);

  if (!result.success) {
    next(result.error);
    return;
  }

  req.body = result.data;
  createTaskController(req, res, next);
});

router.get("/", getTasksController);

router.get("/:id", getTaskController);

router.patch("/:id", (req, res, next) => {
  const result = updateTaskSchema.safeParse(req.body);

  if (!result.success) {
    next(result.error);
    return;
  }

  req.body = result.data;
  updateTaskController(req, res, next);
});

router.delete("/:id", deleteTaskController);

export default router;
