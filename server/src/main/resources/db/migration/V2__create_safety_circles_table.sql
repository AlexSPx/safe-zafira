CREATE TABLE safety_permissions
(
    id            SERIAL PRIMARY KEY,
    owner_id      BIGINT REFERENCES users (id),
    viewer_id     BIGINT REFERENCES users (id),
    status        VARCHAR(20) NOT NULL, -- 'PENDING', 'ACTIVE'
    privacy_level VARCHAR(20) NOT NULL, -- 'EMERGENCY_ONLY', 'FULL_ACCESS', 'EVERYTHING', maybe smth more
    UNIQUE (owner_id, viewer_id)
);

CREATE TABLE vehicle_telemetry
(
    id         SERIAL PRIMARY KEY,
    vehicle_no VARCHAR(50) REFERENCES vehicles (vehicle_no),
    is_crashed BOOLEAN   DEFAULT FALSE,
    latitude   DECIMAL,
    longitude  DECIMAL,
    speed      DECIMAL,
    ts         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);