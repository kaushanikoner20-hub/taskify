const express = require('express');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// A small rotating set of colors so manually-added batchmates get a readable avatar
// without the user having to pick one.
const AVATAR_COLORS = ['#6D28D9', '#A78BFA', '#C4B5FD', '#5B21B6', '#8B5CF6'];

// GET /api/users/batchmates
router.get('/batchmates', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, role, avatar_color FROM batchmates
       WHERE owner_id = $1 ORDER BY id ASC`,
      [req.user.id]
    );
    res.json({ batchmates: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch batchmates' });
  }
});

// POST /api/users/batchmates - add a team member (name + role entered manually)
router.post('/batchmates', async (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'name and role are required' });
  }
  try {
    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM batchmates WHERE owner_id = $1',
      [req.user.id]
    );
    const color = AVATAR_COLORS[countResult.rows[0].count % AVATAR_COLORS.length];

    const result = await pool.query(
      `INSERT INTO batchmates (owner_id, name, role, avatar_color)
       VALUES ($1, $2, $3, $4) RETURNING id, name, role, avatar_color`,
      [req.user.id, name, role, color]
    );
    res.status(201).json({ batchmate: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add team member' });
  }
});

// DELETE /api/users/batchmates/:id - remove a team member
router.delete('/batchmates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM batchmates WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not remove team member' });
  }
});

module.exports = router;