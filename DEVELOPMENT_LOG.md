# DEVELOPMENT_LOG — Bitácora de desarrollo

Bitácora del desarrollo de la API de Gestión de Tareas: qué se hizo en cada paso, qué herramientas de IA se usaron, qué se aceptó, qué se corrigió y cómo se verificó.

---

## 1. Resumen

| Fase | Qué se hizo | Herramienta |
|---|---|---|
| 1. Construcción inicial | Estructura, base de datos, autenticación, CRUD, validación y Swagger | **ChatGPT** como apoyo de consulta |
| 2. Revisión y mejoras | Errores personalizados, seguridad, capas, pruebas unitarias | **Claude** como apoyo de revisión |
| 3. Validación | Revisión de arquitectura, patrones, clean code y seguridad | **Ingeniero con más experiencia** + IA |
| 4. Verificación | Tipado estricto, 133 pruebas automáticas y pruebas manuales contra PostgreSQL | Manual |

**Regla aplicada en todo el proyecto:** ningún código sugerido por una IA se incorporó sin (1) entenderlo línea por línea, (2) compilarlo con TypeScript en modo estricto y (3) probarlo, primero manualmente y después con pruebas automáticas. Los cambios de la fase 2 se aplicaron **después** de validar, probar y verificar lo que proponían ambas IA.

> Los prompts se transcriben de forma resumida.

---

## 2. Fase 1 — Construcción inicial con ChatGPT

### Paso 1. Estructura del proyecto y configuración

**Prompt:**
> "Necesito crear una API REST con Node.js, Express y TypeScript. Debe tener las carpetas src/api, src/controllers, src/services y src/persistence. ¿Cómo configuro el tsconfig y el package.json para usar módulos ES?"

**Qué se aceptó:**
- Estructura de carpetas por capas tal como pide el enunciado.
- `tsconfig.json` con `strict: true`, `module` y `moduleResolution` en `NodeNext`.
- `"type": "module"` en `package.json` y `tsx watch` para `npm run dev`.

**Qué se cambió:** la primera propuesta usaba `CommonJS`. Se cambió a módulos ES porque es el estándar actual de Node.js.

**Verificación:** `npm run typecheck` sin errores y `npm run dev` arrancando.

**Commit:** `chore: initial project setup with typescript and express`

---

### Paso 2. Variables de entorno

**Prompt:**
> "¿Cómo cargo variables de entorno desde un archivo .env en TypeScript y valido que existan antes de arrancar la aplicación?"

**Qué se aceptó:** `dotenv` + validación con **Zod**, convirtiendo `PORT` y `DB_PORT` a número y exigiendo `JWT_SECRET` de al menos 32 caracteres.

**Qué se cambió:** ChatGPT proponía leer `process.env.X` directamente en cada archivo. Se centralizó todo en `src/config/env.ts` para leer y validar las variables una sola vez.

**Verificación:** se borró una variable del `.env` y se comprobó que la aplicación no arrancaba.

**Commit:** `feat(config): add env validation with zod`

---

### Paso 3. Base de datos

**Prompt:**
> "Dame el SQL para PostgreSQL de una tabla users (nombre, email, password) y una tabla tasks (titulo, descripcion, fecha_vencimiento, estado) donde cada tarea pertenezca a un usuario."

**Qué se aceptó:**
- `BIGINT GENERATED ALWAYS AS IDENTITY` como clave primaria.
- `email` con restricción `UNIQUE`.
- `CHECK (estado IN ('pendiente', 'en curso', 'completada'))`.
- `user_id` como clave foránea con `ON DELETE CASCADE`.

**Qué se cambió:** la propuesta guardaba la contraseña en una columna `password`. Se renombró a `password_hash` para dejar claro que nunca se guarda en texto plano.

**Verificación:** `psql -f database/schema.sql` y prueba manual de que el `CHECK` rechaza un estado inválido.

**Commit:** `feat(db): add users and tasks schema`

---

### Paso 4. Conexión a PostgreSQL

**Prompt:**
> "¿Cómo me conecto a PostgreSQL desde Node.js con TypeScript usando la librería pg?"

**Qué se aceptó:** un `Pool` de conexiones compartido en `src/config/database.ts` y una consulta `SELECT 1` al arrancar para comprobar la conexión.

**Verificación:** arranque con la base de datos encendida (mensaje "Conexión a PostgreSQL exitosa") y apagada (error claro).

**Commit:** `feat(db): add postgres connection pool`

---

### Paso 5. Registro de usuarios

**Prompt:**
> "¿Cómo hago un endpoint POST /auth/register en Express que guarde la contraseña con bcrypt?"

**Qué se aceptó:**
- `bcrypt.hash(password, 12)`.
- Comprobar si el email ya existe y responder **409**.
- Normalizar el email (`trim` + minúsculas).

**Qué se cambió:** la respuesta de ChatGPT devolvía el usuario completo, incluido el hash. Se limitó la respuesta a `id`, `nombre` y `email`.

**Verificación:** registro desde Postman y consulta en la tabla `users`: la contraseña empieza por `$2b$12$`.

**Commit:** `feat(auth): add user registration endpoint`

---

### Paso 6. Login con JWT

**Prompt:**
> "¿Cómo genero un JSON Web Token al hacer login en Express y qué datos debo poner dentro?"

**Qué se aceptó:**
- `jsonwebtoken` con `subject` = id del usuario y `expiresIn` configurable.
- Mismo mensaje de error para email inexistente y contraseña incorrecta, para no revelar qué emails están registrados.

**Qué se cambió:** la primera propuesta incluía el nombre y el rol en el token. Se dejó solo `sub` y `email`, porque el contenido de un JWT se puede leer.

**Verificación:** login correcto devuelve token; se decodificó en jwt.io para revisar su contenido.

**Commit:** `feat(auth): add login endpoint with jwt`

---

### Paso 7. Middleware de autenticación

**Prompt:**
> "¿Cómo hago un middleware en Express que lea el token de la cabecera Authorization: Bearer y proteja las rutas?"

**Qué se aceptó:** lectura del prefijo `Bearer `, `jwt.verify` y guardar el usuario en `req.user`. Extensión de tipos en `src/types/express.d.ts` para que TypeScript reconozca `req.user`.

**Verificación:** peticiones sin token, con token inválido y con token válido.

**Commit:** `feat(auth): add bearer token middleware`

---

### Paso 8. CRUD de tareas

**Prompt:**
> "Crea los endpoints CRUD de tareas en Express con PostgreSQL de forma que cada usuario solo pueda ver y modificar sus propias tareas."

**Qué se aceptó:** filtrar por `user_id` dentro de cada consulta SQL:

```sql
SELECT * FROM tasks WHERE id = $1 AND user_id = $2
```

**Qué se cambió:** la primera versión buscaba la tarea por `id` y luego comparaba el dueño en JavaScript. Se movió la condición al `WHERE`: es más simple, no se puede olvidar en una consulta y no revela si la tarea existe.

**Verificación:** con dos usuarios en Postman, el segundo no puede leer, editar ni borrar las tareas del primero.

**Commits:** `feat(tasks): add create and list endpoints`, `feat(tasks): add get, update and delete by id`

---

### Paso 9. Validación de datos

**Prompt:**
> "¿Cómo valido el body de una petición en Express con Zod? Necesito que el email tenga formato válido y que el estado de la tarea solo acepte pendiente, en curso o completada."

**Qué se aceptó:** esquemas Zod para registro, login, creación y actualización de tareas, con `.strict()` para rechazar campos no previstos.

**Qué se cambió:** se eligió **Zod en lugar de AJV** porque el mismo esquema sirve para validar en ejecución y para generar el tipo TypeScript (`z.infer`).

**Verificación:** peticiones con email inválido, estado no permitido y campos extra → 400.

**Commit:** `feat(validation): add zod schemas for auth and tasks`

---

### Paso 10. Manejo de errores y Swagger

**Prompts:**
> "¿Cómo centralizo el manejo de errores en Express para devolver siempre un JSON?"
>
> "¿Cómo documento mi API de Express con Swagger usando swagger-ui-express y TypeScript?"

**Qué se aceptó:** un middleware de errores al final de la app y la documentación en `/api-docs` con `bearerAuth`.

**Qué quedó pendiente** (se resolvió en la fase 2): ChatGPT propuso añadir un `statusCode` con `Object.assign` a errores genéricos en lugar de crear clases de error.

**Verificación:** Swagger abre en el navegador y permite probar los endpoints con el token.

**Commits:** `feat(errors): add centralized error middleware`, `docs(api): add swagger documentation`

---

## 3. Fase 2 — Revisión y mejoras con Claude

Con la API funcionando, se pidió a Claude una revisión completa contra el enunciado. Cada sugerencia se comparó con lo que había propuesto ChatGPT, se discutió en la validación de la sección 4 y solo se aplicó después de comprobarla con pruebas.

**Prompt de revisión:**
> "Te adjunto el enunciado de la prueba técnica y el código de mi proyecto. Revísalo según lo que piden, mejora el código fuente y agrega pruebas unitarias con al menos 90 % de cobertura."

### Resumen de ajustes

| # | Qué se ajustó | Por qué |
|---|---|---|
| 1 | Clases de error personalizadas | Lo pide el punto 4 del enunciado |
| 2 | Error 500 en lugar de 401 | Un fallo de autenticación terminaba como error interno |
| 3 | Registro simultáneo con el mismo email | El segundo recibía 500 en lugar de 409 |
| 4 | Tiempo de respuesta del login | Permitía descubrir qué emails existen |
| 5 | Algoritmo JWT fijado | Evitar tokens con otro algoritmo o sin firma |
| 6 | Límite de bcrypt en bytes | Contraseñas con "ñ" o emojis se cortaban sin aviso |
| 7 | Validación del id | Ids fuera de rango provocaban 500 |
| 8 | Separación de capas en autenticación | Ruta, validación y lógica estaban mezcladas |
| 9 | Middleware `validate()` | La validación estaba copiada en varias rutas |
| 10 | `try/catch` innecesarios | Express 5 ya reenvía los errores `async` |
| 11 | Formato único de errores | El middleware de autenticación usaba otro formato |
| 12 | Configuración como Singleton | Lo sugiere el punto 1 del enunciado |
| 13 | `createApp()` separado de `server.ts` | Para poder probar la API sin arrancar el servidor |
| 14 | Rutas inexistentes y JSON mal formado | Respuestas claras y sin detalles internos |
| 15 | Índices de la base de datos | Había un índice sin uso y otro redundante |
| 16 | Pruebas automáticas | Deseable del enunciado; se pidió 90 % de cobertura |

### Ajuste 1. Clases de error personalizadas

**Prompt:** "¿Cómo creo clases de error personalizadas en TypeScript como NotFoundError o AuthenticationError para usarlas con un middleware de errores en Express?"

**Antes:**
```ts
const error = new Error("Tarea no encontrada");
Object.assign(error, { statusCode: 404 });
throw error;
```

**Después:**
```ts
export class AppError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") { super(message, 404, "NOT_FOUND"); }
}

throw new NotFoundError("Tarea no encontrada");
```

**Por qué:** lo pide el enunciado. El `statusCode` queda tipado, no se repite código y el middleware reconoce los errores con `instanceof AppError`. Todas las respuestas de error tienen el formato `{ "error": { "code", "message" } }`.

**Verificación:** `tests/unit/errors/app-error.test.ts` y `tests/unit/middlewares/error.middleware.test.ts`.

### Ajuste 2. Error 500 cuando faltaba el usuario autenticado

**Prompt:** "Si req.user no existe y lanzo new Error('Usuario no autenticado'), ¿qué código HTTP recibe el cliente?"

**Antes:** `throw new Error("Usuario no autenticado")` → el middleware respondía **500**.

**Después:** `throw new AuthenticationError("Usuario no autenticado")` → **401**.

**Verificación:** `tests/unit/controllers/task.controller.test.ts`.

### Ajuste 3. Registro simultáneo con el mismo email

**Prompt:** "Si dos personas se registran con el mismo email al mismo tiempo, ¿qué pasa con mi código que primero hace SELECT y luego INSERT?"

**Problema:** las dos peticiones pasan el `SELECT`; el segundo `INSERT` choca con la restricción `UNIQUE` (código PostgreSQL `23505`) y el cliente recibía **500**.

**Después:**
```ts
try {
  return toPublicUser(await createUser({ nombre, email, passwordHash }));
} catch (error) {
  if (isUniqueViolation(error)) throw new ConflictError("El correo ya está registrado");
  throw error;
}
```

**Verificación:** prueba unitaria con un error simulado `23505` y prueba manual con 5 peticiones simultáneas → `201 409 409 409 409`.

### Ajuste 4. Tiempo de respuesta del login

**Prompt:** "Mi login devuelve el mismo mensaje si el email no existe o si la contraseña es incorrecta. ¿Se puede saber igualmente si un email está registrado?"

**Problema:** si el email no existía, la respuesta era inmediata; si existía, tardaba lo que tarda bcrypt (cientos de milisegundos). Midiendo el tiempo se podía saber qué emails están registrados.

**Después:** si el usuario no existe, se compara contra un hash de relleno con el mismo coste, así ambos casos tardan lo mismo.

```ts
const hashToCompare = user?.password_hash ?? (await getDummyHash());
const passwordIsValid = await bcrypt.compare(input.password, hashToCompare);
```

**Verificación:** `tests/unit/services/auth.service.test.ts` comprueba que bcrypt se ejecuta también cuando el email no existe.

### Ajuste 5. Algoritmo del JWT fijado

**Prompt:** "¿Es seguro usar jwt.verify sin indicar el algoritmo?"

**Antes:** `jwt.verify(token, secret)`.

**Después:** firma y verificación en un solo archivo, `src/services/token.service.ts`, con el algoritmo fijado:
```ts
jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
```

**Por qué:** es la recomendación de OWASP para evitar aceptar tokens firmados con otro algoritmo o sin firma (`alg: none`). Además se comprueba que el token tenga `sub` y `email`, y se distingue "token expirado" de "token inválido".

**Qué se descartó:** durante la revisión quedaron dos archivos con la misma lógica JWT; se dejó solo `token.service.ts`.

**Verificación:** `tests/unit/services/token.service.test.ts` (rechaza tokens expirados, con otro secreto, con HS512 y con `alg: none`).

### Ajuste 6. Límite de bcrypt en bytes

**Prompt:** "bcrypt tiene un límite de 72. ¿Son 72 caracteres o 72 bytes?"

**Antes:** `z.string().min(12).max(72)` → 72 **caracteres**.

**Después:**
```ts
.refine((v) => Buffer.byteLength(v, "utf8") <= 72, "La contraseña no puede superar 72 bytes")
```

**Por qué:** bcrypt solo usa los primeros 72 **bytes**. Una "ñ" ocupa 2 bytes, así que una contraseña larga con tildes o emojis se cortaba sin avisar.

**Verificación:** `tests/unit/schemas/auth.schema.test.ts` (40 "ñ" = 80 bytes → rechazada).

### Ajuste 7. Validación del id

**Prompt:** "Valido el id de la ruta con /^\d+$/. ¿Qué pasa si envío 0 o un número más grande que un BIGINT?"

**Problema:** `99999999999999999999` llegaba a PostgreSQL, que lanzaba un error de rango, y la API respondía **500**.

**Primera propuesta (descartada):**
```ts
z.string().regex(/^[1-9]\d{0,18}$/).refine((id) => BigInt(id) <= MAX)
```
Las pruebas fallaron con `Cannot convert abc to a BigInt`: en Zod 4 el `refine` se ejecuta aunque la `regex` haya fallado.

**Versión final:**
```ts
z.string().refine(
  (id) => /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= PG_BIGINT_MAX,
  "El id debe ser un entero positivo dentro del rango de BIGINT"
)
```

**Lección:** el código sugerido parecía correcto y compilaba; solo una prueba con un dato inválido mostró el error.

**Verificación:** `tests/unit/schemas/task.schema.test.ts`.

### Ajuste 8. Separación de capas en la autenticación

**Prompt:** "Mi archivo auth.routes.ts tiene los esquemas, la lógica y las respuestas juntos. ¿Cómo lo separo respetando las capas que pide el enunciado?"

**Después:**
- Ruta: `src/api/routes/auth.routes.ts` (solo conecta validación y controlador).
- Esquemas: `src/api/schemas/auth.schema.ts`.
- Controlador: `src/controllers/auth.controller.ts`.
- Lógica: `src/services/auth.service.ts`.

```ts
authRouter.post("/register", validate({ body: registerSchema }), registerController);
authRouter.post("/login", validate({ body: loginSchema }), loginController);
```

### Ajuste 9. Middleware `validate()`

**Prompt:** "Repito el mismo código de validación con Zod en varias rutas. ¿Cómo hago un middleware reutilizable?"

**Después:**
```ts
tasksRouter.post("/", validate({ body: createTaskSchema }), createTaskController);
tasksRouter.put("/:id", validate({ params: taskIdParamsSchema, body: putTaskSchema }), updateTaskController);
```

**Reto:** en Express 5 `req.query` es de solo lectura; se resolvió con `Object.defineProperty`.

**Verificación:** `tests/unit/middlewares/validate.middleware.test.ts`.

### Ajuste 10. `try/catch` innecesarios

**Prompt:** "En Express 5, ¿necesito try/catch en cada controlador async?"

**Respuesta verificada:** no. Express 5 envía automáticamente al middleware de errores cualquier error de una función `async`. Se eliminaron los `try/catch` de los controladores.

**Verificación:** las pruebas de integración confirman que los errores 401, 404 y 409 siguen llegando al middleware de errores.

### Ajuste 11. Formato único de errores

**Antes:** el middleware de autenticación respondía con `res.status(401).json({ message })`, un formato distinto al resto.

**Después:** `next(new AuthenticationError("Token de autenticación requerido"))`; la respuesta la construye el middleware central.

### Ajuste 12. Configuración como Singleton

**Prompt:** "¿Cómo implemento el patrón Singleton en TypeScript para la configuración de variables de entorno?"

**Después:**
```ts
export class Config {
  private static instance: Config | null = null;
  public readonly values: EnvConfig;
  private constructor(source: NodeJS.ProcessEnv) { this.values = parseEnv(source); }
  public static getInstance(): Config {
    if (!Config.instance) Config.instance = new Config(process.env);
    return Config.instance;
  }
}
export const env = Config.getInstance().values;
```

**Por qué:** el enunciado lo sugiere. El constructor privado impide crear otra instancia, las variables se validan una sola vez y quedan congeladas con `Object.freeze`.

**Verificación:** `tests/unit/config/env.test.ts`.

### Ajuste 13. `createApp()` separado de `server.ts`

**Por qué:** para probar la API completa con Supertest sin abrir un puerto ni conectarse a la base de datos. `server.ts` solo comprueba la base de datos, arranca el servidor y cierra las conexiones al recibir `Ctrl+C`.

### Ajuste 14. Rutas inexistentes, JSON mal formado y tamaño del body

- Ruta inexistente → `404 NOT_FOUND`.
- JSON mal formado → `400 BAD_REQUEST` (antes devolvía el mensaje interno del parser).
- Body mayor de 100 KB → `413 PAYLOAD_TOO_LARGE`.
- Se desactivó la cabecera `X-Powered-By`.

### Ajuste 15. Índices de la base de datos

**Prompt:** "¿Mis índices en tasks son necesarios o hay alguno redundante?"

**Cambio:** se eliminó el índice `(user_id)` porque el índice compuesto `(user_id, estado)` ya lo cubre. Para aprovechar ese índice se añadió el filtro opcional `GET /tasks?estado=pendiente`.

### Ajuste 16. Pruebas automáticas

**Prompt:** "Agrega pruebas unitarias con Vitest para llegar al menos al 90 % de cobertura, incluyendo una prueba de que un usuario no puede acceder a las tareas de otro."

**Qué se hizo:**
- **Pruebas unitarias** de cada capa con dependencias simuladas (mocks).
- **Pruebas de integración** HTTP con Supertest contra `createApp()`.
- Umbral mínimo del 90 % configurado en `vitest.config.ts`.

**Resultado:** 133 pruebas correctas; cobertura 99.6 % de sentencias, 98.9 % de ramas y 100 % de funciones.

---

## 4. Validación del código con un ingeniero con más experiencia

El código se revisó con un ingeniero con más experiencia para validar **qué arquitectura y qué patrones usar**. Con apoyo de la IA se revisaron además los principios de **clean code** y los **estándares de seguridad** aplicados.

### 4.1 Arquitectura y patrones validados

| Patrón / decisión | Dónde está | Por qué se eligió |
|---|---|---|
| Arquitectura en capas | `src/api`, `controllers`, `services`, `persistence` | Lo pide el enunciado; cada capa tiene una sola responsabilidad |
| Singleton | `src/config/env.ts` | Configuración leída y validada una sola vez |
| Repository | `src/persistence/*.repository.ts` | El SQL queda aislado; los servicios no dependen de PostgreSQL |
| Service Layer | `src/services/*.service.ts` | Lógica de negocio independiente de HTTP |
| Middleware (cadena de responsabilidad) | `src/api/middlewares/` | Autenticación, validación y errores en un solo lugar |
| Factory | `createApp()`, `validate(schemas)` | Crear la app sin arrancarla; middlewares configurables |
| Jerarquía de errores | `src/errors/app-error.ts` | Un tipo de error por situación, con su código HTTP |
| DTO / tipo público | `PublicUser = Omit<User, "password_hash">` | El compilador impide devolver el hash |

**Alternativas descartadas:**
- **ORM** (Prisma, TypeORM): más dependencias y menos control sobre la condición `user_id` de cada consulta.
- **MongoDB:** los datos son relacionales (un usuario tiene muchas tareas) y PostgreSQL es el preferido del enunciado.
- **403 para tareas ajenas:** confirmaría que la tarea existe; se responde 404.

### 4.2 Principios de clean code aplicados

| Principio | Ejemplo en el código |
|---|---|
| Responsabilidad única (SRP) | La ruta solo conecta, el controlador solo traduce HTTP, el servicio solo decide |
| No repetirse (DRY) | Un solo middleware `validate()`; estados de tarea definidos una vez en `TASK_STATUSES` |
| Nombres descriptivos | `getTaskForUser`, `verifyAccessToken`, `isUniqueViolation` |
| Sin valores mágicos | Constantes `BEARER_PREFIX`, `PG_BIGINT_MAX`, `INVALID_CREDENTIALS` |
| Fallar pronto (*fail fast*) | La app no arranca si falta una variable de entorno |
| Funciones pequeñas | Ningún controlador supera unas pocas líneas |
| Tipado estricto | `strict` y `noUncheckedIndexedAccess` activos |
| Documentación | JSDoc en funciones y clases públicas |

### 4.3 Estándares de seguridad que sigue el código

| Estándar | Qué recomienda | Cómo se aplica en el código |
|---|---|---|
| **OWASP Top 10 – A01: Control de acceso roto** | Un usuario no debe acceder a recursos de otro | `WHERE id = $1 AND user_id = $2` en todas las consultas; `user_id` siempre tomado del token |
| **OWASP Top 10 – A02: Fallos criptográficos** | No guardar contraseñas en texto plano; proteger secretos | bcrypt con coste 12; `JWT_SECRET` solo en `.env` y fuera de Git |
| **OWASP Top 10 – A03: Inyección** | Consultas parametrizadas | `$1, $2…` en todo el SQL; lista blanca de columnas en el `UPDATE` |
| **OWASP Top 10 – A05: Configuración insegura** | No exponer detalles internos | `helmet`, `X-Powered-By` desactivado, errores 500 genéricos |
| **OWASP Top 10 – A07: Fallos de autenticación** | No revelar si un usuario existe; contraseñas robustas | Mismo mensaje y mismo tiempo en el login; mínimo 12 caracteres; token con expiración |
| **OWASP Password Storage Cheat Sheet** | Algoritmo lento con *salt*; respetar el límite de 72 bytes de bcrypt | `bcrypt.hash(password, 12)`; validación en bytes |
| **OWASP JWT Cheat Sheet / RFC 7519** | Fijar el algoritmo, usar expiración, claims estándar | `algorithms: ["HS256"]`, `expiresIn: "1h"`, `sub` = id del usuario |
| **OWASP Input Validation Cheat Sheet** | Validar con lista blanca en el servidor | Esquemas Zod `.strict()`, enums de estado, rango del id |
| **OWASP ASVS (V2, V4, V5, V7)** | Autenticación, control de acceso, validación y manejo de errores | Contraseña de 12+ caracteres, aislamiento por usuario, validación de entradas, errores sin detalles internos |
| **CWE-89, CWE-639, CWE-203, CWE-362, CWE-209** | Inyección SQL, acceso por id ajeno, diferencia observable, condición de carrera, exposición de información | Ajustes 3, 4 y 7 de la fase 2 y las consultas parametrizadas |

---

## 5. Decisiones tomadas sin asistencia de IA

1. **Filtrar por `user_id` dentro del SQL** en lugar de comparar el dueño en JavaScript. Es atómico, no se puede olvidar en una consulta y no revela si la tarea existe.
2. **PostgreSQL con restricciones en la base de datos** (`UNIQUE`, `CHECK`, `ON DELETE CASCADE`): la integridad de los datos no depende solo del código.
3. **Devolver 404 y no 403** cuando la tarea pertenece a otro usuario, para no confirmar qué ids existen.
4. **Zod en lugar de AJV**, porque un mismo esquema valida los datos y genera el tipo TypeScript.

---

## 6. Retos y soluciones

| Reto | Solución |
|---|---|
| Con módulos ES (`NodeNext`) los imports fallaban al ejecutar | Los imports relativos deben terminar en `.js` aunque el archivo sea `.ts` |
| `pg` devuelve las columnas `BIGINT` como texto | Se tipó `id` como `string` para no perder precisión |
| Las pruebas fallaban porque `env.ts` exigía un `.env` | Variables de prueba definidas en `vitest.config.ts` |
| Express 5 no permite asignar `req.query` | Se redefine la propiedad con `Object.defineProperty` |
| La validación del id con Zod 4 lanzaba una excepción con valores no numéricos | Un único `refine` que comprueba primero el formato |
| Probar el registro simultáneo con el mismo email | Error simulado en la prueba unitaria y 5 `curl` en paralelo contra PostgreSQL |

---

## 7. Verificación final

| Verificación | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm test` | 133 pruebas correctas |
| `npm run test:coverage` | 99.6 % sentencias · 98.9 % ramas · 100 % funciones |
| Registro y login contra PostgreSQL local | 201 / 200; contraseñas guardadas como `$2b$12$…` |
| Registro duplicado y 5 registros simultáneos | `409` y `201 409 409 409 409` |
| Un usuario intenta leer, editar o borrar la tarea de otro | 404 en los tres casos |
| Id `9223372036854775807` | 404 (no 500) |
| Arranque sin variables de entorno | La app no arranca y muestra qué variable falta |
| Swagger en `/api-docs` | Todos los endpoints documentados y probados |

---

## 8. Mejoras futuras

- Límite de intentos en `/auth/login` contra ataques de fuerza bruta.
- Refresh tokens y revocación de tokens.
- Paginación en `GET /tasks`.
- Migraciones versionadas de base de datos.
- Integración continua con GitHub Actions.
- Despliegue en un servicio en la nube.
