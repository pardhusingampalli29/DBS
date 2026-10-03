// routes/notifications.js
const express = require('express');
const { requireLogin } = require('./auth');
const router = express.Router();

// GET /api/notifications
router.get('/notifications', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await req.app.locals.db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, notification_id DESC',
      [req.session.user.user_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', requireLogin, async (req, res, next) => {
  try {
    await req.app.locals.db.query('UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [req.params.id, req.session.user.user_id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
