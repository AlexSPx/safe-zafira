CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE vehicle_telemetry
(
    id         SERIAL,
    vehicle_no VARCHAR(50) REFERENCES vehicles (vehicle_no),
    is_crashed BOOLEAN   DEFAULT FALSE,
    latitude   DECIMAL,
    longitude  DECIMAL,
    speed      DECIMAL,
    ts         timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, ts)
);

SELECT create_hypertable('vehicle_telemetry', 'ts');