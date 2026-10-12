import { z } from "zod";

/**
 * bcrypt solo usa los primeros 72 **bytes** de la contraseña.
 * Se valida en bytes (no en caracteres) porque una "ñ" o un emoji ocupan
 * más de un byte en UTF-8.
 */
const BCRYPT_MAX_BYTES = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("El email no tiene un formato válido").max(254));

/** POST /auth/register */
export const registerSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100),
    email,
    password: z
      .string()
      .min(12, "La contraseña debe tener al menos 12 caracteres")
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= BCRYPT_MAX_BYTES,
        `La contraseña no puede superar ${BCRYPT_MAX_BYTES} bytes`
      )
  })
  .strict();

/** POST /auth/login */
export const loginSchema = z
  .object({
    email,
    password: z
      .string()
      .min(1, "La contraseña es obligatoria")
      .refine((value) => Buffer.byteLength(value, "utf8") <= BCRYPT_MAX_BYTES, "Contraseña demasiado larga")
  })
  .strict();

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
