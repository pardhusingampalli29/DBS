// routes/attendance.js - QR check-in
const express = require('express');
const { requireLogin } = require('./auth');
const router = express.Router();

// POST /api/checkin/:registrationId
router.post('/checkin/:registrationId', requireLogin, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.query(`
      SELECT r.registration_id, r.status, e.name AS event_name FROM registrations r
      JOIN events e ON r.event_id = e.event_id
      WHERE r.registration_id = ? AND r.user_id = ?`, [req.params.registrationId, req.session.user.user_id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Registration not found' });
    if (rows[0].status !== 'registered') return res.status(400).json({ message: 'This registration is cancelled' });

    const [done] = await db.query('SELECT attendance_id FROM attendance WHERE registration_id = ?', [req.params.registrationId]);
    if (done.length > 0) return res.status(409).json({ message: 'Already checked in for this event' });

    await db.query("INSERT INTO attendance (registration_id, status) VALUES (?, 'present')", [req.params.registrationId]);
    const [saved] = await db.query('SELECT checkin_time FROM attendance WHERE registration_id = ?', [req.params.registrationId]);
    const [date, time] = saved[0].checkin_time.split(' ');
    res.json({ message: 'Check-in Successful', event_name: rows[0].event_name, date, time });
  } catch (err) { next(err); }
});

// GET /api/attendance/my
router.get('/attendance/my', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT a.attendance_id, a.checkin_time, a.status, e.event_id, e.name AS event_name, e.event_date, e.venue
      FROM attendance a
      JOIN registrations r ON a.registration_id = r.registration_id
      JOIN events e ON r.event_id = e.event_id
      WHERE r.user_id = ? ORDER BY a.checkin_time DESC`, [req.session.user.user_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
