import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiEvent } from '../src/api/client';
import { colors, radius, spacing } from '../src/theme';

export default function Trainings() {
  const [trainings, setTrainings] = useState<ApiEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.getEvents('training').then(setTrainings).catch(() => {});
    }, [])
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Pressable style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.topTitle}>Training finden</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={trainings}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.md, gap: 12 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyText}>Aktuell keine Trainings – schau später wieder rein!</Text>
          </View>
        }
        renderItem={({ item: t }) => (
          <Pressable style={s.card} onPress={() => router.push(`/training/${t.id}`)}>
            <Text style={s.period}>{t.level || 'Alle Level'}</Text>
            <Text style={s.title}>{t.titel}</Text>
            <View style={s.metaRow}>
              <View style={s.meta}>
                <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                <Text style={s.metaText}>{t.datum}</Text>
              </View>
              <View style={s.meta}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={s.metaText}>{t.uhrzeit_von} · {t.dauer_min} Min</Text>
              </View>
              <View style={s.meta}>
                <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                <Text style={s.metaText}>{t.teilnehmer.length}/{t.max_teilnehmer}</Text>
              </View>
            </View>
            <View style={s.footer}>
              <View style={{ flex: 1 }}>
                <Text style={s.club}>{t.verein_name}</Text>
                {t.trainer ? <Text style={s.location}>Trainer: {t.trainer}</Text> : null}
              </View>
              <Text style={s.price}>{t.preis} €</Text>
            </View>
          </Pressable>
        )}
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
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  period: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  footer: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  club: { color: colors.text, fontSize: 13, fontWeight: '700' },
  location: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  price: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
