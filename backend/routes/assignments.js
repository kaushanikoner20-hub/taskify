const express = require('express');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/assignments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, due_date, grade, completed
       FROM assignments WHERE owner_id = $1 ORDER BY due_date ASC`,
      [req.user.id]
    );
    const completedCount = result.rows.filter(r => r.completed).length;
    res.json({
      assignments: result.rows,
      summary: { completed: completedCount, total: result.rows.length },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch assignments' });
  }
});

// POST /api/assignments
router.post('/', async (req, res) => {
  const { title, due_date, grade } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO assignments (owner_id, title, due_date, grade)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, title, due_date || null, grade || null]
    );
    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create assignment' });
  }
});

// PATCH /api/assignments/:id/toggle - flip completed state
router.patch('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE assignments SET completed = NOT completed
       WHERE id = $1 AND owner_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update assignment' });
  }
});

module.exports = router;