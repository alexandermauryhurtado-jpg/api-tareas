import type { OpenAPIV3 } from "openapi-types";
import { TASK_STATUSES } from "../types/task.types.js";
import { env } from "./env.js";

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const errorResponse = (description: string): OpenAPIV3.ResponseObject => ({
  description,
  content: { "application/json": { schema: ref("ErrorResponse") } }
});

const estado: OpenAPIV3.SchemaObject = {
  type: "string",
  enum: [...TASK_STATUSES],
  example: "pendiente"
};

const taskFields: Record<string, OpenAPIV3.SchemaObject> = {
  titulo: { type: "string", minLength: 1, maxLength: 150, example: "Preparar prueba técnica" },
  descripcion: { type: "string", nullable: true, maxLength: 5000, example: "Terminar README" },
  fecha_vencimiento: {
    type: "string",
    format: "date-time",
    nullable: true,
    example: "2026-12-31T23:59:00Z"
  },
  estado
};

/**
 * Documento OpenAPI 3 de la API. Se sirve en `/api-docs` (UI) y
 * `/api-docs.json` (JSON crudo).
 */
export const swaggerDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "API de gestión de tareas",
    version: "1.0.0",
    description:
      "API REST para registrar usuarios, autenticarse con JWT y gestionar tareas personales. " +
      "Para probar las rutas de `/tasks`: haz login, copia el `token` y pulsa **Authorize**."
  },
  servers: [{ url: `http://localhost:${env.PORT}`, description: "Servidor local" }],
  tags: [
    { name: "Autenticación" },
    { name: "Tareas", description: "Requieren `Authorization: Bearer <token>`" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token obtenido en POST /auth/login"
      }
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "1" },
          nombre: { type: "string", example: "Ana Pérez" },
          email: { type: "string", format: "email", example: "ana@mail.com" }
        }
      },
      RegisterInput: {
        type: "object",
        required: ["nombre", "email", "password"],
        additionalProperties: false,
        properties: {
          nombre: { type: "string", minLength: 2, maxLength: 100, example: "Ana Pérez" },
          email: { type: "string", format: "email", maxLength: 254, example: "ana@mail.com" },
          password: {
            type: "string",
            minLength: 12,
            description: "Mínimo 12 caracteres, máximo 72 bytes (límite de bcrypt).",
            example: "UnaClaveSegura123"
          }
        }
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", example: "ana@mail.com" },
          password: { type: "string", example: "UnaClaveSegura123" }
        }
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", example: "3", description: "BIGINT serializado como texto" },
          ...taskFields,
          user_id: { type: "string", example: "1" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" }
        }
      },
      CreateTaskInput: {
        type: "object",
        required: ["titulo"],
        additionalProperties: false,
        properties: taskFields
      },
      PutTaskInput: {
        type: "object",
        required: ["titulo", "descripcion", "fecha_vencimiento", "estado"],
        additionalProperties: false,
        properties: taskFields
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Los datos enviados no son válidos" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string", example: "body.email" },
                    message: { type: "string", example: "El email no tiene un formato válido" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Autenticación"],
        summary: "Registrar un usuario",
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("RegisterInput") } }
        },
        responses: {
          "201": {
            description: "Usuario registrado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" }, user: ref("User") }
                }
              }
            }
          },
          "400": errorResponse("Datos inválidos"),
          "409": errorResponse("El correo ya está registrado")
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Autenticación"],
        summary: "Iniciar sesión y obtener un JWT",
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("LoginInput") } }
        },
        responses: {
          "200": {
            description: "Login correcto",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    user: ref("User")
                  }
                }
              }
            }
          },
          "400": errorResponse("Datos inválidos"),
          "401": errorResponse("Correo o contraseña incorrectos")
        }
      }
    },
    "/tasks": {
      get: {
        tags: ["Tareas"],
        summary: "Listar mis tareas",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "estado",
            in: "query",
            required: false,
            schema: estado,
            description: "Filtra por estado"
          }
        ],
        responses: {
          "200": {
            description: "Lista de tareas del usuario autenticado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { tasks: { type: "array", items: ref("Task") } }
                }
              }
            }
          },
          "400": errorResponse("Filtro inválido"),
          "401": errorResponse("Token ausente, inválido o expirado")
        }
      },
      post: {
        tags: ["Tareas"],
        summary: "Crear una tarea",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("CreateTaskInput") } }
        },
        responses: {
          "201": {
            description: "Tarea creada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" }, task: ref("Task") }
                }
              }
            }
          },
          "400": errorResponse("Datos inválidos"),
          "401": errorResponse("No autenticado")
        }
      }
    },
    "/tasks/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
          description: "Id de la tarea (entero positivo)"
        }
      ],
      get: {
        tags: ["Tareas"],
        summary: "Consultar una de mis tareas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Tarea encontrada",
            content: {
              "application/json": {
                schema: { type: "object", properties: { task: ref("Task") } }
              }
            }
          },
          "400": errorResponse("Id inválido"),
          "401": errorResponse("No autenticado"),
          "404": errorResponse("No existe o pertenece a otro usuario")
        }
      },
      put: {
        tags: ["Tareas"],
        summary: "Reemplazar una tarea (todos los campos obligatorios)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("PutTaskInput") } }
        },
        responses: {
          "200": { description: "Tarea actualizada" },
          "400": errorResponse("Datos inválidos o incompletos"),
          "401": errorResponse("No autenticado"),
          "404": errorResponse("No existe o pertenece a otro usuario")
        }
      },
      delete: {
        tags: ["Tareas"],
        summary: "Eliminar una tarea",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Tarea eliminada" },
          "400": errorResponse("Id inválido"),
          "401": errorResponse("No autenticado"),
          "404": errorResponse("No existe o pertenece a otro usuario")
        }
      }
    }
  }
};
