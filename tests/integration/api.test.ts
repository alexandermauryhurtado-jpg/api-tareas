/**
 * Pruebas de integración HTTP: recorren el camino completo
 * ruta → middlewares → controlador → servicio → repositorio,
 * sustituyendo SOLO la base de datos por repositorios en memoria.
 */
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import type { Task, UpdateTaskData } from "../../src/types/task.types.js";
import type { User } from "../../src/types/user.types.js";

// ---------- "Base de datos" en memoria ----------
const db = vi.hoisted(() => ({
  users: [] as User[],
  tasks: [] as Task[],
  seq: { user: 0, task: 0 },
  reset() {
    this.users = [];
    this.tasks = [];
    this.seq = { user: 0, task: 0 };
  }
}));

vi.mock("../../src/persistence/user.repository.js", () => ({
  findUserByEmail: vi.fn(async (email: string) => db.users.find((u) => u.email === email) ?? null),
  createUser: vi.fn(async (data: { nombre: string; email: string; passwordHash: string }) => {
    const user = {
      id: String(++db.seq.user),
      nombre: data.nombre,
      email: data.email,
      password_hash: data.passwordHash
    };
    db.users.push(user);
    return user;
  })
}));

vi.mock("../../src/persistence/task.repository.js", () => {
  const own = (id: string, userId: string) =>
    db.tasks.find((t) => t.id === id && t.user_id === userId) ?? null;

  return {
    createTask: vi.fn(async (userId: string, data: Partial<Task>) => {
      const now = new Date();
      const task: Task = {
        id: String(++db.seq.task),
        titulo: data.titulo!,
        descripcion: data.descripcion ?? null,
        fecha_vencimiento: data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null,
        estado: data.estado ?? "pendiente",
        user_id: userId,
        created_at: now,
        updated_at: now
      };
      db.tasks.push(task);
      return task;
    }),
    findTasksByUser: vi.fn(async (userId: string, filters: { estado?: string } = {}) =>
      db.tasks.filter((t) => t.user_id === userId && (!filters.estado || t.estado === filters.estado))
    ),
    findTaskById: vi.fn(async (id: string, userId: string) => own(id, userId)),
    updateTask: vi.fn(async (id: string, userId: string, data: UpdateTaskData) => {
      const task = own(id, userId);
      if (!task) return null;
      Object.assign(task, data, { updated_at: new Date() });
      return task;
    }),
    deleteTask: vi.fn(async (id: string, userId: string) => {
      const task = own(id, userId);
      if (!task) return false;
      db.tasks = db.tasks.filter((t) => t !== task);
      return true;
    })
  };
});

// ---------- Helpers ----------
const app = createApp();
const PASSWORD = "UnaClaveSegura123";

async function registerAndLogin(email: string): Promise<string> {
  await request(app).post("/auth/register").send({ nombre: "Usuario", email, password: PASSWORD });
  const res = await request(app).post("/auth/login").send({ email, password: PASSWORD });
  return res.body.token as string;
}

beforeEach(() => db.reset());

// ---------- Sistema ----------
describe("Sistema", () => {
  it("GET /api-docs.json sirve el documento OpenAPI", async () => {
    const res = await request(app).get("/api-docs.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(["/auth/register", "/auth/login", "/tasks", "/tasks/{id}"])
    );
  });

  it("GET /api-docs sirve la interfaz de Swagger", async () => {
    const res = await request(app).get("/api-docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });

  it("ruta inexistente → 404 con formato de error", async () => {
    const res = await request(app).get("/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("JSON mal formado → 400 BAD_REQUEST", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send("{ email: ");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("no expone la cabecera X-Powered-By", async () => {
    const res = await request(app).get("/api-docs.json");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

// ---------- Autenticación ----------
describe("POST /auth/register", () => {
  it("201 y no devuelve el hash de la contraseña", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ nombre: "Ana", email: "Ana@Mail.com", password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: "1", nombre: "Ana", email: "ana@mail.com" });
    expect(JSON.stringify(res.body)).not.toContain("password");
    expect(db.users[0]?.password_hash).not.toBe(PASSWORD);
  });

  it("409 si el email ya existe (sin importar mayúsculas)", async () => {
    await request(app).post("/auth/register").send({ nombre: "Ana", email: "ana@mail.com", password: PASSWORD });
    const res = await request(app)
      .post("/auth/register")
      .send({ nombre: "Ana 2", email: "ANA@mail.com", password: PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("400 con detalle por campo si los datos son inválidos", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ nombre: "A", email: "no-email", password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(["body.nombre", "body.email", "body.password"])
    );
  });

  it("400 si no se envía body", async () => {
    const res = await request(app).post("/auth/register");
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/auth/register").send({ nombre: "Ana", email: "ana@mail.com", password: PASSWORD });
  });

  it("200 con token JWT", async () => {
    const res = await request(app).post("/auth/login").send({ email: "ana@mail.com", password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token.split(".")).toHaveLength(3);
    expect(res.body.user.email).toBe("ana@mail.com");
  });

  it("401 con el MISMO mensaje para contraseña incorrecta y email inexistente", async () => {
    const wrongPass = await request(app).post("/auth/login").send({ email: "ana@mail.com", password: "incorrecta" });
    const noUser = await request(app).post("/auth/login").send({ email: "nadie@mail.com", password: PASSWORD });

    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body).toEqual(noUser.body);
  });
});

// ---------- Tareas ----------
describe("/tasks (protegidas)", () => {
  it("401 sin token", async () => {
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
  });

  it("401 con token inválido", async () => {
    const res = await request(app).get("/tasks").set("Authorization", "Bearer abc.def.ghi");
    expect(res.status).toBe(401);
  });

  it("CRUD completo del propio usuario", async () => {
    const token = await registerAndLogin("ana@mail.com");
    const auth = { Authorization: `Bearer ${token}` };

    // Crear
    const created = await request(app)
      .post("/tasks")
      .set(auth)
      .send({ titulo: "  Estudiar  ", fecha_vencimiento: "2026-12-31T23:59:00Z" });
    expect(created.status).toBe(201);
    expect(created.body.task).toMatchObject({ id: "1", titulo: "Estudiar", estado: "pendiente", user_id: "1" });

    // Listar
    const list = await request(app).get("/tasks").set(auth);
    expect(list.status).toBe(200);
    expect(list.body.tasks).toHaveLength(1);

    // Consultar
    const one = await request(app).get("/tasks/1").set(auth);
    expect(one.status).toBe(200);
    expect(one.body.task.titulo).toBe("Estudiar");

    // PUT
    const put = await request(app)
      .put("/tasks/1")
      .set(auth)
      .send({ titulo: "Nuevo", descripcion: null, fecha_vencimiento: null, estado: "completada" });
    expect(put.status).toBe(200);
    expect(put.body.task).toMatchObject({ titulo: "Nuevo", estado: "completada" });

    // Filtro por estado
    const filtered = await request(app).get("/tasks?estado=pendiente").set(auth);
    expect(filtered.body.tasks).toHaveLength(0);

    // Eliminar
    const deleted = await request(app).delete("/tasks/1").set(auth);
    expect(deleted.status).toBe(200);
    const afterDelete = await request(app).get("/tasks/1").set(auth);
    expect(afterDelete.status).toBe(404);
  });

  it("AISLAMIENTO: un usuario no puede ver, editar ni borrar tareas de otro (404)", async () => {
    const ana = { Authorization: `Bearer ${await registerAndLogin("ana@mail.com")}` };
    const luis = { Authorization: `Bearer ${await registerAndLogin("luis@mail.com")}` };

    await request(app).post("/tasks").set(ana).send({ titulo: "Privada de Ana" });

    expect((await request(app).get("/tasks").set(luis)).body.tasks).toEqual([]);
    expect((await request(app).get("/tasks/1").set(luis)).status).toBe(404);
    expect(
      (await request(app).put("/tasks/1").set(luis).send({ titulo: "Hackeada", descripcion: null, fecha_vencimiento: null, estado: "completada" })).status
    ).toBe(404);
    expect((await request(app).delete("/tasks/1").set(luis)).status).toBe(404);

    // La tarea de Ana sigue intacta
    const anaTask = await request(app).get("/tasks/1").set(ana);
    expect(anaTask.body.task).toMatchObject({ titulo: "Privada de Ana", estado: "pendiente" });
  });

  it("no permite asignarse user_id desde el body (strict)", async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin("ana@mail.com")}` };
    const res = await request(app).post("/tasks").set(auth).send({ titulo: "x", user_id: "999" });

    expect(res.status).toBe(400);
  });

  it.each([
    ["id no numérico", "get", "/tasks/abc"],
    ["id cero", "delete", "/tasks/0"],
    ["id fuera de rango BIGINT", "get", "/tasks/99999999999999999999"]
  ] as const)("400 con %s", async (_case, method, url) => {
    const auth = { Authorization: `Bearer ${await registerAndLogin("ana@mail.com")}` };
    const res = await request(app)[method](url).set(auth);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("params.id");
  });

  it("400 en PUT incompleto, PUT con campos extra y filtro inválido", async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin("ana@mail.com")}` };
    await request(app).post("/tasks").set(auth).send({ titulo: "x" });

    expect((await request(app).put("/tasks/1").set(auth).send({ titulo: "y" })).status).toBe(400);
    expect(
      (await request(app).put("/tasks/1").set(auth).send({ titulo: "y", descripcion: null, fecha_vencimiento: null, estado: "pendiente", user_id: "9" })).status
    ).toBe(400);
    expect((await request(app).get("/tasks?estado=cancelada").set(auth)).status).toBe(400);
  });
});
