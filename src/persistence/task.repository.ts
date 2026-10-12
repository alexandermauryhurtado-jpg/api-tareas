import { pool } from "../config/database.js";
import type {
  CreateTaskData,
  Task,
  TaskFilters,
  UpdateTaskData
} from "../types/task.types.js";

/**
 * Columnas que se pueden actualizar.
 * Es una lista blanca: los nombres de columna NUNCA vienen del cliente,
 * así se evita inyección SQL al construir el UPDATE dinámico.
 */
const UPDATABLE_COLUMNS = [
  "titulo",
  "descripcion",
  "fecha_vencimiento",
  "estado"
] as const satisfies ReadonlyArray<keyof UpdateTaskData>;

/**
 * Crea una tarea asociada al usuario.
 *
 * @param userId - Id del usuario autenticado (dueño de la tarea).
 * @param data - Datos validados de la tarea.
 */
export async function createTask(
  userId: string,
  data: CreateTaskData
): Promise<Task> {
  const result = await pool.query<Task>(
    `INSERT INTO tasks (titulo, descripcion, fecha_vencimiento, estado, user_id)
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
 *
 * @param userId - Dueño de las tareas.
 * @param filters - Filtro opcional por estado (usa el índice `idx_tasks_user_estado`).
 */
export async function findTasksByUser(
  userId: string,
  filters: TaskFilters = {}
): Promise<Task[]> {
  const values: unknown[] = [userId];
  let sql = "SELECT * FROM tasks WHERE user_id = $1";

  if (filters.estado) {
    values.push(filters.estado);
    sql += ` AND estado = $${values.length}`;
  }

  sql += " ORDER BY created_at DESC, id DESC";

  const result = await pool.query<Task>(sql, values);
  return result.rows;
}

/**
 * Busca una tarea por id **y** dueño.
 * Si la tarea existe pero es de otro usuario, devuelve `null`.
 */
export async function findTaskById(
  taskId: string,
  userId: string
): Promise<Task | null> {
  const result = await pool.query<Task>(
    "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, userId]
  );

  return result.rows[0] ?? null;
}

/**
 * Actualiza solo los campos presentes en `data` de una tarea del usuario.
 *
 * @returns La tarea actualizada o `null` si no existe / no es del usuario.
 */
export async function updateTask(
  taskId: string,
  userId: string,
  data: UpdateTaskData
): Promise<Task | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (data[column] !== undefined) {
      values.push(data[column]);
      sets.push(`${column} = $${values.length}`);
    }
  }

  if (sets.length === 0) {
    return findTaskById(taskId, userId);
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");
  values.push(taskId, userId);

  const result = await pool.query<Task>(
    `UPDATE tasks
     SET ${sets.join(", ")}
     WHERE id = $${values.length - 1} AND user_id = $${values.length}
     RETURNING *`,
    values
  );

  return result.rows[0] ?? null;
}

/**
 * Elimina una tarea solo si pertenece al usuario.
 *
 * @returns `true` si se borró, `false` si no existía o no era suya.
 */
export async function deleteTask(
  taskId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, userId]
  );

  return result.rowCount === 1;
}
