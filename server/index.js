// Flappy Kiro — Leaderboard & Analytics API
import express    from 'express';
import cors       from 'cors';
import { insertScore, getLeaderboard, updateAnalytics, getAnalytics } from './db.js';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
// Returns total games played and average score.
app.get('/analytics', (_req, res) => {
  const { total_games, total_score } = getAnalytics.get();
  const avg = total_games > 0
    ? Math.round(total_score / total_games)
    : 0;
  return res.json({ total_games, average_score: avg });
});

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Flappy Kiro API listening on port ${PORT}`);
});
