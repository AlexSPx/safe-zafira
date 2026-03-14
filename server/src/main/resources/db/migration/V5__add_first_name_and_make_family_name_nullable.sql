ALTER TABLE users
    ADD COLUMN first_name VARCHAR(50);

ALTER TABLE users
    ALTER COLUMN family_name DROP NOT NULL;

