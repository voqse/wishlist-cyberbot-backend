import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function setupDatabase() {
  const db = await open({
    filename: './wishlist.db',
    driver: sqlite3.Database,
  })

  // Create initial tables (without columns that will be added by migrations)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT,
      username TEXT,
      languageCode TEXT,
      isPremium INTEGER,
      photoUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shareId TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      createdBy INTEGER NOT NULL UNIQUE,
      createdAt TEXT,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      links TEXT,
      photos TEXT,
      createdBy INTEGER NOT NULL,
      createdAt TEXT,
      reservedBy INTEGER,
      reservedAt TEXT,
      wishlistId INTEGER NOT NULL,
      FOREIGN KEY (createdBy) REFERENCES users(id),
      FOREIGN KEY (reservedBy) REFERENCES users(id),
      FOREIGN KEY (wishlistId) REFERENCES wishlists(id)
    );
  `)

  // Run migrations to add additional columns
  await db.migrate({
    migrationsPath: path.join(__dirname, 'migrations'),
  })

  console.log('Database setup complete.')
  return db
}

export default setupDatabase
