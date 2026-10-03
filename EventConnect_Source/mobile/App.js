import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { colors as c, events as sampleEvents, sampleNotifications, sampleRegistrations } from './src/data';
import { post, request } from './src/api';
import { Button } from './src/components';
import {
  AdminScreen, DetailScreen, EventFormScreen, EventsScreen, FeedbackScreen, HomeScreen,
  LoginScreen, MyEventsScreen, NotificationsScreen, PassScreen, ProfileScreen,
} from './src/screens';

const tabs = ['Home', 'Events', 'My Events', 'Notifications', 'Profile'];
const icons = { Home: '⌂', Events: '▦', 'My Events': '▣', Notifications: '♧', Profile: '◉' };

function message(title, error) {
  Alert.alert(title, error.message || 'Please try again.');
}

export default function App() {
  const [screen, setScreen] = useState('app');
  const [tab, setTab] = useState('Home');
  const [user, setUser] = useState({ name: 'Alex Morgan', email: 'alex@eventconnect.demo', phone: '+1 555 014 8821', role: 'attendee' });
  const [token, setToken] = useState('');
  const [events, setEvents] = useState(sampleEvents);
  const [registrations, setRegistrations] = useState(sampleRegistrations);
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPass, setSelectedPass] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [adminFeedback, setAdminFeedback] = useState([]);
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [form, setForm] = useState({});
  const [report, setReport] = useState({ events: sampleEvents.length, registrations: 1, checkins: 0, attendees: [] });

  // Use database events when the API is running. Sample events remain as a fallback.
  useEffect(() => {
    request('/api/events').then(rows => {
      if (rows.length) setEvents(rows.map(row => ({
        ...row,
        id: row.Event_ID,
        name: row.Event_Name,
        category: row.Category,
        date: new Date(row.Date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: row.Time,
        venue: row.Venue,
        image: row.Image_Url || sampleEvents[0].image,
        description: row.Description,
        featured: Boolean(row.Featured),
        sessions: [],
      })));
    }).catch(() => {});
  }, []);

  async function signIn(email, password) {
    try {
      const result = await post('/api/auth/login', null, { email, password });
      setUser(result.user);
      setToken(result.token);
      setTab(result.user.role === 'admin' ? 'Admin' : 'Home');
      setScreen('app');
      if (result.user.role === 'attendee') loadAttendee(result.token);
      else loadAdmin(result.token);
    } catch (error) {
      if (email === 'alex@eventconnect.demo' && password === 'Demo123!') {
        setUser({ name: 'Alex Morgan', email, phone: '+1 555 014 8821', role: 'attendee' });
        setScreen('app');
        setTab('Home');
      } else message('Could not sign in', error);
    }
  }

  async function loadAttendee(authToken) {
    try {
      const [myEvents, myNotices] = await Promise.all([
        request('/api/me/registrations', authToken),
        request('/api/me/notifications', authToken),
      ]);
      setRegistrations(myEvents.map(row => ({
        ...row, registrationId: row.Registration_ID, eventId: row.Event_ID,
        checkIn: row.Check_In_Status === 'checked_in',
      })));
      setNotifications(myNotices.map(row => ({ title: row.Message, detail: row.Event_Name || '' })));
    } catch (error) { message('Could not load your account', error); }
  }

  async function loadAdmin(authToken = token) {
    try {
      const [result, feedbackRows] = await Promise.all([
        request('/api/admin/overview', authToken),
        request('/api/admin/feedback', authToken),
      ]);
      setReport({ ...result.counts, attendees: result.attendees });
      setAdminFeedback(feedbackRows);
    } catch (error) { message('Organizer sign-in required', error); }
  }

  async function registerForEvent(event) {
    if (registrations.some(item => item.eventId === event.id)) {
      Alert.alert('Already registered', 'This event is already in My Events.');
      return;
    }
    try {
      const result = token ? await post(`/api/events/${event.id}/register`, token) : {};
      const newPass = {
        registrationId: result.registrationId || `EC-26-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
        eventId: event.id,
        checkIn: false,
      };
      setRegistrations(current => [...current, newPass]);
      setSelectedPass(newPass);
      setNotifications(current => [{ title: `${event.name} registration confirmed`, detail: 'Your QR pass is ready.' }, ...current]);
      setScreen('success');
    } catch (error) { message('Registration failed', error); }
  }

  async function checkIn(registration) {
    try {
      if (token) await post(`/api/registrations/${registration.registrationId}/checkin`, token);
      setRegistrations(current => current.map(item => item.registrationId === registration.registrationId
        ? { ...item, checkIn: true } : item));
      setScreen('checked');
    } catch (error) { message('Check-in failed', error); }
  }

  async function submitFeedback() {
    try {
      if (token) await post(`/api/events/${selectedEvent.id}/feedback`, token, feedback);
      Alert.alert('Thank you', 'Your feedback has been saved.');
      setScreen('app');
      setTab('My Events');
    } catch (error) { message('Feedback could not be saved', error); }
  }

  async function createAccount() {
    if (!form.Name || !form.Email || !form.Phone || !form.Password) {
      Alert.alert('Complete your details', 'Fill in each field before creating your account.');
      return;
    }
    if (form.Password !== form['Confirm password']) {
      Alert.alert('Passwords do not match', 'Check both password fields.');
      return;
    }
    try {
      const result = await post('/api/auth/register', null, {
        name: form.Name, email: form.Email, phone: form.Phone, password: form.Password,
      });
      setUser(result.user);
      setToken(result.token);
      setScreen('app');
      setTab('Home');
      loadAttendee(result.token);
    } catch (error) { message('Account could not be created', error); }
  }

  function openEvent(event) {
    setSelectedEvent(event);
    setScreen('detail');
    request(`/api/events/${event.id}`).then(details => {
      const sessions = (details.sessions || []).map(session => ({
        title: session.Session_Title,
        speaker: session.Speaker,
        time: session.Time,
        venue: session.Venue,
      }));
      setSelectedEvent(current => current?.id === event.id ? { ...current, sessions } : current);
    }).catch(() => {});
  }

  function openFeedback(registration, event) {
    setSelectedEvent(event);
    setSelectedPass(registration);
    setFeedback({ rating: 5, comment: '' });
    setScreen('feedback');
  }

  function openLogin(asOrganizer = false) {
    setForm(asOrganizer ? { Email: 'admin@eventconnect.demo', Password: 'Admin123!' } : {});
    setScreen('login');
  }

  async function saveEvent(changes) {
    try {
      const isNew = !editingEvent;
      const url = isNew ? '/api/events' : `/api/events/${editingEvent.id}`;
      const result = await request(url, token, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify({ ...changes, category: changes.category || 'Community' }),
      });
      if (isNew) Alert.alert('Event created', `Event #${result.id} was added.`);
      else Alert.alert('Event updated', 'Your event changes have been saved.');
      const rows = await request('/api/events');
      setEvents(rows.map(row => ({ ...row, id: row.Event_ID, name: row.Event_Name,
        category: row.Category, date: row.Date, time: row.Time, venue: row.Venue,
        description: row.Description, image: row.Image_Url || sampleEvents[0].image, sessions: [] })));
      setScreen('app');
      setEditingEvent(null);
    } catch (error) { message('Event could not be saved', error); }
  }

  async function deleteEvent(event) {
    try {
      await request(`/api/events/${event.id}`, token, { method: 'DELETE' });
      setEvents(current => current.filter(item => item.id !== event.id));
    } catch (error) { message('Event could not be deleted', error); }
  }

  async function announce(event) {
    try {
      await post(`/api/events/${event.id}/announcements`, token, { message: `Update for ${event.name}: please check your event schedule.` });
      Alert.alert('Announcement sent', 'Registered attendees have been notified.');
    } catch (error) { message('Announcement could not be sent', error); }
  }

  async function addSession(event) {
    try {
      await post(`/api/events/${event.id}/sessions`, token, {
        title: 'Welcome and attendee check-in', speaker: 'Event team',
        time: event.time || '10:00 AM', venue: event.venue,
      });
      Alert.alert('Session added', 'The event schedule has been updated.');
    } catch (error) { message('Session could not be added', error); }
  }

  function startEventForm(event = null) {
    setEditingEvent(event);
    setScreen('eventForm');
  }

  function signOut() {
    setToken('');
    setUser({ name: 'Alex Morgan', email: 'alex@eventconnect.demo', phone: '+1 555 014 8821', role: 'attendee' });
    setTab('Home');
  }

  function renderScreen() {
    if (screen === 'login' || screen === 'register') {
      return <LoginScreen register={screen === 'register'} values={form} setValues={setForm}
        onDemo={() => signIn('alex@eventconnect.demo', 'Demo123!')}
        onOrganizer={() => openLogin(true)}
        onRegister={() => { setForm({}); setScreen(screen === 'register' ? 'login' : 'register'); }}
        onLogin={(email, password) => screen === 'register' ? createAccount() : signIn(email, password)} />;
    }
    if (screen === 'detail') return <DetailScreen event={selectedEvent} onRegister={registerForEvent} />;
    if (screen === 'pass') return <PassScreen registration={selectedPass} event={selectedEvent} checkIn={checkIn} />;
    if (screen === 'feedback') return <FeedbackScreen event={selectedEvent} rating={feedback.rating}
      setRating={rating => setFeedback({ ...feedback, rating })} comment={feedback.comment}
      setComment={comment => setFeedback({ ...feedback, comment })} submit={submitFeedback} />;
    if (screen === 'eventForm') return <EventFormScreen event={editingEvent} save={saveEvent} cancel={() => setScreen('app')} />;
    if (screen === 'success' || screen === 'checked') return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
      <Text style={{ color: c.green, fontSize: 54 }}>✓</Text>
      <Text style={{ color: c.ink, fontSize: 26, fontWeight: '900', marginVertical: 10 }}>{screen === 'success' ? 'Registration successful' : 'Check-in successful'}</Text>
      <Text style={{ color: c.muted, textAlign: 'center', marginBottom: 18 }}>{selectedEvent?.name || 'Your event'}</Text>
      <Button title={screen === 'success' ? 'View My Events' : 'Back to My Events'} onPress={() => { setScreen('app'); setTab('My Events'); }} />
    </View>;
    if (tab === 'Home') return <HomeScreen events={events} user={user} openEvent={openEvent} showEvents={() => setTab('Events')} />;
    if (tab === 'Events') return <EventsScreen events={events} openEvent={openEvent} />;
    if (tab === 'My Events') return <MyEventsScreen registrations={registrations} events={events}
      openPass={(registration, event) => { setSelectedPass(registration); setSelectedEvent(event); setScreen('pass'); }} leaveFeedback={openFeedback} />;
    if (tab === 'Notifications') return <NotificationsScreen notifications={notifications} />;
    if (tab === 'Admin') return <AdminScreen events={events} summary={report} feedback={adminFeedback} addSession={addSession} registrations={report.attendees.map(row => ({
      registrationId: row.Registration_ID, checkIn: row.Check_In_Status === 'checked_in',
    }))} addEvent={() => startEventForm()} editEvent={event => startEventForm(event)}
      deleteEvent={deleteEvent} announce={announce} />;
    return <ProfileScreen user={user} eventCount={registrations.length}
      showAdmin={() => { setTab('Admin'); if (user.role !== 'admin') openLogin(true); }} logout={signOut} />;
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
    <StatusBar barStyle="dark-content" backgroundColor={c.background} />
    <View style={{ flex: 1 }}>{renderScreen()}</View>
    {screen === 'app' && <View style={{ flexDirection: 'row', backgroundColor: c.white, borderTopWidth: 1,
      borderColor: c.border, paddingVertical: 9, justifyContent: 'space-around' }}>
      {(tab === 'Admin' ? ['Admin', 'Profile'] : tabs).map(item => <TouchableOpacity key={item} onPress={() => setTab(item)} style={{ alignItems: 'center' }}>
        <Text style={{ color: tab === item ? c.blue : c.muted, fontSize: 19 }}>{icons[item] || '▤'}</Text>
        <Text style={{ color: tab === item ? c.blue : c.muted, fontSize: 10 }}>{item}</Text>
      </TouchableOpacity>)}
    </View>}
  </SafeAreaView>;
}
