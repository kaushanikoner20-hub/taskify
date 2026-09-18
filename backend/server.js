require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const pool = require('./db/pool');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const assignmentRoutes = require('./routes/assignments');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check (used by Docker healthcheck + docker-compose depends_on)
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function initDbAndStart() {
  const initSqlPath = path.join(__dirname, 'db', 'init.sql');
  const initSql = fs.readFileSync(initSqlPath, 'utf8');

  // Retry connecting to Postgres since the db container may still be starting
  let connected = false;
  for (let attempt = 1; attempt <= 15 && !connected; attempt++) {
    try {
      await pool.query('SELECT 1');
      connected = true;
    } catch (err) {
      console.log(`Waiting for database... (attempt ${attempt}/15)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!connected) {
    console.error('Could not connect to database. Exiting.');
    process.exit(1);
  }

  await pool.query(initSql);

  app.listen(PORT, () => {
    console.log(`Taskify API listening on port ${PORT}`);
  });
}

initDbAndStart();