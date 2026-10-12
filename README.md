# API de Gestión de Tareas

API REST construida con **Node.js, Express, TypeScript y PostgreSQL** que permite a los usuarios registrarse, iniciar sesión con **JWT** y administrar sus propias tareas personales. Cada tarea pertenece al usuario que la creó y ningún usuario puede ver ni modificar las tareas de otro.

---

## 1. Descripción del proyecto y su arquitectura

### Funcionalidades

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Registra un usuario (nombre, email, contraseña). La contraseña se guarda con hash **bcrypt** |
| POST | `/auth/login` | No | Verifica las credenciales y devuelve un **JWT** |
| POST | `/tasks` | JWT | Crea una tarea del usuario autenticado |
| GET | `/tasks` | JWT | Lista solo las tareas del usuario autenticado (filtro opcional `?estado=`) |
| GET | `/tasks/:id` | JWT | Consulta una tarea propia |
| PUT | `/tasks/:id` | JWT | Modifica una tarea propia |
| DELETE | `/tasks/:id` | JWT | Elimina una tarea propia |

Cada tarea tiene: `id`, `titulo`, `descripcion`, `fecha_vencimiento` y `estado` (`pendiente`, `en curso`, `completada`).

La documentación interactiva (Swagger) está disponible en `http://localhost:3000/api-docs`.

### Arquitectura en capas

```
Petición HTTP
     │
     ▼
src/api            Rutas y middlewares (autenticación JWT, validación con Zod, errores)
     │
     ▼
src/controllers    Reciben la petición, llaman al servicio y construyen la respuesta
     │
     ▼
src/services       Lógica de negocio (bcrypt, JWT, reglas de propiedad de tareas)
     │
     ▼
src/persistence    Consultas SQL parametrizadas a PostgreSQL
     │
     ▼
PostgreSQL

Cualquier error en cualquier capa ──► middleware central de errores ──► respuesta JSON uniforme
```

### Estructura de carpetas

```
api-tareas/
├── database/
│   └── schema.sql              # Tablas users y tasks
├── src/
│   ├── api/
│   │   ├── middlewares/        # auth, validate, error
│   │   ├── routes/             # auth.routes.ts, tasks.routes.ts
│   │   └── schemas/            # Esquemas de validación Zod
│   ├── config/                 # env.ts (Singleton), database.ts, swagger.ts
│   ├── controllers/            # auth.controller.ts, task.controller.ts
│   ├── errors/                 # Clases de error personalizadas
│   ├── persistence/            # Repositorios (acceso a datos)
│   ├── services/               # auth, token (JWT) y task
│   ├── types/                  # Tipos de dominio
│   ├── app.ts                  # Configuración de Express
│   └── server.ts               # Punto de entrada
├── tests/                      # Pruebas unitarias y de integración (Vitest)
├── .env.example
└── package.json
```

### Patrones y decisiones principales

- **Singleton** para la configuración (`src/config/env.ts`): las variables de entorno se leen y validan una sola vez.
- **Repository** para el acceso a datos y **Service Layer** para la lógica de negocio.
- **Middleware** para autenticación, validación y manejo centralizado de errores.
- **Clases de error personalizadas** (`NotFoundError`, `AuthenticationError`, `ConflictError`, `ValidationError`).
- Todas las consultas de tareas filtran por `user_id` en SQL (`WHERE id = $1 AND user_id = $2`). Si la tarea es de otro usuario, la API responde **404**.

---

## 2. Instalación local

### Requisitos previos

- **Node.js 20 o superior** → comprobar con `node -v`
- **npm** → comprobar con `npm -v`
- **PostgreSQL 13 o superior** instalado localmente → comprobar con `psql --version`

### Pasos

**1. Clonar el repositorio**

```bash
git clone https://github.com/alexandermauryhurtado-jpg/api-tareas.git
cd api-tareas
```

**2. Instalar las dependencias**

```bash
npm install
```

**3. Crear la base de datos en PostgreSQL**

```bash
psql -U postgres -c "CREATE DATABASE api_tareas_db;"
```

**4. Crear las tablas**

```bash
psql -U postgres -d api_tareas_db -f database/schema.sql
```

Debe mostrar `CREATE TABLE` (dos veces) y `CREATE INDEX`.

> En Windows, si `psql` no se reconoce, usa la ruta completa (por ejemplo `"C:\Program Files\PostgreSQL\16\bin\psql.exe"`) o ejecuta el contenido de `database/schema.sql` desde pgAdmin.

---

## 3. Configuración del archivo `.env`

**1. Copiar el archivo de ejemplo**

```bash
# Linux / macOS
cp .env.example .env

# Windows (cmd)
copy .env.example .env
```

**2. Editar `.env` con tus valores**

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5433
DB_NAME=api_tareas_db
DB_USER=postgres
DB_PASSWORD=tu_contraseña_de_postgres

JWT_SECRET=pega_aqui_un_secreto_largo_de_al_menos_32_caracteres
JWT_EXPIRES_IN=1h

BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=*
```

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NODE_ENV` | No (`development`) | Entorno: `development`, `test` o `production` |
| `PORT` | No (`3000`) | Puerto donde corre la API |
| `DB_HOST` | **Sí** | Host de PostgreSQL |
| `DB_PORT` | No (`5432`) | Puerto de PostgreSQL |
| `DB_NAME` | **Sí** | Nombre de la base de datos creada en el paso 3 |
| `DB_USER` | **Sí** | Usuario de PostgreSQL |
| `DB_PASSWORD` | **Sí** | Contraseña de ese usuario |
| `JWT_SECRET` | **Sí** | Secreto para firmar los tokens. **Mínimo 32 caracteres** |
| `JWT_EXPIRES_IN` | No (`1h`) | Duración del token (`15m`, `1h`, `7d`) |
| `BCRYPT_SALT_ROUNDS` | No (`12`) | Coste del hash de contraseñas (4–15) |
| `CORS_ORIGIN` | No (`*`) | Origen permitido para peticiones desde un navegador |

**3. Generar un `JWT_SECRET` seguro**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copia el resultado en `JWT_SECRET`.

> Si falta una variable obligatoria o tiene un formato incorrecto, la aplicación no arranca y muestra qué variable falla.
>
> El archivo `.env` está en `.gitignore` y **nunca** debe subirse al repositorio. Solo se versiona `.env.example`.

---

## 4. Comandos para ejecutar el proyecto

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia la API en modo desarrollo con recarga automática |
| `npm run build` | Compila TypeScript a JavaScript en la carpeta `dist/` |
| `npm start` | Ejecuta la versión compilada (después de `npm run build`) |
| `npm test` | Ejecuta las pruebas |
| `npm run test:coverage` | Ejecuta las pruebas con informe de cobertura |
| `npm run typecheck` | Verifica los tipos sin compilar |

### Iniciar en desarrollo

```bash
npm run dev
```

Salida esperada:

```
Conexión a PostgreSQL exitosa
API disponible en http://localhost:3000
Swagger en http://localhost:3000/api-docs
```

### Probar la API

1. Abrir `http://localhost:3000/api-docs`.
2. Ejecutar `POST /auth/register` con un nombre, email y contraseña (mínimo 12 caracteres).
3. Ejecutar `POST /auth/login` y copiar el `token` de la respuesta.
4. Pulsar **Authorize**, pegar el token y confirmar.
5. Probar los endpoints de `/tasks`.

Ejemplo con `curl`:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@mail.com","password":"UnaClaveSegura123"}'

curl http://localhost:3000/tasks \
  -H "Authorization: Bearer <token>"
```
