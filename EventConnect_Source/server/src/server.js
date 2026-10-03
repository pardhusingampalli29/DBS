// Express handles HTTP requests. This file connects routes to MySQL.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eventconnect',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-this';

// Run a SQL statement with values separated from SQL to prevent injection.
async function query(sql, values = []) {
  const [rows] = await db.execute(sql, values);
  return rows;
}

function makeToken(user) {
  return jwt.sign({ id: user.User_ID, role: user.Role, name: user.Name }, jwtSecret, { expiresIn: '7d' });
}

function requireUser(requiredRole) {
  return (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      req.user = jwt.verify(token, jwtSecret);
      if (requiredRole && req.user.role !== requiredRole) {
        return res.status(403).json({ error: 'Organizer access required' });
      }
      next();
    } catch {
      res.status(401).json({ error: 'Please sign in to continue' });
    }
  };
}

function safeUser(user) {
  return { id: user.User_ID, name: user.Name, email: user.Email, phone: user.Phone, role: user.Role };
}

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

// Account registration and login
app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password || password.length < 8) {
    return res.status(400).json({ error: 'Name, email, phone and an 8-character password are required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO Users (Name, Email, Phone, Password) VALUES (?, ?, ?, ?)',
      [name, email.toLowerCase(), phone, hash],
    );
    const user = { User_ID: result.insertId, Name: name, Email: email.toLowerCase(), Phone: phone, Role: 'attendee' };
    res.status(201).json({ user: safeUser(user), token: makeToken(user) });
  } catch (error) {
    const duplicate = error.code === 'ER_DUP_ENTRY';
    res.status(duplicate ? 409 : 500).json({ error: duplicate ? 'Email already registered' : 'Could not create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    const [user] = await query('SELECT * FROM Users WHERE Email = ?', [email]);
    const correctPassword = user && await bcrypt.compare(req.body.password || '', user.Password);
    if (!correctPassword) return res.status(401).json({ error: 'Email or password is incorrect' });
    res.json({ user: safeUser(user), token: makeToken(user) });
  } catch {
    res.status(500).json({ error: 'Could not sign in' });
  }
});

// Public event list and details
app.get('/api/events', async (req, res) => {
  try {
    const search = `%${req.query.search || ''}%`;
    const events = await query(
      `SELECT e.*,
        (SELECT COUNT(*) FROM Registrations r WHERE r.Event_ID = e.Event_ID AND r.Status = 'confirmed') AS Attendee_Count
       FROM Events e WHERE e.Event_Name LIKE ? OR e.Category LIKE ? ORDER BY e.Featured DESC, e.Date`,
      [search, search],
    );
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Could not load events' });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const [event] = await query('SELECT * FROM Events WHERE Event_ID = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    event.sessions = await query('SELECT * FROM Sessions WHERE Event_ID = ? ORDER BY Session_ID', [req.params.id]);
    res.json(event);
  } catch {
    res.status(500).json({ error: 'Could not load event' });
  }
});

// Organizer event management
app.post('/api/events', requireUser('admin'), async (req, res) => {
  const { name, description, date, time, venue, category = 'Community', imageUrl, featured = false } = req.body;
  if (!name || !description || !date || !time || !venue) {
    return res.status(400).json({ error: 'Name, description, date, time and venue are required' });
  }
  try {
    const result = await query(
      `INSERT INTO Events (Event_Name, Description, Date, Time, Venue, Organizer_ID, Category, Image_Url, Featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, date, time, venue, req.user.id, category, imageUrl || null, Boolean(featured)],
    );
    res.status(201).json({ id: result.insertId });
  } catch {
    res.status(500).json({ error: 'Could not create event' });
  }
});

app.put('/api/events/:id', requireUser('admin'), async (req, res) => {
  const { name, description, date, time, venue, category } = req.body;
  try {
    await query(
      `UPDATE Events SET Event_Name = ?, Description = ?, Date = ?, Time = ?, Venue = ?, Category = ?
       WHERE Event_ID = ?`,
      [name, description, date, time, venue, category, req.params.id],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not update event' });
  }
});

app.delete('/api/events/:id', requireUser('admin'), async (req, res) => {
  try {
    await query('DELETE FROM Events WHERE Event_ID = ?', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not delete event' });
  }
});

app.post('/api/events/:id/sessions', requireUser('admin'), async (req, res) => {
  const { title, speaker, time, venue } = req.body;
  try {
    await query(
      'INSERT INTO Sessions (Event_ID, Session_Title, Speaker, Time, Venue) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, title, speaker, time, venue],
    );
    res.status(201).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not add session' });
  }
});

// Attendee registration, pass and feedback
app.get('/api/me/registrations', requireUser(), async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, e.Event_Name, e.Description, e.Date, e.Time, e.Venue, e.Image_Url, e.Category
       FROM Registrations r JOIN Events e ON e.Event_ID = r.Event_ID
       WHERE r.User_ID = ? AND r.Status = 'confirmed' ORDER BY e.Date`,
      [req.user.id],
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Could not load registrations' });
  }
});

app.post('/api/events/:id/register', requireUser(), async (req, res) => {
  const id = `EC-${new Date().getFullYear().toString().slice(-2)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  try {
    await query('INSERT INTO Registrations (Registration_ID, User_ID, Event_ID) VALUES (?, ?, ?)', [id, req.user.id, req.params.id]);
    res.status(201).json({ registrationId: id, status: 'confirmed' });
  } catch (error) {
    const duplicate = error.code === 'ER_DUP_ENTRY';
    res.status(duplicate ? 409 : 500).json({ error: duplicate ? 'You are already registered' : 'Could not register' });
  }
});

app.post('/api/registrations/:id/checkin', requireUser(), async (req, res) => {
  try {
    const result = await query(
      `UPDATE Registrations SET Check_In_Status = 'checked_in' WHERE Registration_ID = ? AND User_ID = ?`,
      [req.params.id, req.user.id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Registration not found' });
    res.json({ status: 'checked_in' });
  } catch {
    res.status(500).json({ error: 'Could not check in' });
  }
});

app.post('/api/events/:id/feedback', requireUser(), async (req, res) => {
  const rating = Number(req.body.rating);
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be from 1 to 5' });
  try {
    await query(
      `INSERT INTO Feedback (User_ID, Event_ID, Rating, Comment) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE Rating = VALUES(Rating), Comment = VALUES(Comment), Submitted_Date = CURRENT_TIMESTAMP`,
      [req.user.id, req.params.id, rating, req.body.comment || ''],
    );
    res.status(201).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not submit feedback' });
  }
});

app.get('/api/me/notifications', requireUser(), async (req, res) => {
  try {
    const rows = await query(
      `SELECT n.*, e.Event_Name FROM Notifications n LEFT JOIN Events e ON e.Event_ID = n.Event_ID
       WHERE n.User_ID = ? ORDER BY n.Date DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Could not load notifications' });
  }
});

// Organizer announcements and reports
app.post('/api/events/:id/announcements', requireUser('admin'), async (req, res) => {
  if (!req.body.message) return res.status(400).json({ error: 'Message is required' });
  try {
    await query(
      `INSERT INTO Notifications (User_ID, Event_ID, Message)
       SELECT User_ID, ?, ? FROM Registrations WHERE Event_ID = ? AND Status = 'confirmed'`,
      [req.params.id, req.body.message, req.params.id],
    );
    res.status(201).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not send announcement' });
  }
});

app.get('/api/admin/overview', requireUser('admin'), async (_req, res) => {
  try {
    const [counts] = await query(
      `SELECT (SELECT COUNT(*) FROM Events) AS events,
        (SELECT COUNT(*) FROM Registrations WHERE Status = 'confirmed') AS registrations,
        (SELECT COUNT(*) FROM Registrations WHERE Check_In_Status = 'checked_in') AS checkins`,
    );
    const attendees = await query(
      `SELECT r.Registration_ID, r.Status, r.Check_In_Status, u.Name, u.Email, e.Event_Name, e.Date
       FROM Registrations r JOIN Users u ON u.User_ID = r.User_ID
       JOIN Events e ON e.Event_ID = r.Event_ID ORDER BY r.Registration_Date DESC`,
    );
    res.json({ counts, attendees });
  } catch {
    res.status(500).json({ error: 'Could not load dashboard' });
  }
});

app.get('/api/admin/feedback', requireUser('admin'), async (_req, res) => {
  try {
    res.json(await query(
      `SELECT f.*, u.Name, e.Event_Name FROM Feedback f
       JOIN Users u ON u.User_ID = f.User_ID JOIN Events e ON e.Event_ID = f.Event_ID
       ORDER BY Submitted_Date DESC`,
    ));
  } catch {
    res.status(500).json({ error: 'Could not load feedback' });
  }
});

// Hash the documented demo passwords each time the seeded database is used.
async function prepareDemoPasswords() {
  const demoUsers = [
    ['alex@eventconnect.demo', 'Demo123!'],
    ['admin@eventconnect.demo', 'Admin123!'],
  ];
  for (const [email, password] of demoUsers) {
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE Users SET Password = ? WHERE Email = ?', [hash, email]);
  }
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`EventConnect API listening on port ${port}`));
prepareDemoPasswords().catch(error => {
  console.warn('Could not prepare demo accounts. Check MySQL settings and restart the API:', error.message);
});
