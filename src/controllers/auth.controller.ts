import type { RequestHandler } from "express";
import type { LoginBody, RegisterBody } from "../api/schemas/auth.schema.js";
import { loginUser, registerUser } from "../services/auth.service.js";

/*
 * Nota: en Express 5, si un handler `async` lanza un error (o su promesa se
 * rechaza), Express lo envía automáticamente al middleware de errores.
 * Por eso los controladores no necesitan try/catch.
 */

/**
 * POST /auth/register — registra un usuario.
 * El body ya llega validado por `validate({ body: registerSchema })`.
 */
export const registerController: RequestHandler<
  Record<string, string>,
  unknown,
  RegisterBody
> = async (req, res) => {
  const user = await registerUser(req.body);
  res.status(201).json({ message: "Usuario registrado correctamente", user });
};

/**
 * POST /auth/login — verifica credenciales y devuelve un JWT.
 */
export const loginController: RequestHandler<
  Record<string, string>,
  unknown,
  LoginBody
> = async (req, res) => {
  const { token, user } = await loginUser(req.body);
  res.status(200).json({ message: "Inicio de sesión exitoso", token, user });
};
