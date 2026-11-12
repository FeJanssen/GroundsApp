import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../src/api/client';
import { Venue } from '../src/data/mock';
import { colors, radius, spacing } from '../src/theme';

const RADII = [5, 10, 25, 50] as const;
export const LAST_SEARCH_KEY = 'jkb_last_search';

type Result = Venue & { distance_km: number | null };

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const [near, setNear] = useState('');
  const [radius, setRadius] = useState<number>(25);
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = async (query: string, nearVal: string, radiusVal: number) => {
    if (!query.trim() && !nearVal.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const data = await api.searchVenues({
        q: query.trim() || undefined,
        near: nearVal.trim() || undefined,
        radius_km: radiusVal,
      });
      setResults(data);
      // Letzte Suche für die Startseiten-Slideshow merken
      if (typeof window !== 'undefined' && data.length > 0) {
        window.localStorage?.setItem(LAST_SEARCH_KEY, JSON.stringify({
          q: query.trim(), near: nearVal.trim(), radius_km: radiusVal, ts: Date.now(),
        }));
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce bei Eingabe
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(q, near, radius), 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, near, radius]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Vereine suchen</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={s.form}>
        <View style={s.inputBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={s.input}
            placeholder="Verein oder Sportart…"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={s.inputBox}>
          <Ionicons name="location-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={s.input}
            placeholder="Ort oder PLZ für Umkreissuche…"
            placeholderTextColor={colors.textMuted}
            value={near}
            onChangeText={setNear}
          />
          {near.length > 0 && (
            <Pressable onPress={() => setNear('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {near.trim().length > 0 && (
          <View style={s.radiusRow}>
            {RADII.map((r) => (
              <Pressable
                key={r}
                style={[s.radiusChip, radius === r && s.radiusChipActive]}
                onPress={() => setRadius(r)}
              >
                <Text style={[s.radiusText, radius === r && s.radiusTextActive]}>{r} km</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : results === null ? (
          <View style={s.empty}>
            <Ionicons name="compass-outline" size={40} color={colors.textMuted} />
            <Text style={s.muted}>Suche nach Vereinen in deiner Nähe –{'\n'}z.B. „Tennis" + „München" im Umkreis.</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="sad-outline" size={40} color={colors.textMuted} />
            <Text style={s.muted}>Keine Vereine gefunden.{'\n'}Versuch einen größeren Umkreis.</Text>
          </View>
        ) : (
          results.map((v) => (
            <Pressable key={v.id} style={s.card} onPress={() => router.push(`/venue/${v.id}`)}>
              <Image source={{ uri: v.image }} style={s.cardImage} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardName} numberOfLines={1}>{v.name}</Text>
                <Text style={s.cardSub} numberOfLines={1}>
                  {v.city}{v.distance_km !== null ? ` · ${v.distance_km} km entfernt` : ''}
                </Text>
                <Text style={s.cardPrice}>ab {v.pricePerHour} €/Std.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  form: { paddingHorizontal: spacing.md, gap: spacing.sm },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontSize: 15, outlineStyle: 'none' } as any,
  radiusRow: { flexDirection: 'row', gap: spacing.sm },
  radiusChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  radiusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  radiusTextActive: { color: '#fff' },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  cardImage: { width: 64, height: 64, borderRadius: radius.sm },
  cardName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardPrice: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 4 },
  empty: { alignItems: 'center', gap: spacing.md, marginTop: 60 },
  muted: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
