CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE vehicle_telemetry
(
    id          SERIAL,
    vehicle_no  VARCHAR(50) REFERENCES vehicles (vehicle_no),
    latitude    DECIMAL,
    longitude   DECIMAL,
    speed       DECIMAL,
    battery     DECIMAL,
    battery_car DECIMAL,
    fuel        DECIMAL,
    dangers     VARCHAR[],
    diagnostics VARCHAR[],
    airbags     BOOLEAN DEFAULT FALSE,
    abs         BOOLEAN DEFAULT FALSE,
    esp         BOOLEAN DEFAULT FALSE,
    ts          timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, ts)
);

SELECT create_hypertable('vehicle_telemetry', 'ts');
