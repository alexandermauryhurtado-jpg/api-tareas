import { z } from "zod";
import { TASK_STATUSES } from "../../types/task.types.js";

/** Máximo valor de un BIGINT en PostgreSQL. */
const PG_BIGINT_MAX = 9223372036854775807n;

const titulo = z.string().trim().min(1, "El título es obligatorio").max(150);
const descripcion = z.string().trim().max(5000).nullable();
const fechaVencimiento = z.iso
  .datetime({ offset: true, message: "Debe ser una fecha ISO 8601, ej. 2026-12-31T23:59:00Z" })
  .nullable();
const estado = z.enum(TASK_STATUSES);

/** POST /tasks — solo `titulo` es obligatorio. */
export const createTaskSchema = z
  .object({
    titulo,
    descripcion: descripcion.optional(),
    fecha_vencimiento: fechaVencimiento.optional(),
    estado: estado.optional()
  })
  .strict();

/** PUT /tasks/:id — reemplazo completo: todos los campos son obligatorios. */
export const putTaskSchema = z
  .object({
    titulo,
    descripcion,
    fecha_vencimiento: fechaVencimiento,
    estado
  })
  .strict();

/**
 * Parámetro `:id` de la ruta. Debe ser un entero positivo que quepa en un
 * BIGINT; si no, PostgreSQL lanzaría un error y acabaría en un 500.
 */
export const taskIdParamsSchema = z.object({
  // Un solo `refine`: en Zod 4 las validaciones encadenadas se siguen ejecutando
  // aunque una anterior falle, y `BigInt("abc")` lanzaría una excepción.
  id: z
    .string()
    .refine(
      (id) => /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= PG_BIGINT_MAX,
      "El id debe ser un entero positivo dentro del rango de BIGINT"
    )
});

/** GET /tasks?estado=... — filtro opcional. */
export const listTasksQuerySchema = z.object({
  estado: estado.optional()
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type PutTaskInput = z.infer<typeof putTaskSchema>;
export type TaskIdParams = z.infer<typeof taskIdParamsSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
