import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ValidationError, type ErrorDetail } from "../../errors/app-error.js";

/** Esquemas a aplicar a cada parte de la petición. */
export interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Crea un middleware que valida `body`, `params` y/o `query` con Zod.
 *
 * - Si los datos son válidos, los **reemplaza por la versión parseada**
 *   (ya recortada con trim, en minúsculas, sin campos extra, etc.).
 * - Si no, llama a `next(new ValidationError(...))` con un detalle por campo.
 *
 * @example
 * router.post("/", validate({ body: createTaskSchema }), createTaskController);
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ErrorDetail[] = [];

    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);

      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            field: [key, ...issue.path].join("."),
            message: issue.message
          });
        }
        continue;
      }

      if (key === "body") {
        req.body = result.data;
      } else {
        // En Express 5 `req.query` es un getter de solo lectura,
        // por eso se redefine la propiedad en lugar de asignarla.
        Object.defineProperty(req, key, {
          value: result.data,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }

    if (details.length > 0) {
      next(new ValidationError(details));
      return;
    }

    next();
  };
}
