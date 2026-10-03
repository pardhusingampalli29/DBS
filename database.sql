-- =====================================================
-- EventEase : Event Management for Attendee Self-Service
-- Run this whole file once in MySQL.
--
-- RELATIONSHIPS
--  users 1 --- * events          (an admin creates many events)
--  events 1 --- * sessions       (an event has many sessions)
--  users * --- * events          (through REGISTRATIONS: many users register for many events)
--  registrations 1 --- 0..1 attendance  (a registration is checked in once)
--  users * --- * events          (through FEEDBACK: a user rates an event once)
--  users 1 --- * notifications   (a user receives many notifications)
-- =====================================================

DROP DATABASE IF EXISTS event_management;
CREATE DATABASE event_management;
USE event_management;

-- 1. USERS
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(15),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'attendee',   -- 'attendee' or 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. EVENTS (created_by -> users)
CREATE TABLE events (
  event_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue VARCHAR(150) NOT NULL,
  capacity INT NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 3. SESSIONS (event_id -> events)
CREATE TABLE sessions (
  session_id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  speaker VARCHAR(100),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(100),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- 4. REGISTRATIONS (links users and events; one registration per user per event)
CREATE TABLE registrations (
  registration_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'registered',  -- 'registered' or 'cancelled'
  UNIQUE (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- 5. ATTENDANCE (registration_id -> registrations)
CREATE TABLE attendance (
  attendance_id INT PRIMARY KEY AUTO_INCREMENT,
  registration_id INT NOT NULL UNIQUE,
  checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'present',
  FOREIGN KEY (registration_id) REFERENCES registrations(registration_id) ON DELETE CASCADE
);

-- 6. FEEDBACK (links users and events; one feedback per user per event)
CREATE TABLE feedback (
  feedback_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, event_id),
  CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- 7. NOTIFICATIONS (user_id -> users)
CREATE TABLE notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =====================================================
-- SAMPLE DATA
-- Passwords below are plain text on purpose: server.js converts them to
-- bcrypt hashes automatically the first time you run "node server.js".
--   admin@eventease.com  -> admin123
--   all attendees        -> password123
-- =====================================================
INSERT INTO users (name, email, phone, password, role) VALUES
('Admin Rao',      'admin@eventease.com',  '9000000001', 'admin123',    'admin'),
('Ananya Sharma',  'ananya@example.com',   '9876543210', 'password123', 'attendee'),
('Rahul Verma',    'rahul@example.com',    '9876543211', 'password123', 'attendee'),
('Priya Reddy',    'priya@example.com',    '9876543212', 'password123', 'attendee'),
('Kiran Kumar',    'kiran@example.com',    '9876543213', 'password123', 'attendee'),
('Sneha Patel',    'sneha@example.com',    '9876543214', 'password123', 'attendee');

INSERT INTO events (name, description, category, event_date, start_time, end_time, venue, capacity, created_by) VALUES
('Tech Fest 2026', 'Technical fest with coding contests, project expo and robotics demos for engineering students.', 'Technical', '2026-11-12', '09:00:00', '17:00:00', 'JNTUH Convention Centre, Kukatpally, Hyderabad', 300, 1),
('AI & Machine Learning Workshop', 'Hands-on workshop on Python, machine learning basics and building your first model.', 'Workshop', '2026-10-24', '10:00:00', '16:00:00', 'IIIT Hyderabad Lecture Hall, Gachibowli', 80, 1),
('Web Development Bootcamp', 'Learn HTML, CSS, JavaScript and Node.js by building a real website in one day.', 'Workshop', '2026-09-27', '09:30:00', '16:30:00', 'CBIT Seminar Hall, Gandipet, Hyderabad', 100, 1),
('Entrepreneurship Summit', 'Talks and panel discussions with founders and investors about starting up from campus.', 'Business', '2026-12-05', '10:00:00', '15:00:00', 'T-Hub, Raidurg, Hyderabad', 150, 1),
('Cyber Security Awareness Program', 'Learn how to stay safe online: phishing, password safety and basics of ethical hacking.', 'Seminar', '2026-09-20', '11:00:00', '14:00:00', 'Osmania University Arts College Auditorium', 120, 1);

INSERT INTO sessions (event_id, title, speaker, start_time, end_time, room) VALUES
(1, 'Inauguration and Keynote',      'Dr. S. Murthy',      '09:00:00', '10:00:00', 'Main Auditorium'),
(1, 'Competitive Coding Contest',    'Team CodeClub',      '10:30:00', '13:00:00', 'Computer Lab 1'),
(1, 'Robotics Demo',                 'Ravi Teja',          '14:00:00', '15:30:00', 'Hall B'),
(2, 'Python for Machine Learning',   'Dr. Meera Nair',     '10:00:00', '12:00:00', 'Room 101'),
(2, 'Build Your First ML Model',     'Arjun Das',          '13:00:00', '16:00:00', 'Room 101'),
(3, 'HTML and CSS Basics',           'Sandeep Joshi',      '09:30:00', '11:30:00', 'Seminar Hall'),
(3, 'JavaScript and Node.js',        'Lakshmi Prasad',     '12:30:00', '16:30:00', 'Seminar Hall'),
(4, 'From Idea to Startup',          'Vikram Anand',       '10:00:00', '11:30:00', 'Hall A'),
(4, 'Funding 101 Panel',             'Panel of Investors', '12:00:00', '15:00:00', 'Hall A'),
(5, 'Phishing and Password Safety',  'Neha Kapoor',        '11:00:00', '12:30:00', 'Auditorium'),
(5, 'Intro to Ethical Hacking',      'Rohit Menon',        '12:30:00', '14:00:00', 'Auditorium');

INSERT INTO registrations (user_id, event_id, status) VALUES
(2, 1, 'registered'), (2, 2, 'registered'), (2, 3, 'registered'), (2, 5, 'registered'),
(3, 1, 'registered'), (3, 3, 'registered'),
(4, 2, 'registered'), (4, 4, 'registered'), (4, 5, 'registered'),
(5, 1, 'registered'), (5, 3, 'cancelled'),
(6, 4, 'registered');

-- registration_id 3 = Ananya/Web Bootcamp, 4 = Ananya/Cyber, 6 = Rahul/Web Bootcamp, 9 = Priya/Cyber
INSERT INTO attendance (registration_id, status) VALUES
(3, 'present'), (4, 'present'), (6, 'present'), (9, 'present');

INSERT INTO feedback (user_id, event_id, rating, comment) VALUES
(2, 3, 5, 'Very practical bootcamp. I built my first website!'),
(3, 3, 4, 'Good content, the JavaScript part was a little fast.'),
(4, 5, 5, 'Great awareness session, very useful for every student.');

INSERT INTO notifications (user_id, title, message, is_read) VALUES
(2, 'Registration confirmed', 'Your registration for Tech Fest 2026 is confirmed.', FALSE),
(2, 'Workshop reminder', 'Workshop starts tomorrow at 10:00 AM.', FALSE),
(2, 'Venue updated', 'Event venue has been updated for AI & Machine Learning Workshop.', TRUE),
(3, 'Registration confirmed', 'Your registration for Tech Fest 2026 is confirmed.', FALSE),
(4, 'Registration confirmed', 'Your registration for Entrepreneurship Summit is confirmed.', TRUE),
(5, 'Registration confirmed', 'Your registration for Tech Fest 2026 is confirmed.', FALSE),
(6, 'Registration confirmed', 'Your registration for Entrepreneurship Summit is confirmed.', FALSE);
