import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function setupDatabase() {
  const db = await open({
    filename: './wishlist.db',
    driver: sqlite3.Database
  });

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
      createdAt TEXT NOT NULL,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      links TEXT,
      photos TEXT,
      createdBy INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      reservedBy INTEGER,
      reservedAt TEXT,
      wishlistId INTEGER NOT NULL,
      FOREIGN KEY (createdBy) REFERENCES users(id),
      FOREIGN KEY (reservedBy) REFERENCES users(id),
      FOREIGN KEY (wishlistId) REFERENCES wishlists(id)
    );
  `);

  console.log('Database setup complete.');
  return db;
}

export default setupDatabase;
