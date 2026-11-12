import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { events } from '../src/data/mock';
import { colors, radius, spacing } from '../src/theme';

export default function Events() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Pressable style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.topTitle}>Events suchen</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.md, gap: 12 }}
        renderItem={({ item: e }) => (
          <View style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.title}>{e.title}</Text>
              <Text style={s.price}>{e.price} €</Text>
            </View>
            <View style={s.metaRow}>
              <View style={s.meta}>
                <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                <Text style={s.metaText}>{e.date}</Text>
              </View>
              <View style={s.meta}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={s.metaText}>{e.time}</Text>
              </View>
              <View style={s.meta}>
                <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                <Text style={s.metaText}>{e.participants}/{e.maxParticipants}</Text>
              </View>
            </View>
            <Text style={s.club}>
              {e.club} · <Ionicons name="location-outline" size={11} color={colors.textMuted} /> {e.location}
            </Text>
            <Pressable style={s.joinBtn} onPress={() => {}}>
              <Text style={s.joinText}>Teilnehmen</Text>
            </Pressable>
          </View>
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  price: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  club: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  joinBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    alignItems: 'center', paddingVertical: 10, marginTop: 12,
  },
  joinText: { color: colors.bg, fontWeight: '800', fontSize: 14 },
});
