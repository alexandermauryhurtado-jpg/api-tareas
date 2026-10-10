
import { pool } from "../config/database.js";

export type TaskStatus =
  | "pendiente"
  | "en curso"
  | "completada";

export interface Task {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_vencimiento: Date | null;
  estado: TaskStatus;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskData {
  titulo: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

export interface UpdateTaskData {
  titulo?: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

/**
 * Crea una tarea asociada al usuario autenticado.
 */
export async function createTask(
  userId: string,
  data: CreateTaskData
): Promise<Task> {
  const result = await pool.query<Task>(
    `INSERT INTO tasks (
      titulo,
      descripcion,
      fecha_vencimiento,
      estado,
      user_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      data.titulo,
      data.descripcion ?? null,
      data.fecha_vencimiento ?? null,
      data.estado ?? "pendiente",
      userId
    ]
  );

  return result.rows[0]!;
}

/**
 * Lista únicamente las tareas del usuario indicado.
 */
export async function findTasksByUser(
  userId: string
): Promise<Task[]> {
  const result = await pool.query<Task>(
    `SELECT *
     FROM tasks
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Busca una tarea que pertenezca al usuario indicado.
 */
export async function findTaskById(
  taskId: string,
  userId: string
): Promise<Task | null> {
  const result = await pool.query<Task>(
    `SELECT *
     FROM tasks
     WHERE id = $1 AND user_id = $2`,
    [taskId, userId]
  );

  return result.rows[0] ?? null;
}


/**
 * Actualiza únicamente los campos enviados
 * de una tarea que pertenece al usuario.
 */
export async function updateTask(
  taskId: string,
  userId: string,
  data: UpdateTaskData
): Promise<Task | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const addField = (column: string, value: unknown) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (data.titulo !== undefined) {
    addField("titulo", data.titulo);
  }

  if (data.descripcion !== undefined) {
    addField("descripcion", data.descripcion);
  }

  if (data.fecha_vencimiento !== undefined) {
    addField("fecha_vencimiento", data.fecha_vencimiento);
  }

  if (data.estado !== undefined) {
    addField("estado", data.estado);
  }

  if (fields.length === 0) {
    return findTaskById(taskId, userId);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");

  values.push(taskId);
  const taskIdPosition = values.length;

  values.push(userId);
  const userIdPosition = values.length;

  const result = await pool.query<Task>(
    `UPDATE tasks
     SET ${fields.join(", ")}
     WHERE id = $${taskIdPosition}
       AND user_id = $${userIdPosition}
     RETURNING *`,
    values
  );

  return result.rows[0] ?? null;
}

/**
 * Elimina una tarea únicamente si pertenece al usuario.
 */
export async function deleteTask(
  taskId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM tasks
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [taskId, userId]
  );

  return result.rowCount === 1;
}

