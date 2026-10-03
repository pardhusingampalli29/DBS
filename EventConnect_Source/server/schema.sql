CREATE DATABASE IF NOT EXISTS eventconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eventconnect;

CREATE TABLE IF NOT EXISTS Users (
  User_ID INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(120) NOT NULL,
  Email VARCHAR(190) NOT NULL UNIQUE,
  Phone VARCHAR(30) NOT NULL,
  Password VARCHAR(255) NOT NULL,
  Role ENUM('attendee','admin') NOT NULL DEFAULT 'attendee',
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS Events (
  Event_ID INT AUTO_INCREMENT PRIMARY KEY,
  Event_Name VARCHAR(180) NOT NULL,
  Description TEXT NOT NULL,
  Date DATE NOT NULL,
  Time TIME NOT NULL,
  Venue VARCHAR(180) NOT NULL,
  Organizer_ID INT NOT NULL,
  Category VARCHAR(60) NOT NULL DEFAULT 'Community',
  Image_Url TEXT,
  Featured BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (Organizer_ID) REFERENCES Users(User_ID)
);
CREATE TABLE IF NOT EXISTS Sessions (
  Session_ID INT AUTO_INCREMENT PRIMARY KEY,
  Event_ID INT NOT NULL,
  Session_Title VARCHAR(180) NOT NULL,
  Speaker VARCHAR(140) NOT NULL,
  Time VARCHAR(60) NOT NULL,
  Venue VARCHAR(180) NOT NULL,
  FOREIGN KEY (Event_ID) REFERENCES Events(Event_ID) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS Registrations (
  Registration_ID VARCHAR(32) PRIMARY KEY,
  User_ID INT NOT NULL,
  Event_ID INT NOT NULL,
  Registration_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  Check_In_Status ENUM('not_checked_in','checked_in') NOT NULL DEFAULT 'not_checked_in',
  UNIQUE KEY unique_user_event (User_ID, Event_ID),
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE CASCADE,
  FOREIGN KEY (Event_ID) REFERENCES Events(Event_ID) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS Feedback (
  Feedback_ID INT AUTO_INCREMENT PRIMARY KEY,
  User_ID INT NOT NULL,
  Event_ID INT NOT NULL,
  Rating TINYINT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
  Comment TEXT,
  Submitted_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_feedback (User_ID, Event_ID),
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE CASCADE,
  FOREIGN KEY (Event_ID) REFERENCES Events(Event_ID) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS Notifications (
  Notification_ID INT AUTO_INCREMENT PRIMARY KEY,
  User_ID INT NOT NULL,
  Event_ID INT,
  Message TEXT NOT NULL,
  Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE CASCADE,
  FOREIGN KEY (Event_ID) REFERENCES Events(Event_ID) ON DELETE SET NULL
);

-- Development credentials: alex@eventconnect.demo / Demo123! ; admin@eventconnect.demo / Admin123!
INSERT IGNORE INTO Users (User_ID, Name, Email, Phone, Password, Role) VALUES
(1,'Alex Morgan','alex@eventconnect.demo','+1 555 014 8821','$2a$10$Auj7G0e8u9Ukz7WqDFTqZ.7C4OOrAbJdnI/Y.fvIJK2A6NDKy1Pyi','attendee'),
(2,'Event Team','admin@eventconnect.demo','+1 555 010 2026','$2a$10$P1o3Dpg8HEb7YpQ4Hkmf5e7X2kA5XQbsoHZGv4U4uXyNVGzqN5i12','admin');
INSERT IGNORE INTO Events (Event_ID,Event_Name,Description,Date,Time,Venue,Organizer_ID,Category,Image_Url,Featured) VALUES
(1,'Tech Fest 2026','A full day of ideas, demos and hands-on experiences from the brightest student innovators. Explore the future of technology across the campus.','2026-11-14','09:00','Innovation Hall · North Campus',2,'Technology','https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',1),
(2,'AI & Machine Learning Workshop','Build practical intuition for modern machine learning with expert-led sessions, real datasets and guided labs.','2026-11-20','10:30','Crescent Labs · Room 204',2,'Workshop','https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200',1),
(3,'Hackathon 2026','Forty-eight hours to turn a bold idea into a working prototype. Bring a team, find a challenge and make something that matters.','2026-12-05','08:00','Student Commons',2,'Technology','https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',0),
(4,'Cultural Fest 2026','Three stages, one campus. Celebrate music, dance, food and art with performances from across the student community.','2026-12-12','16:00','Central Green',2,'Culture','https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200',0),
(5,'Designing for Everyone','A lively design sprint on accessibility, inclusive research and building products that work for more people.','2026-11-27','13:00','Design Studio · Block C',2,'Design','https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200',0);
INSERT IGNORE INTO Sessions (Event_ID,Session_Title,Speaker,Time,Venue) VALUES
(1,'Opening keynote: What comes next?','Dr. Maya Chen','09:30 AM','Main Stage'),(1,'Student demo showcase','Tech Society','11:00 AM','Innovation Hall'),(1,'Building with responsible AI','Arjun Rao','02:00 PM','Studio 2'),
(2,'From data to decisions','Dr. Neha Kapoor','10:30 AM','Crescent Labs · Room 204'),(2,'Hands-on model lab','Priya Nair','01:00 PM','Crescent Labs · Room 204');
INSERT IGNORE INTO Registrations (Registration_ID,User_ID,Event_ID,Status,Check_In_Status) VALUES ('EC-26-A4D82F',1,1,'confirmed','not_checked_in'),('EC-26-B91C03',1,2,'confirmed','checked_in');
INSERT IGNORE INTO Notifications (User_ID,Event_ID,Message) VALUES (1,1,'Tech Fest 2026 registration confirmed. Your QR pass is ready.'),(1,2,'Workshop check-in is open. Head to Crescent Labs when you arrive.');
