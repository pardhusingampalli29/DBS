import React from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button, EventCard, Field, PageTitle } from './components';
import { colors as c } from './data';

const page = { padding: 20, paddingBottom: 36 };

export function LoginScreen({ register, values, setValues, onLogin, onDemo, onOrganizer, onRegister }) {
  const field = (name, secure, type) => <Field key={name} label={name} value={values[name] || ''}
    onChangeText={text => setValues({ ...values, [name]: text })} secure={secure} keyboardType={type} />;
  return <ScrollView contentContainerStyle={[page, { flexGrow: 1, justifyContent: 'center' }]}>
    <Text style={{ fontSize: 32, fontWeight: '900', color: c.ink }}>{register ? 'Create account' : 'Welcome back'}</Text>
    <Text style={{ color: c.muted, marginTop: 8, marginBottom: 22 }}>Your events, your way.</Text>
    {register && field('Name')}{register && field('Phone', false, 'phone-pad')}
    {field('Email', false, 'email-address')}{field('Password', true)}
    {register && field('Confirm password', true)}
    <Button title={register ? 'Create account' : 'Sign in'} onPress={register ? onLogin : () => onLogin(values.Email, values.Password)} />
    {!register && <Button title="Continue with demo attendee" secondary onPress={onDemo} style={{ marginTop: 10 }} />}
    {!register && <TouchableOpacity onPress={() => Alert.alert('Password reset', 'Ask your event organizer to reset your password.')} style={{ padding: 14 }}><Text style={{ textAlign: 'center', color: c.blue }}>Forgot password?</Text></TouchableOpacity>}
    <TouchableOpacity onPress={onOrganizer} style={{ padding: 8 }}><Text style={{ textAlign: 'center', color: c.muted }}>Organizer login</Text></TouchableOpacity>
    <TouchableOpacity onPress={onRegister}><Text style={{ textAlign: 'center', color: c.blue, padding: 8 }}>{register ? 'Back to sign in' : 'Create an account'}</Text></TouchableOpacity>
  </ScrollView>;
}

export function HomeScreen({ events, user, openEvent, showEvents }) {
  return <ScrollView contentContainerStyle={page}>
    <PageTitle title={`Hi, ${user.name.split(' ')[0]} 👋`} subtitle="Make room for a little inspiration." />
    <TouchableOpacity onPress={showEvents} style={{ backgroundColor: c.navy, borderRadius: 18, padding: 20, marginBottom: 22 }}>
      <Text style={{ color: '#BBD0FF', fontWeight: '700' }}>YOUR CAMPUS, IN MOTION</Text>
      <Text style={{ color: c.white, fontSize: 22, fontWeight: '900', marginVertical: 9 }}>Big ideas start when you show up.</Text>
      <Text style={{ color: c.white }}>Explore events  →</Text>
    </TouchableOpacity>
    <PageTitle title="Featured events" />
    {events.filter(event => event.featured).map(event => <EventCard key={event.id} event={event} onPress={() => openEvent(event)} />)}
  </ScrollView>;
}

export function EventsScreen({ events, openEvent }) {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('All');
  const categories = ['All', 'Technology', 'Workshop', 'Culture'];
  const shown = events.filter(event => (category === 'All' || event.category === category)
    && `${event.name} ${event.venue}`.toLowerCase().includes(search.toLowerCase()));
  return <ScrollView contentContainerStyle={page}>
    <PageTitle title="Discover" subtitle="Find something worth showing up for." />
    <TextInput value={search} onChangeText={setSearch} placeholder="Search events or venues"
      style={{ backgroundColor: c.white, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 13, marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', marginBottom: 16 }}>{categories.map(item =>
      <TouchableOpacity key={item} onPress={() => setCategory(item)} style={{ padding: 9, paddingHorizontal: 12,
        borderRadius: 18, backgroundColor: category === item ? c.blue : c.white, marginRight: 6 }}>
        <Text style={{ color: category === item ? c.white : c.muted }}>{item}</Text>
      </TouchableOpacity>)}</View>
    {shown.map(event => <EventCard key={event.id} event={event} onPress={() => openEvent(event)} />)}
  </ScrollView>;
}

export function DetailScreen({ event, onRegister }) {
  return <ScrollView contentContainerStyle={page}>
    <Image source={{ uri: event.image }} style={{ height: 190, borderRadius: 18, marginBottom: 18 }} />
    <Text style={{ color: c.blue, fontWeight: '800' }}>{event.category.toUpperCase()}</Text>
    <PageTitle title={event.name} subtitle={event.description} />
    <Text style={{ color: c.ink, marginBottom: 8 }}>◷  {event.date} · {event.time}</Text>
    <Text style={{ color: c.ink, marginBottom: 17 }}>⌖  {event.venue}</Text>
    <PageTitle title="Speaker & schedule" />
    {(event.sessions.length ? event.sessions : [{ title: 'Welcome and registration', speaker: event.speaker, time: event.time, venue: event.venue }]).map((session, i) =>
      <View key={i} style={{ padding: 13, backgroundColor: c.white, borderRadius: 12, marginBottom: 8 }}>
        <Text style={{ color: c.ink, fontWeight: '700' }}>{session.title} · {session.time}</Text>
        <Text style={{ color: c.muted, marginTop: 4 }}>{session.speaker} · {session.venue}</Text>
      </View>)}
    <Button title="Register now" onPress={() => onRegister(event)} style={{ marginTop: 16 }} />
  </ScrollView>;
}

export function MyEventsScreen({ registrations, events, openPass, leaveFeedback }) {
  return <ScrollView contentContainerStyle={page}>
    <PageTitle title="My Events" subtitle="Your passes and plans in one place." />
    {registrations.length === 0 && <Text style={{ color: c.muted }}>You have no registrations yet. Browse Events to get started.</Text>}
    {registrations.map(reg => {
      const event = events.find(item => item.id === reg.eventId);
      if (!event) return null;
      return <View key={reg.registrationId} style={{ backgroundColor: c.white, padding: 14, borderRadius: 15, marginBottom: 12 }}>
        <Text style={{ color: c.ink, fontSize: 17, fontWeight: '800' }}>{event.name}</Text>
        <Text style={{ color: c.muted, marginVertical: 7 }}>{event.date} · {event.venue}</Text>
        <Text style={{ color: reg.checkIn ? c.green : c.blue, marginBottom: 10 }}>{reg.checkIn ? 'Checked in' : 'Registration confirmed'}</Text>
        <Button title="View QR pass" onPress={() => openPass(reg, event)} />
        <Button title="Leave feedback" secondary onPress={() => leaveFeedback(reg, event)} style={{ marginTop: 8 }} />
      </View>;
    })}
  </ScrollView>;
}

export function PassScreen({ registration, event, checkIn }) {
  return <View style={[page, { alignItems: 'center' }]}>
    <PageTitle title="Digital pass" subtitle={event.name} />
    <View style={{ backgroundColor: c.white, padding: 22, borderRadius: 18, alignItems: 'center' }}>
      <QRCode value={registration.registrationId} size={190} />
      <Text style={{ color: c.ink, fontWeight: '800', fontSize: 18, marginTop: 15 }}>{registration.registrationId}</Text>
      <Text style={{ color: c.muted, marginTop: 8 }}>{event.date} · {event.venue}</Text>
      <Text style={{ color: registration.checkIn ? c.green : c.blue, marginTop: 12 }}>{registration.checkIn ? 'Checked in' : 'Check-in pending'}</Text>
    </View>
    <Button title="Check in now" onPress={() => checkIn(registration)} style={{ width: '100%', marginTop: 18 }} />
  </View>;
}

export function FeedbackScreen({ event, rating, setRating, comment, setComment, submit }) {
  return <View style={page}>
    <PageTitle title="Event feedback" subtitle={event.name} />
    <Text style={{ color: c.ink, marginBottom: 10 }}>How was your experience?</Text>
    <View style={{ flexDirection: 'row', marginBottom: 18 }}>{[1, 2, 3, 4, 5].map(n =>
      <Text key={n} onPress={() => setRating(n)} style={{ color: n <= rating ? c.gold : c.border, fontSize: 37, marginRight: 5 }}>★</Text>)}</View>
    <TextInput value={comment} onChangeText={setComment} multiline placeholder="Share a comment"
      style={{ height: 120, backgroundColor: c.white, padding: 13, borderRadius: 12, textAlignVertical: 'top' }} />
    <Button title="Submit feedback" onPress={submit} style={{ marginTop: 14 }} />
  </View>;
}

export function NotificationsScreen({ notifications }) {
  return <ScrollView contentContainerStyle={page}>
    <PageTitle title="Notifications" subtitle="Event updates and reminders." />
    {notifications.map((notice, i) => <View key={i} style={{ backgroundColor: c.white, padding: 14, borderRadius: 13, marginBottom: 9 }}>
      <Text style={{ color: c.ink, fontWeight: '800' }}>{notice.title}</Text>
      <Text style={{ color: c.muted, marginTop: 5 }}>{notice.detail}</Text>
    </View>)}
  </ScrollView>;
}

export function ProfileScreen({ user, eventCount, showAdmin, logout }) {
  return <View style={page}>
    <PageTitle title="Profile" subtitle={user.email} />
    <Text style={{ color: c.ink, fontWeight: '700' }}>Name: {user.name}</Text>
    <Text style={{ color: c.muted, marginTop: 8 }}>Phone: {user.phone || 'Not provided'}</Text>
    <Text style={{ color: c.muted, marginTop: 8 }}>Registered events: {eventCount}</Text>
    <Button title="Organizer dashboard" secondary onPress={showAdmin} style={{ marginTop: 20 }} />
    <Button title="Sign out" secondary onPress={logout} style={{ marginTop: 10 }} />
  </View>;
}

export function AdminScreen({ events, summary, registrations, addEvent, editEvent, deleteEvent, announce, addSession, feedback }) {
  return <ScrollView contentContainerStyle={page}>
    <PageTitle title="Organizer dashboard" subtitle="Events, attendance, and feedback." />
    <Text style={{ color: c.ink, marginBottom: 16 }}>{summary.events} events · {summary.registrations} registrations · {summary.checkins} check-ins</Text>
    <Button title="Create sample event" onPress={addEvent} />
    {events.map(event => <View key={event.id} style={{ backgroundColor: c.white, padding: 13, borderRadius: 13, marginTop: 10 }}>
      <Text style={{ color: c.ink, fontWeight: '800' }}>{event.name}</Text>
      <Text style={{ color: c.muted, marginVertical: 7 }}>{event.date} · {event.venue}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={() => editEvent(event)}><Text style={{ color: c.blue, padding: 5 }}>Edit</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => addSession(event)}><Text style={{ color: c.blue, padding: 5 }}>Add session</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => announce(event)}><Text style={{ color: c.blue, padding: 5 }}>Announce</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => deleteEvent(event)}><Text style={{ color: '#B43D44', padding: 5 }}>Delete</Text></TouchableOpacity>
      </View>
    </View>)}
    <PageTitle title="Attendee registrations" />
    {registrations.map(reg => <Text key={reg.registrationId} style={{ color: c.ink, paddingVertical: 7 }}>{reg.registrationId} · {reg.checkIn ? 'Checked in' : 'Confirmed'}</Text>)}
    <PageTitle title="Recent feedback" />
    {feedback.map((item, index) => <Text key={index} style={{ color: c.ink, paddingVertical: 7 }}>★ {item.Rating}/5 · {item.Event_Name}: {item.Comment}</Text>)}
  </ScrollView>;
}

export function EventFormScreen({ event, save, cancel }) {
  const [values, setValues] = React.useState(event ? {
    name: event.name, description: event.description, date: event.Date || event.date,
    time: event.Time || event.time, venue: event.Venue || event.venue, category: event.Category || event.category,
  } : {});
  const change = (key, value) => setValues(current => ({ ...current, [key]: value }));
  return <ScrollView contentContainerStyle={page}>
    <TouchableOpacity onPress={cancel}><Text style={{ color: c.blue, marginBottom: 15 }}>‹ Back</Text></TouchableOpacity>
    <PageTitle title={event ? 'Edit event' : 'Create event'} subtitle="Add clear details for attendees." />
    {['name', 'description', 'date', 'time', 'venue', 'category'].map(key =>
      <Field key={key} label={key[0].toUpperCase() + key.slice(1)} value={values[key] || ''} onChangeText={value => change(key, value)} />)}
    <Button title="Save event" onPress={() => save(values)} />
  </ScrollView>;
}
