-- Taskify database schema (seed DATA is inserted by the backend on startup,
-- see backend/db/seed.js, so the demo password is hashed correctly at runtime)

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    role          VARCHAR(120) DEFAULT 'UI/UX Designer',
    email         VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_color  VARCHAR(20) DEFAULT '#6D28D9',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(160) NOT NULL,
    category      VARCHAR(120) NOT NULL,
    progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    due_date      DATE,
    days_left     INTEGER,
    color         VARCHAR(20) DEFAULT '#6D28D9',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignments (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(160) NOT NULL,
    due_date      DATE,
    grade         VARCHAR(20),
    completed     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_progress_log (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_label     VARCHAR(3) NOT NULL,   -- M, T, W, T, F, S, S
    hours         NUMERIC(4,1) NOT NULL DEFAULT 0,
    sort_order    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS batchmates (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    role          VARCHAR(120) NOT NULL,
    avatar_color  VARCHAR(20) DEFAULT '#A78BFA'
);