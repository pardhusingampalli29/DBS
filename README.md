# EventEase - Event Management for Attendee Self-Service

## 1. Project title
**Event Management Mobile App for Attendee Self-Service** (web version, called *EventEase*)

## 2. Project objective
Let attendees find events, register, get a QR code, check in, view the schedule, receive notifications and give feedback on their own. Organizers (admins) manage events, sessions, users and see reports.

## 3. Technologies
| Part | Technology |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript (no framework) |
| Backend | Node.js + Express.js (REST-style routes) |
| Database | MySQL with `mysql2` |
| Login | `express-session` (session cookies) + `bcryptjs` (password hashing) |
| QR code | `qrcode` package |
| Config | `dotenv` (.env file) |

## 4. Features
**Attendee:** create account, login, browse/search/filter events, event details with sessions, register, cancel registration, registration history, dashboard, schedule, QR check-in, feedback (1-5 stars), notifications (read/unread), profile.
**Admin:** dashboard totals, create/update/delete events and sessions, update users, view registrations/attendance/feedback, send notifications, per-event reports.
**Rules:** no duplicate registration, "Event is full" check, one check-in per registration, one feedback per user per event (only after check-in).

## 5. Database tables (database `event_management`)
`users`, `events`, `sessions`, `registrations`, `attendance`, `feedback`, `notifications` (full SQL in `database/database.sql`).

## 6. ER relationship
```
USERS 1 ---< EVENTS            (created_by: an admin creates many events)
EVENTS 1 ---< SESSIONS         (an event has many sessions)
USERS  >---< EVENTS            through REGISTRATIONS (UNIQUE user_id + event_id)
REGISTRATIONS 1 ---0..1 ATTENDANCE   (one check-in per registration)
USERS  >---< EVENTS            through FEEDBACK (UNIQUE user_id + event_id)
USERS 1 ---< NOTIFICATIONS
```
Deleting an event also deletes its sessions, registrations, attendance and feedback (`ON DELETE CASCADE`).

## 7. Folder structure
```
event-management/
├── server.js            starts Express, DB connection, sessions
├── package.json
├── .env                 database password and secrets
├── database/database.sql
├── routes/              auth, events (+sessions), registrations, attendance, feedback, notifications, admin
├── public/              all HTML pages
│   ├── css/style.css
│   └── js/              main.js (shared helpers) + one script per feature
└── README.md
```

## 8. Installation steps
1. Install **Node.js** (LTS) from https://nodejs.org
2. Install **MySQL Community Server** from https://dev.mysql.com/downloads/mysql/ (remember the root password)

## 9. MySQL setup
- MySQL Workbench: File > Open SQL Script > choose `database/database.sql` > click the lightning icon.
- Or command line (from the project folder): `mysql -u root -p < database/database.sql`

Then open `.env` and set `DB_PASSWORD` to your MySQL root password.

## 10. How to run
```
npm install
node server.js
```
Open **http://localhost:3000**

## Demo logins
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@eventease.com | admin123 |
| Attendee | ananya@example.com | password123 |
| Attendee | rahul@example.com | password123 |

The sample users in `database.sql` have plain-text passwords. When the server starts it automatically replaces them with bcrypt hashes.

## API routes
Auth: `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`, `PUT /api/profile`
Events: `GET/POST /api/events`, `GET/PUT/DELETE /api/events/:id`, `GET /api/events/:id/sessions`
Sessions: `GET /api/sessions`, `GET /api/sessions/popular`, `POST /api/sessions`, `PUT/DELETE /api/sessions/:id`
Registrations: `POST /api/registrations`, `GET /api/registrations/my`, `GET /api/registrations/:id/qr`, `DELETE /api/registrations/:id`, `GET /api/dashboard`, `GET /api/schedule`
Attendance: `POST /api/checkin/:registrationId`, `GET /api/attendance/my`
Feedback: `POST /api/feedback`, `GET /api/feedback/my`, `GET /api/feedback/event/:eventId`
Notifications: `GET /api/notifications`, `PUT /api/notifications/:id/read`
Admin (admin only): `GET /api/admin/dashboard|users|registrations|attendance|feedback|reports`, `PUT /api/admin/users/:id`, `POST /api/admin/notifications`

## Security used
Parameterized queries (`?` placeholders), bcrypt password hashing, credentials in `.env`, session login, admin-only middleware on admin routes, input validation on server and forms, HTML escaping on the frontend.

## Troubleshooting
- *Could not connect to MySQL*: check `.env` password and that MySQL is running.
- *Port 3000 busy*: change `PORT` in `.env`.
