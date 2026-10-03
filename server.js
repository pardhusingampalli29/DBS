// server.js - starting point of the EventEase application
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();

// 1. MySQL connection pool (credentials come from the .env file, never from the frontend)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true // return DATE/TIME as plain text like "2026-11-12"
});
app.locals.db = db; // route files use req.app.locals.db

// 2. Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 } // login lasts 2 hours
}));
app.use(express.static(path.join(__dirname, 'public'))); // serves the HTML/CSS/JS files

// 3. API routes
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/events'));
app.use('/api', require('./routes/registrations'));
app.use('/api', require('./routes/attendance'));
app.use('/api', require('./routes/feedback'));
app.use('/api', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// 4. Unknown API route and error handling
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error. Please try again.' });
});

// 5. Sample users in database.sql have plain-text passwords.
//    On start-up we replace them with bcrypt hashes (hashes always start with "$2").
async function hashSamplePasswords() {
  const [users] = await db.query("SELECT user_id, password FROM users WHERE password NOT LIKE '$2%'");
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hash, u.user_id]);
  }
  if (users.length > 0) console.log(`Hashed ${users.length} sample password(s) with bcrypt.`);
}

// 6. Start server. If the port is busy, try the next one and print the link.
const START_PORT = parseInt(process.env.PORT) || 3000;

function startServer(port) {
  const server = app.listen(port);

  server.on('listening', () => {
    console.log('');
    console.log('EventEase is running. Open this link:');
    console.log(`http://localhost:${port}`);
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}

db.query('SELECT 1')
  .then(hashSamplePasswords)
  .then(() => startServer(START_PORT))
  .catch(err => {
    console.error('Could not connect to MySQL. Check your .env file and make sure MySQL is running.');
    console.error(err.message);
  });