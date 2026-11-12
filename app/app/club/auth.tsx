import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { colors, radius, spacing } from '../../src/theme';

const CLUB_COLOR = '#C9A86A'; // Gold-Akzent für den Vereinsbereich

export default function ClubAuth() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const showError = (msg: string) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Fehler', msg);
  };

  const submit = async () => {
    if (!email || !password || (mode === 'register' && !name)) {
      showError('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }
    setLoading(true);
    try {
      const club =
        mode === 'register'
          ? await api.clubRegister({ name, email, password, city: city || undefined, phone: phone || undefined })
          : await api.clubLogin({ email, password });
      router.replace(`/club/manager?id=${club.id}`);
    } catch (e: any) {
      showError(String(e?.message ?? e).replace(/^API \d+: /, '').replace(/[{}"]|detail:/g, ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Pressable style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={s.badge}>
          <Ionicons name="business" size={28} color={CLUB_COLOR} />
        </View>
        <Text style={s.title}>{mode === 'register' ? 'Verein registrieren' : 'Vereins-Login'}</Text>
        <Text style={s.sub}>
          {mode === 'register'
            ? 'Bring deinen Verein auf den Marktplatz und empfange Buchungen.'
            : 'Melde dich mit den Zugangsdaten deines Vereins an.'}
        </Text>

        {/* Umschalter */}
        <View style={s.segment}>
          {(['register', 'login'] as const).map((m) => (
            <Pressable
              key={m}
              style={[s.segmentItem, mode === m && s.segmentActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[s.segmentText, mode === m && s.segmentTextActive]}>
                {m === 'register' ? 'Registrieren' : 'Anmelden'}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'register' && (
          <TextInput
            style={s.input} placeholder="Vereinsname *" placeholderTextColor={colors.textMuted}
            value={name} onChangeText={setName}
          />
        )}
        <TextInput
          style={s.input} placeholder="E-Mail *" placeholderTextColor={colors.textMuted}
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
        />
        <TextInput
          style={s.input} placeholder="Passwort *" placeholderTextColor={colors.textMuted}
          secureTextEntry value={password} onChangeText={setPassword}
        />
        {mode === 'register' && (
          <>
            <TextInput
              style={s.input} placeholder="Stadt" placeholderTextColor={colors.textMuted}
              value={city} onChangeText={setCity}
            />
            <TextInput
              style={s.input} placeholder="Telefon" placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad" value={phone} onChangeText={setPhone}
            />
          </>
        )}

        <Pressable style={[s.btn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text style={s.btnText}>{mode === 'register' ? 'Verein erstellen' : 'Anmelden'}</Text>
          )}
        </Pressable>

        <Text style={s.hint}>
          Nach der Registrierung kannst du Plätze anlegen und Stripe für Auszahlungen verbinden.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 60, maxWidth: 480, width: '100%', alignSelf: 'center' },
  back: {
    width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  badge: {
    width: 64, height: 64, borderRadius: radius.full, backgroundColor: `${CLUB_COLOR}22`,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: spacing.lg, lineHeight: 20 },
  segment: {
    flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: radius.full,
    padding: 4, marginBottom: spacing.lg,
  },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: radius.full, alignItems: 'center' },
  segmentActive: { backgroundColor: CLUB_COLOR },
  segmentText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: '#1A1A1A' },
  input: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12,
  },
  btn: {
    backgroundColor: CLUB_COLOR, borderRadius: radius.full, paddingVertical: 16,
    alignItems: 'center', marginTop: spacing.sm,
  },
  btnText: { color: '#1A1A1A', fontWeight: '800', fontSize: 16 },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
