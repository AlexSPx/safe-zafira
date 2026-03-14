DROP TABLE IF EXISTS safety_permissions;

CREATE TABLE safety_permissions
(
    id            SERIAL PRIMARY KEY,
    guardian_id   BIGINT REFERENCES users (id),
    driver_id     BIGINT REFERENCES users (id),
    status        VARCHAR(20) NOT NULL,
    privacy_level VARCHAR(20) NOT NULL, -- 'ALERT_ONLY', 'LOCATION_AND_SPEED', 'FULL_ACCESS'
    UNIQUE (driver_id, guardian_id)
);