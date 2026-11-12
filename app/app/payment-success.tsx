import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api/client';
import { colors, radius, spacing } from '../src/theme';

export default function PaymentSuccess() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!session_id) {
      setStatus('error');
      setMessage('Keine Zahlungsinformationen gefunden.');
      return;
    }
    api
      .confirmPayment(session_id)
      .then((res: any) => {
        if (res?.event?.id) setEventId(res.event.id);
        setStatus('ok');
      })
      .catch((e) => {
        setStatus('error');
        setMessage(String(e?.message ?? e));
      });
  }, [session_id]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.title}>Zahlung wird bestätigt…</Text>
          </>
        )}
        {status === 'ok' && (
          <>
            <Ionicons name="checkmark-circle" size={72} color={colors.primary} />
            <Text style={s.title}>Zahlung erfolgreich!</Text>
            <Text style={s.sub}>{eventId ? 'Du bist angemeldet.' : 'Deine Buchung ist bestätigt.'}</Text>
            <Pressable
              style={s.btn}
              onPress={() => router.replace(eventId ? `/training/${eventId}` : '/(tabs)/bookings')}
            >
              <Text style={s.btnText}>{eventId ? 'Zum Event' : 'Zu meinen Buchungen'}</Text>
            </Pressable>
          </>
        )}
        {status === 'error' && (
          <>
            <Ionicons name="close-circle" size={72} color={colors.danger} />
            <Text style={s.title}>Etwas ist schiefgelaufen</Text>
            <Text style={s.sub}>{message}</Text>
            <Pressable style={s.btn} onPress={() => router.replace('/(tabs)/home')}>
              <Text style={s.btnText}>Zurück zur Startseite</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.full,
  },
  btnText: { color: '#0F1419', fontWeight: '800', fontSize: 15 },
});
