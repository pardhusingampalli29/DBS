// routes/events.js - events and sessions
const express = require('express');
const { requireAdmin } = require('./auth');
const router = express.Router();

// Base query: event + organizer name + seats still available
const EVENT_SQL = `
  SELECT e.*, u.name AS organizer,
    e.capacity - (SELECT COUNT(*) FROM registrations r
                  WHERE r.event_id = e.event_id AND r.status = 'registered') AS available_seats
  FROM events e LEFT JOIN users u ON e.created_by = u.user_id`;

function checkEvent(b) {
  if (!b.name || !b.category || !b.event_date || !b.start_time || !b.end_time || !b.venue || !b.capacity)
    return 'Please fill all event fields';
  if (parseInt(b.capacity) < 1) return 'Capacity must be at least 1';
  if (b.end_time <= b.start_time) return 'End time must be after start time';
  return null;
}
function checkSession(b) {
  if (!b.event_id || !b.title || !b.start_time || !b.end_time) return 'Event, title, start time and end time are required';
  if (b.end_time <= b.start_time) return 'End time must be after start time';
  return null;
}

// GET /api/events?q=&category=&date=&venue=
router.get('/events', async (req, res, next) => {
  try {
    const { q, category, date, venue } = req.query;
    let sql = EVENT_SQL + ' WHERE 1=1';
    const params = [];
    if (q) { sql += ' AND (e.name LIKE ? OR e.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (category) { sql += ' AND e.category = ?'; params.push(category); }
    if (date) { sql += ' AND e.event_date = ?'; params.push(date); }
    if (venue) { sql += ' AND e.venue LIKE ?'; params.push(`%${venue}%`); }
    sql += ' ORDER BY e.event_date, e.start_time';
    const [rows] = await req.app.locals.db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/sessions/popular - sessions of the events with most registrations
router.get('/sessions/popular', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT s.*, e.name AS event_name, e.event_date,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id AND r.status = 'registered') AS registered_count
      FROM sessions s JOIN events e ON s.event_id = e.event_id
      WHERE e.event_date >= CURDATE()
      ORDER BY registered_count DESC, e.event_date LIMIT 4`);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/sessions - all sessions (used by admin page)
router.get('/sessions', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT s.*, e.name AS event_name FROM sessions s
      JOIN events e ON s.event_id = e.event_id ORDER BY e.event_date, s.start_time`);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/events/:id
router.get('/events/:id', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(EVENT_SQL + ' WHERE e.event_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Event not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/events/:id/sessions
router.get('/events/:id/sessions', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query('SELECT * FROM sessions WHERE event_id = ? ORDER BY start_time', [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/events (admin)
router.post('/events', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body;
    const error = checkEvent(b);
    if (error) return res.status(400).json({ message: error });
    await req.app.locals.db.query(
      `INSERT INTO events (name, description, category, event_date, start_time, end_time, venue, capacity, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.name, b.description || '', b.category, b.event_date, b.start_time, b.end_time, b.venue, b.capacity, req.session.user.user_id]);
    res.json({ message: 'Event created' });
  } catch (err) { next(err); }
});

// PUT /api/events/:id (admin) - also notifies registered users if the venue changed
router.put('/events/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const b = req.body;
    const error = checkEvent(b);
    if (error) return res.status(400).json({ message: error });
    const [old] = await db.query('SELECT venue FROM events WHERE event_id = ?', [req.params.id]);
    if (old.length === 0) return res.status(404).json({ message: 'Event not found' });

    await db.query(
      `UPDATE events SET name=?, description=?, category=?, event_date=?, start_time=?, end_time=?, venue=?, capacity=?
       WHERE event_id = ?`,
      [b.name, b.description || '', b.category, b.event_date, b.start_time, b.end_time, b.venue, b.capacity, req.params.id]);

    if (old[0].venue !== b.venue) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message)
         SELECT user_id, 'Venue updated', ? FROM registrations WHERE event_id = ? AND status = 'registered'`,
        [`Event venue has been updated for ${b.name}. New venue: ${b.venue}`, req.params.id]);
    }
    res.json({ message: 'Event updated' });
  } catch (err) { next(err); }
});

// DELETE /api/events/:id (admin) - sessions, registrations etc. are removed by ON DELETE CASCADE
router.delete('/events/:id', requireAdmin, async (req, res, next) => {
  try {
    await req.app.locals.db.query('DELETE FROM events WHERE event_id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) { next(err); }
});

// POST /api/sessions (admin)
router.post('/sessions', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body;
    const error = checkSession(b);
    if (error) return res.status(400).json({ message: error });
    await req.app.locals.db.query(
      'INSERT INTO sessions (event_id, title, speaker, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?)',
      [b.event_id, b.title, b.speaker || '', b.start_time, b.end_time, b.room || '']);
    res.json({ message: 'Session created' });
  } catch (err) { next(err); }
});

// PUT /api/sessions/:id (admin)
router.put('/sessions/:id', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body;
    const error = checkSession(b);
    if (error) return res.status(400).json({ message: error });
    await req.app.locals.db.query(
      'UPDATE sessions SET event_id=?, title=?, speaker=?, start_time=?, end_time=?, room=? WHERE session_id=?',
      [b.event_id, b.title, b.speaker || '', b.start_time, b.end_time, b.room || '', req.params.id]);
    res.json({ message: 'Session updated' });
  } catch (err) { next(err); }
});

// DELETE /api/sessions/:id (admin)
router.delete('/sessions/:id', requireAdmin, async (req, res, next) => {
  try {
    await req.app.locals.db.query('DELETE FROM sessions WHERE session_id = ?', [req.params.id]);
    res.json({ message: 'Session deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
