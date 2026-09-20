require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = require('./db/pool');
const app = require('./app');

const PORT = process.env.PORT || 3000;

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