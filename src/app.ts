import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import {
  errorMiddleware,
  notFoundMiddleware
} from "./api/middlewares/error.middleware.js";
import authRouter from "./api/routes/auth.routes.js";
import tasksRouter from "./api/routes/tasks.routes.js";
import { env } from "./config/env.js";
import { swaggerDocument } from "./config/swagger.js";

/**
 * Crea y configura la aplicación Express **sin** ponerla a escuchar.
 *
 * Separar la creación (`app.ts`) del arranque (`server.ts`) permite probar
 * la API con Supertest sin abrir un puerto ni conectarse a la base de datos.
 *
 * Orden de middlewares (importa):
 * seguridad → parseo JSON → docs → rutas → 404 → manejador de errores.
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api-docs.json", (_req, res) => {
    res.json(swaggerDocument);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use("/auth", authRouter);
  app.use("/tasks", tasksRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
