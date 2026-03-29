// db.js — SQLite setup via better-sqlite3 (synchronous, zero-config)
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = process.env.DB_PATH || join(__dirname, 'data', 'scores.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(join(__dirname, 'data'), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname  TEXT    NOT NULL,
    score     INTEGER NOT NULL,
    played_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    total_games   INTEGER NOT NULL DEFAULT 0,
    total_score   INTEGER NOT NULL DEFAULT 0
  );

  -- Ensure the single analytics row exists
  INSERT OR IGNORE INTO analytics (id, total_games, total_score) VALUES (1, 0, 0);
`);

// ─── Prepared statements ──────────────────────────────────────

export const insertScore = db.prepare(
  'INSERT INTO scores (nickname, score) VALUES (?, ?)'
);

export const getLeaderboard = db.prepare(`
  SELECT nickname, score, played_at
  FROM scores
  ORDER BY score DESC, played_at ASC
  LIMIT 10
`);

export const updateAnalytics = db.prepare(`
  UPDATE analytics
  SET total_games = total_games + 1,
      total_score = total_score + ?
  WHERE id = 1
`);

export const getAnalytics = db.prepare(
  'SELECT total_games, total_score FROM analytics WHERE id = 1'
);

export default db;
