import { Router } from "express";
import {
  loginController,
  registerController
} from "../../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

/**
 * Rutas públicas de autenticación. Montadas en `/auth`.
 * Las rutas solo conectan: validación → controlador.
 */
const authRouter = Router();

authRouter.post("/register", validate({ body: registerSchema }), registerController);
authRouter.post("/login", validate({ body: loginSchema }), loginController);

export default authRouter;
