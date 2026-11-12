import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiEvent } from '../src/api/client';
import { useApp } from '../src/state/AppContext';
import { colors, radius, spacing } from '../src/theme';

export default function Matches() {
  const { user } = useApp();
  const [matches, setMatches] = useState<ApiEvent[]>([]);
  const myName = user?.name ?? 'Gast';

  useFocusEffect(
    useCallback(() => {
      api.getEvents('match').then(setMatches).catch(() => {});
    }, [])
  );

  const toggle = async (m: ApiEvent) => {
    const joined = m.teilnehmer.includes(myName);
    try {
      if (joined) {
        const updated = await api.leaveEvent(m.id, myName);
        setMatches((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
      } else if (m.preis > 0) {
        // Kostenpflichtig → Stripe Checkout
        const { checkout_url } = await api.eventCheckout(m.id, myName);
        if (Platform.OS === 'web') window.location.href = checkout_url;
      } else {
        const updated = await api.joinEvent(m.id, myName);
        setMatches((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
      }
    } catch {
      // voll oder Fehler - ignorieren
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Pressable style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.topTitle}>Match finden</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md, gap: 12 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyText}>Aktuell keine offenen Matches.</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const joined = m.teilnehmer.includes(myName);
          const full = m.teilnehmer.length >= m.max_teilnehmer;
          return (
            <Pressable style={s.card} onPress={() => router.push(`/training/${m.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={s.level}>{m.level || 'Alle Level'}</Text>
                <Text style={s.title}>{m.titel}</Text>
                <Text style={s.meta}>
                  {m.datum} · {m.uhrzeit_von} Uhr · {m.verein_name}
                </Text>
                <Text style={s.meta}>
                  {m.teilnehmer.length}/{m.max_teilnehmer} Spieler
                  {m.preis > 0 ? ` · ${m.preis} €` : ''}
                </Text>
              </View>
              <Pressable
                style={[s.joinBtn, joined && s.leaveBtn, full && !joined && { opacity: 0.4 }]}
                disabled={full && !joined}
                onPress={() => toggle(m)}
              >
                <Text style={[s.joinText, joined && s.leaveText]}>
                  {joined ? 'Austragen' : 'Mitspielen'}
                </Text>
              </Pressable>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  level: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  joinBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  joinText: { color: colors.bg, fontWeight: '800', fontSize: 13 },
  leaveBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  leaveText: { color: colors.danger },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
