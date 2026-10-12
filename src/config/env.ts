import "dotenv/config";
import { z } from "zod";

/**
 * Esquema de las variables de entorno.
 * Si falta una variable obligatoria o tiene un formato inválido,
 * la aplicación NO arranca (fail fast).
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().min(1).default("1h"),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  CORS_ORIGIN: z.string().min(1).default("*")
});

/** Tipo de la configuración ya validada. */
export type EnvConfig = Readonly<z.infer<typeof envSchema>>;

/**
 * Valida un objeto de variables de entorno y devuelve la configuración tipada.
 *
 * @param source - Normalmente `process.env`.
 * @throws {Error} Con un mensaje legible que indica qué variables fallaron.
 */
export function parseEnv(source: NodeJS.ProcessEnv): EnvConfig {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Configuración de entorno inválida:\n${z.prettifyError(result.error)}`
    );
  }

  return Object.freeze(result.data);
}

/**
 * Configuración centralizada de la aplicación (patrón Singleton).
 *
 * - El constructor es privado: nadie puede hacer `new Config()`.
 * - `getInstance()` crea la instancia la primera vez y la reutiliza después,
 *   por lo que `process.env` se lee y valida **una sola vez**.
 * - Los valores están congelados (`Object.freeze`), nadie puede modificarlos
 *   en tiempo de ejecución.
 *
 * @example
 * import { Config } from "./config/env.js";
 * const port = Config.getInstance().values.PORT;
 */
export class Config {
  private static instance: Config | null = null;

  /** Variables de entorno validadas y de solo lectura. */
  public readonly values: EnvConfig;

  private constructor(source: NodeJS.ProcessEnv) {
    this.values = parseEnv(source);
  }

  /** Devuelve la única instancia de la configuración. */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config(process.env);
    }

    return Config.instance;
  }

  /**
   * Elimina la instancia cacheada. **Solo para pruebas**, permite
   * volver a leer `process.env` con otros valores.
   */
  public static resetForTests(): void {
    Config.instance = null;
  }
}

/** Atajo para importar la configuración: `import { env } from "./env.js"`. */
export const env: EnvConfig = Config.getInstance().values;
