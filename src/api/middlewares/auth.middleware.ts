
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

const authMiddleware: RequestHandler = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Token de autenticación requerido"
    });
    return;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    res.status(401).json({
      message: "Token de autenticación requerido"
    });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string"
    ) {
      res.status(401).json({
        message: "Token de autenticación inválido"
      });
      return;
    }

    req.user = {
      id: payload.sub,
      email: payload.email
    };

    next();
  } catch {
    res.status(401).json({
      message: "Token inválido o expirado"
    });
  }
};

export default authMiddleware;
