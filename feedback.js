// routes/feedback.js - ratings and comments
const express = require('express');
const { requireLogin } = require('./auth');
const router = express.Router();

// POST /api/feedback  { event_id, rating, comment }
router.post('/feedback', requireLogin, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const uid = req.session.user.user_id;
    const eventId = parseInt(req.body.event_id);
    const rating = parseInt(req.body.rating);
    const comment = (req.body.comment || '').trim();
    if (!eventId) return res.status(400).json({ message: 'Please choose an event' });
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    // Feedback is allowed only after the user has checked in
    const [attended] = await db.query(`
      SELECT a.attendance_id FROM attendance a JOIN registrations r ON a.registration_id = r.registration_id
      WHERE r.user_id = ? AND r.event_id = ?`, [uid, eventId]);
    if (attended.length === 0) return res.status(403).json({ message: 'You can give feedback only after checking in to the event' });

    const [given] = await db.query('SELECT feedback_id FROM feedback WHERE user_id = ? AND event_id = ?', [uid, eventId]);
    if (given.length > 0) return res.status(409).json({ message: 'You have already given feedback for this event' });

    await db.query('INSERT INTO feedback (user_id, event_id, rating, comment) VALUES (?, ?, ?, ?)', [uid, eventId, rating, comment]);
    res.json({ message: 'Thank you for your feedback!' });
  } catch (err) { next(err); }
});

// GET /api/feedback/my - events the user attended, with the rating if already given
router.get('/feedback/my', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT e.event_id, e.name, e.event_date, f.rating, f.comment
      FROM attendance a
      JOIN registrations r ON a.registration_id = r.registration_id
      JOIN events e ON r.event_id = e.event_id
      LEFT JOIN feedback f ON f.event_id = e.event_id AND f.user_id = r.user_id
      WHERE r.user_id = ? ORDER BY e.event_date DESC`, [req.session.user.user_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/feedback/event/:eventId
router.get('/feedback/event/:eventId', async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT f.rating, f.comment, f.created_at, u.name FROM feedback f
      JOIN users u ON f.user_id = u.user_id WHERE f.event_id = ? ORDER BY f.created_at DESC`, [req.params.eventId]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
