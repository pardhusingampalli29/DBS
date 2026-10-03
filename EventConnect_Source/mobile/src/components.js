import React from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors as c } from './data';

export function Button({ title, onPress, secondary = false, style }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[
      { backgroundColor: secondary ? c.white : c.blue, padding: 14, borderRadius: 13,
        alignItems: 'center', borderWidth: secondary ? 1 : 0, borderColor: c.border }, style,
    ]}>
      <Text style={{ color: secondary ? c.ink : c.white, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Field({ label, value, onChangeText, secure = false, keyboardType = 'default' }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: c.muted, marginBottom: 6, fontWeight: '600' }}>{label}</Text> : null}
      <TextInput value={value} onChangeText={onChangeText} secureTextEntry={secure}
        keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        placeholder={label} placeholderTextColor="#AAB4C3"
        style={{ backgroundColor: c.white, borderWidth: 1, borderColor: c.border,
          borderRadius: 12, padding: 13, color: c.ink }} />
    </View>
  );
}

export function EventCard({ event, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: c.white, borderRadius: 17,
      overflow: 'hidden', marginBottom: 13, borderWidth: 1, borderColor: c.border }}>
      <Image source={{ uri: event.image }} style={{ width: '100%', height: 145 }} />
      <View style={{ padding: 14 }}>
        <Text style={{ color: c.blue, fontSize: 11, fontWeight: '800' }}>{event.category.toUpperCase()}</Text>
        <Text style={{ color: c.ink, fontSize: 17, fontWeight: '800', marginTop: 5 }}>{event.name}</Text>
        <Text style={{ color: c.muted, marginTop: 7 }}>{event.date} · {event.time}</Text>
        <Text style={{ color: c.muted, marginTop: 4 }}>{event.venue}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function PageTitle({ title, subtitle }) {
  return <View style={{ marginBottom: 18 }}>
    <Text style={{ color: c.ink, fontSize: 25, fontWeight: '900' }}>{title}</Text>
    {subtitle ? <Text style={{ color: c.muted, marginTop: 4 }}>{subtitle}</Text> : null}
  </View>;
}
