/** Código SQLSTATE de PostgreSQL para violación de restricción UNIQUE. */
export const PG_UNIQUE_VIOLATION = "23505";

/**
 * Indica si un error lanzado por `pg` es una violación de UNIQUE.
 *
 * @param error - Error capturado en un `catch`.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PG_UNIQUE_VIOLATION
  );
}
