// routes/admin.js - everything here is mounted at /api/admin and is admin-only
const express = require('express');
const { requireAdmin } = require('./auth');
const router = express.Router();

router.use(requireAdmin); // protects every route below

// GET /api/admin/dashboard - totals
router.get('/dashboard', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const [[u]] = await db.query('SELECT COUNT(*) AS n FROM users');
    const [[e]] = await db.query('SELECT COUNT(*) AS n FROM events');
    const [[r]] = await db.query('SELECT COUNT(*) AS n FROM registrations');
    const [[a]] = await db.query('SELECT COUNT(*) AS n FROM attendance');
    const [[f]] = await db.query('SELECT COUNT(*) AS n FROM feedback');
    res.json({ users: u.n, events: e.n, registrations: r.n, attendance: a.n, feedback: f.n });
  } catch (err) { next(err); }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query('SELECT user_id, name, email, phone, role, created_at FROM users ORDER BY user_id');
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id - update user information
router.put('/users/:id', async (req, res, next) => {
  try {
    const { name, phone, role } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!['attendee', 'admin'].includes(role)) return res.status(400).json({ message: 'Role must be attendee or admin' });
    if (phone && !/^[0-9]{10}$/.test(phone)) return res.status(400).json({ message: 'Phone must be 10 digits' });
    await req.app.locals.db.query('UPDATE users SET name = ?, phone = ?, role = ? WHERE user_id = ?',
      [name, phone || null, role, req.params.id]);
    res.json({ message: 'User updated' });
  } catch (err) { next(err); }
});

// GET /api/admin/registrations
router.get('/registrations', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT r.registration_id, r.registration_date, r.status, u.name AS user_name, u.email, e.name AS event_name
      FROM registrations r JOIN users u ON r.user_id = u.user_id JOIN events e ON r.event_id = e.event_id
      ORDER BY r.registration_date DESC, r.registration_id DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/admin/attendance
router.get('/attendance', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT a.attendance_id, a.checkin_time, a.status, u.name AS user_name, e.name AS event_name
      FROM attendance a
      JOIN registrations r ON a.registration_id = r.registration_id
      JOIN users u ON r.user_id = u.user_id JOIN events e ON r.event_id = e.event_id
      ORDER BY a.checkin_time DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/admin/feedback
router.get('/feedback', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT f.feedback_id, f.rating, f.comment, f.created_at, u.name AS user_name, e.name AS event_name
      FROM feedback f JOIN users u ON f.user_id = u.user_id JOIN events e ON f.event_id = e.event_id
      ORDER BY f.created_at DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/admin/reports - one row per event
router.get('/reports', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT e.event_id, e.name, e.event_date, e.capacity,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id AND r.status = 'registered') AS registered,
        (SELECT COUNT(*) FROM attendance a JOIN registrations r ON a.registration_id = r.registration_id WHERE r.event_id = e.event_id) AS attended,
        (SELECT COUNT(*) FROM feedback f WHERE f.event_id = e.event_id) AS feedback_count,
        (SELECT ROUND(AVG(f.rating), 1) FROM feedback f WHERE f.event_id = e.event_id) AS avg_rating
      FROM events e ORDER BY e.event_date`);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/admin/notifications  { user_id (a number or "all"), title, message }
router.post('/notifications', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { user_id, title, message } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });
    if (user_id === 'all') {
      await db.query("INSERT INTO notifications (user_id, title, message) SELECT user_id, ?, ? FROM users WHERE role = 'attendee'", [title, message]);
    } else {
      const [u] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [user_id]);
      if (u.length === 0) return res.status(404).json({ message: 'User not found' });
      await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [user_id, title, message]);
    }
    res.json({ message: 'Notification sent' });
  } catch (err) { next(err); }
});

module.exports = router;
