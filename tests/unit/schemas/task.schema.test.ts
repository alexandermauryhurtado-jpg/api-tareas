import { describe, expect, it } from "vitest";
import {
  createTaskSchema,
  listTasksQuerySchema,
  putTaskSchema,
  taskIdParamsSchema
} from "../../../src/api/schemas/task.schema.js";

describe("createTaskSchema (POST)", () => {
  it("acepta una tarea válida y recorta el título", () => {
    const result = createTaskSchema.parse({ titulo: "  Estudiar  ", estado: "pendiente" });
    expect(result.titulo).toBe("Estudiar");
  });

  it("acepta fecha ISO con zona horaria", () => {
    expect(
      createTaskSchema.safeParse({ titulo: "x", fecha_vencimiento: "2026-12-31T23:59:00Z" }).success
    ).toBe(true);
  });

  it.each([
    ["título vacío", { titulo: "" }],
    ["título solo espacios", { titulo: "   " }],
    ["sin título", { estado: "pendiente" }],
    ["estado no permitido", { titulo: "x", estado: "cancelada" }],
    ["fecha sin formato ISO", { titulo: "x", fecha_vencimiento: "31/12/2026" }],
    ["campo desconocido (strict)", { titulo: "x", user_id: "99" }],
    ["título > 150", { titulo: "a".repeat(151) }]
  ])("rechaza: %s", (_case, body) => {
    expect(createTaskSchema.safeParse(body).success).toBe(false);
  });
});

describe("putTaskSchema (PUT)", () => {
  it("acepta cuando están todos los campos", () => {
    expect(
      putTaskSchema.safeParse({
        titulo: "Reto",
        descripcion: null,
        fecha_vencimiento: null,
        estado: "en curso"
      }).success
    ).toBe(true);
  });

  it("rechaza cuando faltan campos", () => {
    expect(putTaskSchema.safeParse({ titulo: "Reto" }).success).toBe(false);
  });
});

describe("taskIdParamsSchema", () => {
  it.each(["1", "42", "9223372036854775807"])("acepta id %s", (id) => {
    expect(taskIdParamsSchema.safeParse({ id }).success).toBe(true);
  });

  it.each(["0", "-1", "abc", "1.5", "007", "9223372036854775808", "99999999999999999999"])(
    "rechaza id %s",
    (id) => {
      expect(taskIdParamsSchema.safeParse({ id }).success).toBe(false);
    }
  );
});

describe("listTasksQuerySchema", () => {
  it("acepta sin filtro o con un estado válido", () => {
    expect(listTasksQuerySchema.safeParse({}).success).toBe(true);
    expect(listTasksQuerySchema.safeParse({ estado: "en curso" }).success).toBe(true);
  });

  it("rechaza un estado inválido", () => {
    expect(listTasksQuerySchema.safeParse({ estado: "x" }).success).toBe(false);
  });
});
