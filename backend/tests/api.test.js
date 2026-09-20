// Taskify backend API tests.
//
// These run against the real Express app (imported directly from app.js,
// bypassing server.js's listen/bootstrap) and a real PostgreSQL instance.
// In CI, that Postgres instance is a service container (see
// .github/workflows/ci-cd.yml); locally, point DB_HOST/DB_PORT/etc at any
// disposable Postgres 16 instance before running `npm test`.
//
// These are not placeholder tests: they exercise real validation logic,
// real auth enforcement, and include a regression test for a bug that
// actually shipped (the weekly progress chart only returning days that
// had logged hours, instead of always returning all 7 weekdays).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const pool = require('../db/pool');
const app = require('../app');

test.before(async () => {
  // Wait for Postgres to accept connections - CI service containers can
  // take a few seconds even after Docker reports them as "started".
  let connected = false;
  for (let attempt = 1; attempt <= 15 && !connected; attempt++) {
    try {
      await pool.query('SELECT 1');
      connected = true;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!connected) {
    throw new Error('Could not connect to test database after 15 attempts');
  }

  const initSql = fs.readFileSync(path.join(__dirname, '..', 'db', 'init.sql'), 'utf8');
  await pool.query(initSql);
});

test.after(async () => {
  await pool.end();
});

const uniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@taskify.test`;

test('GET /api/health returns ok when the database is reachable', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('POST /api/auth/register rejects a request missing required fields', async () => {
  const res = await request(app).post('/api/auth/register').send({ email: uniqueEmail() });
  assert.equal(res.status, 400);
});

test('POST /api/auth/register creates an account and never returns the password hash', async () => {
  const email = uniqueEmail();
  const res = await request(app).post('/api/auth/register').send({
    name: 'CI Test User',
    email,
    password: 'TestPassword123!',
    role: 'QA Engineer',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, email);
  assert.equal(res.body.user.password_hash, undefined);
});

test('POST /api/auth/register rejects a duplicate email', async () => {
  const email = uniqueEmail();
  const payload = { name: 'Dup User', email, password: 'TestPassword123!', role: 'Tester' };
  await request(app).post('/api/auth/register').send(payload);
  const res = await request(app).post('/api/auth/register').send(payload);
  assert.equal(res.status, 409);
});

test('POST /api/auth/login rejects an incorrect password', async () => {
  const email = uniqueEmail();
  await request(app).post('/api/auth/register').send({
    name: 'Login Test', email, password: 'CorrectPassword123!', role: 'Tester',
  });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword' });
  assert.equal(res.status, 401);
});

test('GET /api/tasks requires authentication', async () => {
  const res = await request(app).get('/api/tasks');
  assert.equal(res.status, 401);
});

test('authenticated user can create a task, and the weekly chart always has 7 days', async () => {
  const email = uniqueEmail();
  const register = await request(app).post('/api/auth/register').send({
    name: 'Task Test User', email, password: 'TestPassword123!', role: 'Developer',
  });
  const token = register.body.token;

  const created = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'CI test task', category: 'Testing' });
  assert.equal(created.status, 201);

  const list = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.tasks.length, 1);
  assert.equal(list.body.tasks[0].title, 'CI test task');

  // Regression check: the progress log must always report all 7 weekdays,
  // even for a brand-new user who has not logged any hours yet. This
  // exact bug (only returning rows that existed) previously made the
  // dashboard chart render as one bar stretching the full chart width
  // instead of 7 proper columns.
  assert.equal(list.body.progressLog.length, 7);
});

test('GET /api/reports/summary reflects the tasks just created', async () => {
  const email = uniqueEmail();
  const register = await request(app).post('/api/auth/register').send({
    name: 'Report Test User', email, password: 'TestPassword123!', role: 'Analyst',
  });
  const token = register.body.token;

  await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Report task', category: 'Reporting', progress: 50 });

  const res = await request(app)
    .get('/api/reports/summary')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.tasks.task_count, 1);
  assert.equal(res.body.tasks.avg_progress, 50);
});