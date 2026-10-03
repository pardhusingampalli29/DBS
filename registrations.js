// routes/registrations.js - register for events, QR code, dashboard data, schedule
const express = require('express');
const QRCode = require('qrcode');
const { requireLogin } = require('./auth');
const router = express.Router();

// POST /api/registrations  { event_id }
router.post('/registrations', requireLogin, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = req.session.user.user_id;
    const eventId = parseInt(req.body.event_id);
    if (!eventId) return res.status(400).json({ message: 'Event is required' });

    const [events] = await db.query('SELECT name, capacity FROM events WHERE event_id = ?', [eventId]);
    if (events.length === 0) return res.status(404).json({ message: 'Event not found' });

    // Duplicate check (the UNIQUE(user_id, event_id) constraint also protects us)
    const [existing] = await db.query('SELECT registration_id, status FROM registrations WHERE user_id = ? AND event_id = ?', [userId, eventId]);
    if (existing.length > 0 && existing[0].status === 'registered')
      return res.status(409).json({ message: 'Already registered for this event' });

    // Seat check
    const [[count]] = await db.query("SELECT COUNT(*) AS total FROM registrations WHERE event_id = ? AND status = 'registered'", [eventId]);
    if (count.total >= events[0].capacity) return res.status(400).json({ message: 'Event is full' });

    let registrationId;
    if (existing.length > 0) {
      // user cancelled earlier: activate the same row again
      registrationId = existing[0].registration_id;
      await db.query("UPDATE registrations SET status = 'registered', registration_date = NOW() WHERE registration_id = ?", [registrationId]);
    } else {
      const [result] = await db.query("INSERT INTO registrations (user_id, event_id, status) VALUES (?, ?, 'registered')", [userId, eventId]);
      registrationId = result.insertId;
    }
    await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [userId, 'Registration confirmed', `Your registration for ${events[0].name} is confirmed.`]);
    res.json({ message: 'Registration successful', registration_id: registrationId });
  } catch (err) { next(err); }
});

// GET /api/registrations/my - registration history of the logged-in user
router.get('/registrations/my', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT r.registration_id, r.status, r.registration_date,
             e.event_id, e.name, e.event_date, e.start_time, e.end_time, e.venue,
             a.checkin_time, a.status AS attendance_status
      FROM registrations r
      JOIN events e ON r.event_id = e.event_id
      LEFT JOIN attendance a ON a.registration_id = r.registration_id
      WHERE r.user_id = ?
      ORDER BY e.event_date`, [req.session.user.user_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/registrations/:id/qr - QR code image for one registration
router.get('/registrations/:id/qr', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(
      'SELECT registration_id, user_id, event_id FROM registrations WHERE registration_id = ? AND user_id = ?',
      [req.params.id, req.session.user.user_id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Registration not found' });
    const r = rows[0];
    const data = `registration_id:${r.registration_id}|user_id:${r.user_id}|event_id:${r.event_id}`;
    const qr = await QRCode.toDataURL(data, { width: 180, margin: 1 });
    res.json({ qr, data });
  } catch (err) { next(err); }
});

// DELETE /api/registrations/:id - cancel (we keep the row as history with status 'cancelled')
router.delete('/registrations/:id', requireLogin, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.query(`
      SELECT r.status, e.name, a.attendance_id FROM registrations r
      JOIN events e ON r.event_id = e.event_id
      LEFT JOIN attendance a ON a.registration_id = r.registration_id
      WHERE r.registration_id = ? AND r.user_id = ?`, [req.params.id, req.session.user.user_id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Registration not found' });
    if (rows[0].status === 'cancelled') return res.status(400).json({ message: 'Registration is already cancelled' });
    if (rows[0].attendance_id) return res.status(400).json({ message: 'You already attended this event' });
    await db.query("UPDATE registrations SET status = 'cancelled' WHERE registration_id = ?", [req.params.id]);
    await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [req.session.user.user_id, 'Registration cancelled', `Your registration for ${rows[0].name} was cancelled.`]);
    res.json({ message: 'Registration cancelled' });
  } catch (err) { next(err); }
});

// GET /api/dashboard - numbers and lists for the attendee dashboard
router.get('/dashboard', requireLogin, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const uid = req.session.user.user_id;
    const [[reg]] = await db.query("SELECT COUNT(*) AS n FROM registrations WHERE user_id = ? AND status = 'registered'", [uid]);
    const [[ses]] = await db.query(`
      SELECT COUNT(*) AS n FROM sessions s
      JOIN events e ON s.event_id = e.event_id
      JOIN registrations r ON r.event_id = e.event_id
      WHERE r.user_id = ? AND r.status = 'registered' AND e.event_date >= CURDATE()`, [uid]);
    const [[att]] = await db.query(`
      SELECT COUNT(*) AS n FROM attendance a
      JOIN registrations r ON a.registration_id = r.registration_id WHERE r.user_id = ?`, [uid]);
    const [[fb]] = await db.query('SELECT COUNT(*) AS n FROM feedback WHERE user_id = ?', [uid]);
    const [upcoming] = await db.query(`
      SELECT e.event_id, e.name, e.event_date, e.start_time, e.venue FROM registrations r
      JOIN events e ON r.event_id = e.event_id
      WHERE r.user_id = ? AND r.status = 'registered' AND e.event_date >= CURDATE()
      ORDER BY e.event_date LIMIT 5`, [uid]);
    const [notifications] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, notification_id DESC LIMIT 5', [uid]);
    res.json({
      registeredEvents: reg.n, upcomingSessions: ses.n, checkedIn: att.n, feedbackGiven: fb.n,
      upcoming, notifications
    });
  } catch (err) { next(err); }
});

// GET /api/schedule - sessions of all events the user registered for
router.get('/schedule', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT e.event_id, e.name AS event_name, e.event_date, e.venue,
             s.title, s.speaker, s.start_time, s.end_time, s.room
      FROM registrations r
      JOIN events e ON r.event_id = e.event_id
      LEFT JOIN sessions s ON s.event_id = e.event_id
      WHERE r.user_id = ? AND r.status = 'registered'
      ORDER BY e.event_date, s.start_time`, [req.session.user.user_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
