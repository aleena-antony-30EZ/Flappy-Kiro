// Flappy Kiro — Leaderboard & Analytics API
import express from 'express';
import cors    from 'cors';
import {
  insertScore, getLeaderboard, updateAnalytics, getAnalytics,
  insertEventsBatch, getEventStats, getCrashReports, getPerformanceMetrics
} from './db.js';

const app  = express();
const PORT = process.env.PORT || 3001;

const VALID_EVENT_TYPES = new Set([
  'game_start', 'game_over', 'flap', 'pipe_hit', 'boundary_hit', 'crash'
]);

app.use(cors());
app.use(express.json({ limit: '32kb' })); // cap payload size

// ─── POST /scores ─────────────────────────────────────────────
// Submit a score after a game over.
// Body: { nickname: string, score: number }
app.post('/scores', (req, res) => {
  let { nickname, score } = req.body ?? {};

  // Validate
  if (typeof nickname !== 'string' || typeof score !== 'number') {
    return res.status(400).json({ error: 'nickname (string) and score (number) required' });
  }
  if (!Number.isInteger(score) || score < 0 || score > 9999) {
    return res.status(400).json({ error: 'score must be an integer between 0 and 9999' });
  }

  // Sanitize nickname: strip non-printable chars, cap at 12 chars
  nickname = nickname.replace(/[^\x20-\x7E]/g, '').trim().slice(0, 12) || 'Anon';

  insertScore.run(nickname, score);
  updateAnalytics.run(score);

  return res.status(201).json({ ok: true });
});

// ─── GET /leaderboard ─────────────────────────────────────────
// Returns top 10 all-time scores.
app.get('/leaderboard', (_req, res) => {
  const rows = getLeaderboard.all();
  return res.json(rows);
});

// ─── GET /analytics ───────────────────────────────────────────
// Returns total games played, average score, session metrics, and event breakdown.
app.get('/analytics', (_req, res) => {
  const { total_games, total_score } = getAnalytics.get();
  const avg        = total_games > 0 ? Math.round(total_score / total_games) : 0;
  const perf       = getPerformanceMetrics.get();
  const eventStats = getEventStats.all();
  return res.json({
    total_games,
    average_score:   avg,
    avg_session_ms:  perf.avg_session_ms ?? 0,
    max_session_ms:  perf.max_session_ms ?? 0,
    total_sessions:  perf.total_sessions ?? 0,
    event_breakdown: eventStats
  });
});

// ─── POST /events ─────────────────────────────────────────────
// Batch-ingest player behavior events and crash reports.
// Body: { events: Array<{ type, nickname?, score?, value?, meta? }> }
app.post('/events', (req, res) => {
  const { events } = req.body ?? {};
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array required' });
  }
  if (events.length > 200) {
    return res.status(400).json({ error: 'max 200 events per batch' });
  }

  const sanitized = [];
  for (const e of events) {
    if (!VALID_EVENT_TYPES.has(e.type)) continue; // silently skip unknown types
    sanitized.push({
      type:     e.type,
      nickname: typeof e.nickname === 'string'
        ? e.nickname.replace(/[^\x20-\x7E]/g, '').slice(0, 12) || null
        : null,
      score:    Number.isInteger(e.score) && e.score >= 0 ? e.score : null,
      value:    typeof e.value  === 'number' && isFinite(e.value) ? e.value : null,
      meta:     typeof e.meta   === 'string' ? e.meta.slice(0, 500) : null
    });
  }

  if (sanitized.length > 0) insertEventsBatch(sanitized);
  return res.status(201).json({ ok: true, accepted: sanitized.length });
});

// ─── GET /analytics/crashes ───────────────────────────────────
// Returns the 50 most recent crash reports.
app.get('/analytics/crashes', (_req, res) => {
  return res.json(getCrashReports.all());
});

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Flappy Kiro API listening on port ${PORT}`);
});
