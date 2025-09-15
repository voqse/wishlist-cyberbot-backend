-- Up
ALTER TABLE wishlists ADD COLUMN updatedAt TEXT;
UPDATE wishlists SET updatedAt = createdAt;

-- Down
ALTER TABLE wishlists DROP COLUMN updatedAt;

