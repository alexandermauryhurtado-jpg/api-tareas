
import { Router } from "express";
import { z } from "zod";
import {
  loginUser,
  registerUser
} from "../../services/auth.service.js";

const router = Router();

const registerSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(72)
});

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);

    res.status(201).json({
      message: "Usuario registrado correctamente",
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});


const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token: result.token,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
});



export default router;
