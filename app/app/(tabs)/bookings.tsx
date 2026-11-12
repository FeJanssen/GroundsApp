import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiBooking } from '../../src/api/client';
import { colors, radius, spacing } from '../../src/theme';

const tabs = [
  { id: 'confirmed', label: 'Anstehend' },
  { id: 'past', label: 'Vergangen' },
  { id: 'cancelled', label: 'Storniert' },
] as const;

const statusMeta = {
  confirmed: { label: 'Bestätigt', color: colors.primary, icon: 'checkmark-circle' },
  cancelled: { label: 'Storniert', color: colors.danger, icon: 'close-circle' },
  past: { label: 'Vergangen', color: colors.textMuted, icon: 'time' },
} as const;

export default function Bookings() {
  const [tab, setTab] = useState<'confirmed' | 'past' | 'cancelled'>('confirmed');
  const [apiBookings, setApiBookings] = useState<ApiBooking[]>([]);

  // Buchungen bei jedem Öffnen des Tabs frisch aus der DB laden
  useFocusEffect(
    useCallback(() => {
      api.getBookings().then(setApiBookings).catch(() => {});
    }, [])
  );

  const bookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return apiBookings.map((b) => ({
      id: b.id,
      venueId: b.venue_id ?? '',
      venueName: b.venue_name,
      date: b.date,
      time: b.time,
      durationMin: b.duration_min,
      price: b.price,
      status: (b.status === 'cancelled'
        ? 'cancelled'
        : b.date < today
        ? 'past'
        : 'confirmed') as 'confirmed' | 'past' | 'cancelled',
    }));
  }, [apiBookings]);

  const cancel = async (id: string) => {
    try {
      await api.cancelBooking(id);
      setApiBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b))
      );
    } catch {
      // ignorieren
    }
  };

  const filtered = useMemo(() => bookings.filter((b) => b.status === tab), [bookings, tab]);
  const upcomingCount = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <View style={s.root}>
      {/* Weisser Header wie auf der Startseite */}
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Buchungen</Text>
            <Text style={s.headerSub}>
              {upcomingCount > 0 ? `${upcomingCount} anstehende Buchung${upcomingCount > 1 ? 'en' : ''}` : 'Keine anstehenden Buchungen'}
            </Text>
          </View>
          <Pressable style={s.addBtn} onPress={() => router.push('/book')}>
            <Ionicons name="add" size={24} color="#1A1A1A" />
          </Pressable>
        </View>

        {/* Segment-Filter */}
        <View style={s.segment}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable key={t.id} style={[s.segmentItem, active && s.segmentActive]} onPress={() => setTab(t.id)}>
                <Text style={[s.segmentText, active && s.segmentTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <View style={s.bodyWrap}>
      <FlatList
        style={s.body}
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120, gap: 12 }}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <View style={s.emptyIcon}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>Nichts gefunden</Text>
            <Text style={s.emptyText}>Hier erscheinen deine Buchungen.</Text>
            <Pressable style={s.emptyBtn} onPress={() => router.push('/book')}>
              <Text style={s.emptyBtnText}>Jetzt Platz buchen</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const meta = statusMeta[item.status];
          const [day, month] = item.date.split('-').reverse();
          return (
            <Pressable style={s.card} onPress={() => router.push(`/venue/${item.venueId}`)}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=60' }}
                style={s.cardImage}
              />
              <View style={s.cardOverlay} />

              {/* Datums-Badge */}
              <View style={s.dateBadge}>
                <Text style={s.dateDay}>{day}</Text>
                <Text style={s.dateMonth}>{month}.</Text>
              </View>

              {/* Status-Chip */}
              <View style={[s.statusChip, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon as any} size={12} color={colors.bg} />
                <Text style={s.statusText}>{meta.label}</Text>
              </View>

              <View style={s.cardBody}>
                <Text style={s.venueName}>{item.venueName}</Text>
                <View style={s.metaRow}>
                  <View style={s.meta}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={s.metaText}>{item.time} Uhr</Text>
                  </View>
                  <View style={s.meta}>
                    <Ionicons name="hourglass-outline" size={13} color={colors.textMuted} />
                    <Text style={s.metaText}>{item.durationMin} Min</Text>
                  </View>
                </View>
                <View style={s.cardFooter}>
                  <Text style={s.price}>{item.price} €</Text>
                  {item.status === 'confirmed' && (
                    <Pressable style={s.cancelBtn} onPress={() => cancel(item.id)}>
                      <Text style={s.cancelText}>Stornieren</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: spacing.md,
  },
  bodyWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  body: {
    flex: 1, backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F0F2F4',
    alignItems: 'center', justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row', marginHorizontal: spacing.md,
    backgroundColor: '#F0F2F4', borderRadius: radius.full, padding: 4,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.full },
  segmentActive: { backgroundColor: '#1A1A1A' },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  segmentTextActive: { color: '#FFFFFF' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  emptyBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: 22, paddingVertical: 11, marginTop: spacing.lg,
  },
  emptyBtnText: { color: colors.bg, fontWeight: '800', fontSize: 14 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  cardImage: { width: '100%', height: 110 },
  cardOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 110,
    backgroundColor: 'rgba(16,20,24,0.35)',
  },
  dateBadge: {
    position: 'absolute', top: 12, left: 12, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  dateDay: { fontSize: 17, fontWeight: '900', color: '#1A1A1A', lineHeight: 19 },
  dateMonth: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  statusChip: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusText: { color: colors.bg, fontSize: 11, fontWeight: '800' },
  cardBody: { padding: spacing.md },
  venueName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  price: { color: colors.primary, fontWeight: '900', fontSize: 17 },
  cancelBtn: {
    borderWidth: 1, borderColor: colors.danger, borderRadius: radius.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
});
