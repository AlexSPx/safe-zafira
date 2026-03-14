-- Users (password_hash is bcrypt of 'Password1!')
INSERT INTO users (email, password_hash, username, first_name, family_name) VALUES
    ('alice.johnson@example.com',  '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'alicej',   'Alice',   'Johnson'),
    ('bob.smith@example.com',      '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'bsmith',   'Bob',     'Smith'),
    ('carol.white@example.com',    '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'cwhite',   'Carol',   'White'),
    ('david.brown@example.com',    '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'dbrown',   'David',   'Brown'),
    ('emma.davis@example.com',     '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'edavis',   'Emma',    'Davis'),
    ('frank.miller@example.com',   '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'fmiller',  'Frank',   'Miller'),
    ('grace.wilson@example.com',   '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'gwilson',  'Grace',   'Wilson'),
    ('henry.moore@example.com',    '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'hmoore',   'Henry',   'Moore'),
    ('isla.taylor@example.com',    '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'itaylor',  'Isla',    'Taylor'),
    ('jack.anderson@example.com',  '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2jB1U1k1r1g1h1i1j1k1l1m1n1o1p', 'janderson','Jack',    'Anderson');

-- Vehicles
INSERT INTO vehicles (vehicle_no, vin, make, model, batteryVoltage) VALUES
    ('VH-001', '1HGBH41JXMN109186', 'Toyota',     'Corolla',   12.6),
    ('VH-002', '2T1BURHE0JC021949', 'Honda',       'Civic',     12.4),
    ('VH-003', '3VWFE21C04M000001', 'Ford',        'Focus',     12.5),
    ('VH-004', '4T1BF1FK0HU123456', 'BMW',         '3 Series',  12.8),
    ('VH-005', '5YJSA1DN9DFP14705', 'Tesla',       'Model S',   400.0),
    ('VH-006', '6FPAA8FBXAE123456', 'Volkswagen',  'Golf',      12.3),
    ('VH-007', '7FBPU31599X123456', 'Mercedes',    'C-Class',   12.7),
    ('VH-008', '8AFAB6821D5123456', 'Audi',        'A4',        12.6),
    ('VH-009', '9BWZZZ377VT004251', 'Hyundai',     'Elantra',   12.5),
    ('VH-010', '1N4AL3AP8JC123456', 'Kia',         'Optima',    12.4);

-- user_vehicle (one vehicle per user)
INSERT INTO user_vehicle (user_id, vehicle_id)
SELECT u.id, v.id FROM users u JOIN vehicles v ON v.vehicle_no = 'VH-00' || (u.id)
WHERE u.email IN (
    'alice.johnson@example.com', 'bob.smith@example.com', 'carol.white@example.com',
    'david.brown@example.com', 'emma.davis@example.com', 'frank.miller@example.com',
    'grace.wilson@example.com', 'henry.moore@example.com', 'isla.taylor@example.com',
    'jack.anderson@example.com'
);

-- safety_permissions (each user is guardian of the next user, driver of the previous)
INSERT INTO safety_permissions (guardian_id, driver_id, status, privacy_level)
SELECT
    u1.id AS guardian_id,
    u2.id AS driver_id,
    'ACCEPTED',
    CASE (u1.id % 3)
        WHEN 0 THEN 'ALERT_ONLY'
        WHEN 1 THEN 'LOCATION_AND_SPEED'
        ELSE        'FULL_ACCESS'
    END
FROM users u1
JOIN users u2 ON u2.id = u1.id + 1
WHERE u1.email IN (
    'alice.johnson@example.com', 'bob.smith@example.com', 'carol.white@example.com',
    'david.brown@example.com', 'emma.davis@example.com', 'frank.miller@example.com',
    'grace.wilson@example.com', 'henry.moore@example.com', 'isla.taylor@example.com'
);
