// routes/auth.js - register, login, logout, profile
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Middleware: only logged-in users can pass
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: 'Please login first' });
  next();
}
// Middleware: only admins can pass (protects admin routes)
function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: 'Please login first' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ message: 'Admin access only' });
  next();
}

// POST /api/register
router.post('/register', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email' });
    if (phone && !/^[0-9]{10}$/.test(phone)) return res.status(400).json({ message: 'Phone must be 10 digits' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ message: 'This email is already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'attendee')",
      [name.trim(), email.trim(), phone || null, hash]
    );
    await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [result.insertId, 'Welcome to EventEase', 'Your account is ready. Browse events and register!']);
    res.json({ message: 'Account created. Please login.' });
  } catch (err) { next(err); }
});

// POST /api/login
router.post('/login', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Wrong email or password' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Wrong email or password' });

    req.session.user = { user_id: user.user_id, name: user.name, email: user.email, role: user.role };
    res.json({ message: 'Login successful', user: req.session.user });
  } catch (err) { next(err); }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// GET /api/me - who is logged in? (user is null for guests)
router.get('/me', async (req, res, next) => {
  try {
    if (!req.session.user) return res.json({ user: null });
    const db = req.app.locals.db;
    const [rows] = await db.query('SELECT user_id, name, email, phone, role, created_at FROM users WHERE user_id = ?', [req.session.user.user_id]);
    res.json({ user: rows[0] || null });
  } catch (err) { next(err); }
});

// PUT /api/profile - update own name, phone and (optionally) password
router.put('/profile', requireLogin, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { name, phone, password } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (phone && !/^[0-9]{10}$/.test(phone)) return res.status(400).json({ message: 'Phone must be 10 digits' });
    await db.query('UPDATE users SET name = ?, phone = ? WHERE user_id = ?', [name.trim(), phone || null, req.session.user.user_id]);
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hash, req.session.user.user_id]);
    }
    req.session.user.name = name.trim();
    res.json({ message: 'Profile updated' });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.requireLogin = requireLogin;
module.exports.requireAdmin = requireAdmin;
