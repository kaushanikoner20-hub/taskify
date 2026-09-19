const express = require('express');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/tasks - list current user's tasks + weekly progress log.
//
// The progress log ALWAYS returns exactly 7 rows (Mon-Sun), even if the user
// has only logged hours on one day so far. Days with no logged hours come
// back with hours = 0. This is what makes the chart render as 7 proper bars
// instead of one bar stretching to fill the whole width when only 1 row
// of real data exists.
router.get('/', async (req, res) => {
  try {
    const tasks = await pool.query(
      `SELECT id, title, category, progress, due_date, days_left, color
       FROM tasks WHERE owner_id = $1 ORDER BY created_at ASC`,
      [req.user.id]
    );

    const progressLog = await pool.query(
      `SELECT gs.sort_order,
              (ARRAY['M','T','W','T','F','S','S'])[gs.sort_order] AS day_label,
              COALESCE(tpl.hours, 0)::float AS hours
       FROM generate_series(1, 7) AS gs(sort_order)
       LEFT JOIN task_progress_log tpl
         ON tpl.sort_order = gs.sort_order AND tpl.owner_id = $1
       ORDER BY gs.sort_order ASC`,
      [req.user.id]
    );

    res.json({ tasks: tasks.rows, progressLog: progressLog.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch tasks' });
  }
});

// POST /api/tasks - create a task
router.post('/', async (req, res) => {
  const { title, category, progress = 0, due_date, days_left, color = '#6D28D9' } = req.body;
  if (!title || !category) {
    return res.status(400).json({ error: 'title and category are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tasks (owner_id, title, category, progress, due_date, days_left, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, title, category, progress, due_date || null, days_left || null, color]
    );
    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create task' });
  }
});

// PATCH /api/tasks/:id - update progress/fields
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, category, progress, due_date, days_left, color } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET
         title = COALESCE($1, title),
         category = COALESCE($2, category),
         progress = COALESCE($3, progress),
         due_date = COALESCE($4, due_date),
         days_left = COALESCE($5, days_left),
         color = COALESCE($6, color)
       WHERE id = $7 AND owner_id = $8 RETURNING *`,
      [title, category, progress, due_date, days_left, color, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete task' });
  }
});

// POST /api/tasks/progress-log - log hours for a day (adds to existing hours for that weekday slot)
router.post('/progress-log', async (req, res) => {
  const { day_label, sort_order, hours } = req.body;
  if (!day_label || sort_order == null || hours == null) {
    return res.status(400).json({ error: 'day_label, sort_order and hours are required' });
  }
  const hoursNum = Number(hours);
  if (Number.isNaN(hoursNum) || hoursNum <= 0) {
    return res.status(400).json({ error: 'hours must be a positive number' });
  }

  try {
    const existing = await pool.query(
      'SELECT id, hours FROM task_progress_log WHERE owner_id = $1 AND sort_order = $2',
      [req.user.id, sort_order]
    );

    let result;
    if (existing.rows.length > 0) {
      const newHours = Number(existing.rows[0].hours) + hoursNum;
      result = await pool.query(
        'UPDATE task_progress_log SET hours = $1 WHERE id = $2 RETURNING *',
        [newHours, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO task_progress_log (owner_id, day_label, hours, sort_order)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [req.user.id, day_label, hoursNum, sort_order]
      );
    }
    res.status(201).json({ entry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not log hours' });
  }
});

module.exports = router;