import type { Server } from "node:http";
import { createApp } from "./app.js";
import { checkDatabaseConnection, pool } from "./config/database.js";
import { env } from "./config/env.js";

/**
 * Punto de entrada: comprueba la base de datos, levanta el servidor HTTP
 * y registra un apagado ordenado (graceful shutdown).
 */
async function startServer(): Promise<void> {
  let server: Server;

  try {
    await checkDatabaseConnection();
    console.log("Conexión a PostgreSQL exitosa");

    server = createApp().listen(env.PORT, () => {
      console.log(`API disponible en http://localhost:${env.PORT}`);
      console.log(`Swagger en http://localhost:${env.PORT}/api-docs`);
    });
  } catch (error) {
    console.error("No se pudo iniciar la aplicación:", error);
    await pool.end();
    process.exitCode = 1;
    return;
  }

  // Al recibir Ctrl+C o la señal de parada del contenedor:
  // deja de aceptar conexiones, termina las peticiones en curso y cierra el pool.
  const shutdown = (signal: string) => {
    console.log(`${signal} recibido, cerrando servidor...`);
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

void startServer();
