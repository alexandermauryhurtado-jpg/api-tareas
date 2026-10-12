import type { Task } from "../../src/types/task.types.js";
import type { User } from "../../src/types/user.types.js";

/** Construye una tarea de ejemplo; se pueden sobrescribir campos. */
export function buildTask(overrides: Partial<Task> = {}): Task {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "1",
    titulo: "Estudiar TypeScript",
    descripcion: null,
    fecha_vencimiento: null,
    estado: "pendiente",
    user_id: "10",
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

/** Construye un usuario de ejemplo (con hash ficticio). */
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "10",
    nombre: "Ana Pérez",
    email: "ana@mail.com",
    password_hash: "$2b$04$hashficticio",
    ...overrides
  };
}
