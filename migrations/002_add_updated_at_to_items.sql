-- Up
ALTER TABLE items ADD COLUMN updatedAt TEXT;
UPDATE items SET updatedAt = createdAt;

-- Down
ALTER TABLE items DROP COLUMN updatedAt;

