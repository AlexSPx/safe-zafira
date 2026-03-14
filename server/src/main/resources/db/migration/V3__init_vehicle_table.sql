CREATE TABLE vehicles
(
    id SERIAL PRIMARY KEY,
    vehicle_no VARCHAR(50) UNIQUE,
    vin VARCHAR UNIQUE,
    make VARCHAR,
    model VARCHAR,
    batteryVoltage NUMERIC
);

CREATE TABLE user_vehicle
(
    user_id    SERIAL,
    vehicle_id SERIAL,
    PRIMARY KEY (user_id, vehicle_id),
    CONSTRAINT fk_user_vehicle_user_id
        FOREIGN KEY (user_id)
            REFERENCES users (id),

    CONSTRAINT fk_user_vehicle_vehicle_id
        FOREIGN KEY (vehicle_id)
            REFERENCES vehicles (id)
);