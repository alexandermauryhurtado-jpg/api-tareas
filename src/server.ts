import authRoutes from "./api/routes/auth.routes.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import errorMiddleware from "./api/middlewares/error.middleware.js";
import taskRoutes from "./api/routes/tasks.routes.js";
import {
  checkDatabaseConnection,
  pool
} from "./config/database.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API de tareas funcionando correctamente"
  });
});

app.use(errorMiddleware);

async function startServer(): Promise<void> {
  try {
    await checkDatabaseConnection();
    console.log("Conexión a PostgreSQL exitosa");

    app.listen(env.PORT, () => {
      console.log(`API disponible en http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar la aplicación:", error);
    await pool.end();
    process.exitCode = 1;
  }
}

void startServer();
