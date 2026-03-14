CREATE TABLE users
(
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL,
    username      VARCHAR(50)         NOT NULL,
    family_name   VARCHAR(50)         NOT NULL
);

CREATE INDEX idx_users_email ON users (email);