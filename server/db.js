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

  -- Player behavior events + crash reports
  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT    NOT NULL,  -- 'flap'|'pipe_hit'|'boundary_hit'|'game_start'|'game_over'|'crash'
    nickname   TEXT,
    score      INTEGER,
    value      REAL,              -- generic numeric payload (e.g. session duration ms)
    meta       TEXT,              -- JSON string for extra context (e.g. crash message)
    recorded_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  CREATE INDEX IF NOT EXISTS idx_events_recorded_at ON events(recorded_at);
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

export const insertEvent = db.prepare(
  'INSERT INTO events (type, nickname, score, value, meta) VALUES (?, ?, ?, ?, ?)'
);

// Batch insert wrapped in a transaction for efficiency
export const insertEventsBatch = db.transaction((events) => {
  for (const e of events) {
    insertEvent.run(e.type, e.nickname ?? null, e.score ?? null, e.value ?? null, e.meta ?? null);
  }
});

export const getEventStats = db.prepare(`
  SELECT
    type,
    COUNT(*)                        AS count,
    ROUND(AVG(value), 2)            AS avg_value,
    MAX(recorded_at)                AS last_seen
  FROM events
  GROUP BY type
  ORDER BY count DESC
`);

export const getCrashReports = db.prepare(`
  SELECT nickname, score, meta, recorded_at
  FROM events
  WHERE type = 'crash'
  ORDER BY recorded_at DESC
  LIMIT 50
`);

export const getPerformanceMetrics = db.prepare(`
  SELECT
    ROUND(AVG(value), 0)  AS avg_session_ms,
    MAX(value)            AS max_session_ms,
    COUNT(*)              AS total_sessions
  FROM events
  WHERE type = 'game_over'
`);

export default db;
