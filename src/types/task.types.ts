/** Estados permitidos para una tarea (deben coincidir con el CHECK de la BD). */
export const TASK_STATUSES = ["pendiente", "en curso", "completada"] as const;

/** Estado de una tarea: `"pendiente" | "en curso" | "completada"`. */
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Tarea tal como se guarda en PostgreSQL.
 *
 * `id` y `user_id` son `string` porque la columna es BIGINT y el driver `pg`
 * devuelve BIGINT como texto para no perder precisión (un BIGINT puede superar
 * `Number.MAX_SAFE_INTEGER`).
 */
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

/** Datos para crear una tarea (solo `titulo` es obligatorio). */
export interface CreateTaskData {
  titulo: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

/** Datos para actualizar una tarea: todos los campos son opcionales. */
export type UpdateTaskData = Partial<CreateTaskData>;

/** Filtros opcionales al listar tareas. */
export interface TaskFilters {
  estado?: TaskStatus;
}
