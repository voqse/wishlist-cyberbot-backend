-- Add isAdmin column to users table
ALTER TABLE users ADD COLUMN isAdmin BOOLEAN DEFAULT FALSE;

-- Set isAdmin to true for user with username @voqse
UPDATE users SET isAdmin = TRUE WHERE username = 'voqse';

