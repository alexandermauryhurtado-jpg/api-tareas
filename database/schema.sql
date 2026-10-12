-- Esquema de la base de datos de la API de tareas (PostgreSQL 13+).
-- Ejecutar con: psql -U postgres -d api_tareas_db -f database/schema.sql

CREATE TABLE IF NOT EXISTS users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    -- La app guarda el email en minúsculas; el CHECK lo garantiza también en la BD.
    email         VARCHAR(254) NOT NULL UNIQUE CHECK (email = LOWER(email)),
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo            VARCHAR(150) NOT NULL CHECK (LENGTH(TRIM(titulo)) > 0),
    descripcion       TEXT,
    fecha_vencimiento TIMESTAMPTZ,
    estado            VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'en curso', 'completada')),
    -- Cada tarea pertenece a un usuario; si se borra el usuario, se borran sus tareas.
    user_id           BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- GET /tasks filtra siempre por user_id (y opcionalmente por estado).
-- El índice compuesto (user_id, estado) también sirve para buscar solo por user_id,
-- porque user_id es su primera columna; por eso no hace falta otro índice aparte.
CREATE INDEX IF NOT EXISTS idx_tasks_user_estado ON tasks (user_id, estado);
