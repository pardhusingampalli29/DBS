// Local sample content keeps the app useful before the API is started.
export const events = [
  {
    id: 1,
    name: 'Tech Fest 2026',
    category: 'Technology',
    date: 'Nov 14, 2026',
    time: '9:00 AM',
    venue: 'Innovation Hall · North Campus',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000',
    description: 'A full day of ideas, demos, and hands-on experiences from student innovators.',
    speaker: 'Dr. Maya Chen',
    featured: true,
    sessions: [{ title: 'Opening keynote', speaker: 'Dr. Maya Chen', time: '9:30 AM', venue: 'Main Stage' }],
  },
  {
    id: 2,
    name: 'AI & Machine Learning Workshop',
    category: 'Workshop',
    date: 'Nov 20, 2026',
    time: '10:30 AM',
    venue: 'Crescent Labs · Room 204',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1000',
    description: 'Learn machine learning with expert-led talks, real datasets, and guided labs.',
    speaker: 'Dr. Neha Kapoor',
    featured: true,
    sessions: [{ title: 'From data to decisions', speaker: 'Dr. Neha Kapoor', time: '10:30 AM', venue: 'Room 204' }],
  },
  {
    id: 3,
    name: 'Hackathon 2026',
    category: 'Technology',
    date: 'Dec 05, 2026',
    time: '8:00 AM',
    venue: 'Student Commons',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1000',
    description: 'Turn a bold idea into a working prototype in a weekend of teamwork.',
    speaker: 'Campus Developer Club',
    featured: false,
    sessions: [],
  },
  {
    id: 4,
    name: 'Cultural Fest 2026',
    category: 'Culture',
    date: 'Dec 12, 2026',
    time: '4:00 PM',
    venue: 'Central Green',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1000',
    description: 'Celebrate music, dance, food, and art from across the campus community.',
    speaker: 'Student Cultural Council',
    featured: false,
    sessions: [],
  },
];

export const sampleRegistrations = [
  { registrationId: 'EC-26-A4D82F', eventId: 1, checkIn: false },
];

export const sampleNotifications = [
  { title: 'Your Tech Fest pass is ready', detail: 'Registration confirmed · Nov 14' },
  { title: 'Welcome to EventConnect', detail: 'Find your next campus experience.' },
];

export const colors = {
  blue: '#155EEF', navy: '#102A56', ink: '#14233B', muted: '#7B8799',
  background: '#F5F8FC', white: '#FFFFFF', border: '#E8EDF4', paleBlue: '#EAF1FF',
  green: '#15805D', gold: '#F5A524',
};
