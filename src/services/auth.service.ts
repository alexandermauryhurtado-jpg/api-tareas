
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserByEmail
} from "../persistence/user.repository.js";
import { env } from "../config/env.js";

export interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Registra un usuario después de validar que el correo no exista.
 */
export async function registerUser(
  input: RegisterInput
) {
  const email = input.email.trim().toLowerCase();

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    const error = new Error("El correo ya está registrado");
    Object.assign(error, { statusCode: 409 });
    throw error;
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  return createUser({
    nombre: input.nombre.trim(),
    email,
    passwordHash
  });
}

/**
 * Verifica las credenciales y genera un JWT.
 */
export async function loginUser(input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const user = await findUserByEmail(email);

  // Se utiliza el mismo mensaje para no revelar si el correo existe.
  if (!user) {
    const error = new Error("Correo o contraseña incorrectos");
    Object.assign(error, { statusCode: 401 });
    throw error;
  }

  const passwordIsValid = await bcrypt.compare(
    input.password,
    user.password_hash
  );

  if (!passwordIsValid) {
    const error = new Error("Correo o contraseña incorrectos");
    Object.assign(error, { statusCode: 401 });
    throw error;
  }

  const token = jwt.sign(
    { email: user.email },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
    }
  );

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email
    }
  };
}
