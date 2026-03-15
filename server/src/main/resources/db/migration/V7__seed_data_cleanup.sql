DELETE
FROM safety_permissions
WHERE guardian_id IN (SELECT id
                      FROM users
                      WHERE email IN
                            (
                             'alice.johnson@example.com', 'bob.smith@example.com', 'carol.white@example.com',
                             'david.brown@example.com', 'emma.davis@example.com', 'frank.miller@example.com',
                             'grace.wilson@example.com', 'henry.moore@example.com', 'isla.taylor@example.com'
                                ));

INSERT INTO safety_permissions (guardian_id, driver_id, status, privacy_level)
SELECT u1.id AS guardian_id,
       u2.id AS driver_id,
       'ACTIVE',
       CASE (u1.id % 3)
           WHEN 0 THEN 'ALERT_ONLY'
           WHEN 1 THEN 'LOCATION_AND_SPEED'
           ELSE 'FULL_ACCESS'
           END
FROM users u1
         JOIN users u2 ON u2.id = u1.id + 1
WHERE u1.email IN (
                   'alice.johnson@example.com', 'bob.smith@example.com', 'carol.white@example.com',
                   'david.brown@example.com', 'emma.davis@example.com', 'frank.miller@example.com',
                   'grace.wilson@example.com', 'henry.moore@example.com', 'isla.taylor@example.com'
    );