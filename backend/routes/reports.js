const express = require('express');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/reports/summary - real aggregate stats, no fabricated numbers.
// Every value here is computed directly from the user's own rows.
router.get('/summary', async (req, res) => {
  try {
    const ownerId = req.user.id;

    const taskStats = await pool.query(
      `SELECT COUNT(*)::int AS task_count,
              COALESCE(ROUND(AVG(progress)), 0)::int AS avg_progress
       FROM tasks WHERE owner_id = $1`,
      [ownerId]
    );

    const assignmentStats = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE completed)::int AS completed
       FROM assignments WHERE owner_id = $1`,
      [ownerId]
    );

    const hoursStats = await pool.query(
      `SELECT COALESCE(SUM(hours), 0)::float AS total_hours,
              COUNT(*) FILTER (WHERE hours > 0)::int AS days_logged
       FROM task_progress_log WHERE owner_id = $1`,
      [ownerId]
    );

    const teamStats = await pool.query(
      'SELECT COUNT(*)::int AS team_size FROM batchmates WHERE owner_id = $1',
      [ownerId]
    );

    const categoryBreakdown = await pool.query(
      `SELECT category,
              COUNT(*)::int AS task_count,
              COALESCE(ROUND(AVG(progress)), 0)::int AS avg_progress
       FROM tasks WHERE owner_id = $1
       GROUP BY category ORDER BY category ASC`,
      [ownerId]
    );

    res.json({
      tasks: taskStats.rows[0],
      assignments: assignmentStats.rows[0],
      hours: hoursStats.rows[0],
      team: teamStats.rows[0],
      byCategory: categoryBreakdown.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate report' });
  }
});

module.exports = router;