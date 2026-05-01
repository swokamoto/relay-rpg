import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.DB_DIR || '/data';
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'relay-rpg.sqlite');

// Ensure the directory exists (for local dev the volume may not be mounted)
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    user_id   TEXT PRIMARY KEY,
    data      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id        TEXT PRIMARY KEY,
    status    TEXT NOT NULL DEFAULT 'open',
    data      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS adventures (
    id        TEXT PRIMARY KEY,
    thread_id TEXT UNIQUE,
    job_id    TEXT UNIQUE,
    data      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS threads (
    job_id    TEXT PRIMARY KEY,
    thread_id TEXT UNIQUE,
    data      TEXT NOT NULL
  );
`);

export default db;
