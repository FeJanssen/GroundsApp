import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable, Alert, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Venue } from '../../src/data/mock';
import { api, ApiSlot } from '../../src/api/client';
import { useApp } from '../../src/state/AppContext';
import { colors, radius, spacing } from '../../src/theme';

function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('de-DE', { weekday: 'short' }),
      day: d.getDate(),
    };
  });
}

export default function VenueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  const days = useMemo(() => nextDays(7), []);

  const [venue, setVenue] = useState<Venue | null>(null);
  const [date, setDate] = useState(days[0].iso);
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  // Venue laden (API)
  useEffect(() => {
    if (!id) return;
    api.getVenue(id).then(setVenue).catch(() => {});
  }, [id]);

  // Slots laden (API)
  useEffect(() => {
    if (!id) return;
    setLoadingSlots(true);
    setSlotId(null);
    api
      .getSlots(id, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [id, date]);

  // Slots nach Platz gruppieren (echte DB hat mehrere Plätze pro Verein)
  const slotsByPlatz = useMemo(() => {
    const groups: Record<string, ApiSlot[]> = {};
    for (const s of slots) {
      const key = s.platz_name ?? 'Zeiten';
      (groups[key] = groups[key] ?? []).push(s);
    }
    return Object.entries(groups);
  }, [slots]);

  if (!venue) return null;
  const selected = slots.find((sl) => sl.id === slotId);

  const book = async () => {
    if (!selected) return;
    setBooking(true);
    try {
      // Mit Stripe bezahlen (5% Provision), wenn der Verein ein Stripe-Konto hat
      if (selected.platz_id && selected.price > 0) {
        try {
          const { checkout_url } = await api.createCheckout({
            venue_id: venue.id,
            venue_name: venue.name,
            platz_id: selected.platz_id,
            date: selected.date,
            time: selected.time,
            duration_min: selected.duration_min,
            price: selected.price,
            nutzer_id: user?.id,
          });
          if (Platform.OS === 'web') {
            window.location.href = checkout_url;
            return; // Redirect zu Stripe – Buchung entsteht nach Zahlung
          }
        } catch (e: any) {
          // 400 = Verein ohne Stripe-Konto → kostenlose Direktbuchung mit Hinweis
          if (!String(e?.message).includes('400')) throw e;
          const ok =
            Platform.OS !== 'web' ||
            window.confirm(
              'Dieser Verein hat Online-Zahlung noch nicht aktiviert. Buchung wird ohne Bezahlung reserviert – bezahlt wird vor Ort. Fortfahren?'
            );
          if (!ok) {
            setBooking(false);
            return;
          }
        }
      }
      if (selected.platz_id) {
        await api.createBooking({
          platz_id: selected.platz_id,
          date: selected.date,
          time: selected.time,
          duration_min: selected.duration_min,
          price: selected.price,
          nutzer_id: user?.id,
        });
      }
      const msg = `${venue.name} am ${selected.date} um ${selected.time} gebucht!`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Buchung bestätigt ✅', msg);
      router.push('/(tabs)/bookings');
    } catch (e: any) {
      const msg = `Buchung fehlgeschlagen: ${e?.message ?? e}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Fehler', msg);
    } finally {
      setBooking(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View>
          <Image source={{ uri: venue.image }} style={s.image} />
          <Pressable style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ padding: spacing.md }}>
          <Text style={s.title}>{venue.name}</Text>
          <Text style={s.sub}>
            <Ionicons name="location" size={13} color={colors.textMuted} /> {venue.address}
          </Text>
          <View style={s.ratingRow}>
            <Ionicons name="star" size={15} color={colors.primary} />
            <Text style={s.rating}>{venue.rating}</Text>
            <Text style={s.reviews}>({venue.reviews} Bewertungen)</Text>
          </View>

          {venue.description ? <Text style={s.desc}>{venue.description}</Text> : null}

          {venue.amenities.length > 0 && (
            <View style={s.amenities}>
              {venue.amenities.map((a) => (
                <View key={a} style={s.amenity}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text style={s.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.section}>Datum wählen</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map((d) => {
              const active = d.iso === date;
              return (
                <Pressable
                  key={d.iso}
                  style={[s.day, active && s.dayActive]}
                  onPress={() => setDate(d.iso)}
                >
                  <Text style={[s.dayLabel, active && { color: colors.bg }]}>{d.label}</Text>
                  <Text style={[s.dayNum, active && { color: colors.bg }]}>{d.day}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingSlots ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : slots.length === 0 ? (
            <Text style={s.noSlots}>Keine buchbaren Zeiten an diesem Tag.</Text>
          ) : (
            slotsByPlatz.map(([platzName, platzSlots]) => (
              <View key={platzName}>
                <Text style={s.section}>{platzName}</Text>
                <View style={s.slots}>
                  {platzSlots.map((sl) => {
                    const active = sl.id === slotId;
                    return (
                      <Pressable
                        key={sl.id}
                        disabled={!sl.available}
                        style={[s.slot, !sl.available && s.slotDisabled, active && s.slotActive]}
                        onPress={() => setSlotId(sl.id)}
                      >
                        <Text
                          style={[
                            s.slotText,
                            !sl.available && { color: colors.border },
                            active && { color: colors.bg },
                          ]}
                        >
                          {sl.time}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <View>
          <Text style={s.footerPrice}>
            {selected ? `${selected.price} €` : `ab ${venue.pricePerHour} €`}
          </Text>
          <Text style={s.footerSub}>
            {selected
              ? `${selected.platz_name ?? ''} ${selected.time} · ${selected.duration_min} Min`.trim()
              : 'Zeit wählen'}
          </Text>
        </View>
        <Pressable
          style={[s.bookBtn, (!selected || booking) && { opacity: 0.4 }]}
          disabled={!selected || booking}
          onPress={book}
        >
          <Text style={s.bookBtnText}>{booking ? 'Wird gebucht…' : 'Jetzt buchen'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  image: { width: '100%', height: 240 },
  back: { position: 'absolute', top: 12, left: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,20,24,0.7)', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  sub: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  rating: { color: colors.text, fontWeight: '800' },
  reviews: { color: colors.textMuted, fontSize: 13 },
  desc: { color: colors.textMuted, marginTop: spacing.md, lineHeight: 21 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  amenityText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  section: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm + 4 },
  day: { width: 56, height: 68, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  dayNum: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: 76, height: 42, borderRadius: radius.sm, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotDisabled: { opacity: 0.4 },
  slotText: { color: colors.text, fontWeight: '700' },
  noSlots: { color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border },
  footerPrice: { color: colors.text, fontSize: 20, fontWeight: '900' },
  footerSub: { color: colors.textMuted, fontSize: 12 },
  bookBtn: { backgroundColor: colors.primary, paddingHorizontal: 28, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { color: colors.bg, fontWeight: '900', fontSize: 16 },
});
