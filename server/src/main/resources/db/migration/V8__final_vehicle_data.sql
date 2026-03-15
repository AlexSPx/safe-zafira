ALTER TABLE vehicle_telemetry
    ADD COLUMN rpm         DECIMAL,
    ADD COLUMN steering    DECIMAL,
    ADD COLUMN mileage     DECIMAL,
    ADD COLUMN brake_pedal BOOLEAN DEFAULT FALSE,
    DROP COLUMN battery_car,
    DROP COLUMN fuel,
    DROP COLUMN esp;
