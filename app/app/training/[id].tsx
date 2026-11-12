import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiEvent } from '../../src/api/client';
import { useApp } from '../../src/state/AppContext';
import { colors, radius, spacing } from '../../src/theme';

export default function TrainingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  const [training, setTraining] = useState<ApiEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const myName = user?.name ?? 'Gast';

  useFocusEffect(
    useCallback(() => {
      if (id) api.getEvent(id).then(setTraining).catch(() => {});
    }, [id])
  );

  if (!training) return null;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  const isJoined = training.teilnehmer.includes(myName);
  const isFull = training.teilnehmer.length >= training.max_teilnehmer;
  const spotsLeft = training.max_teilnehmer - training.teilnehmer.length;

  const toggle = async () => {
    setBusy(true);
    try {
      if (isJoined) {
        setTraining(await api.leaveEvent(training.id, myName));
      } else if (training.preis > 0) {
        // Kostenpflichtig → Stripe Checkout
        const { checkout_url } = await api.eventCheckout(training.id, myName);
        if (Platform.OS === 'web') {
          window.location.href = checkout_url;
          return;
        }
      } else {
        setTraining(await api.joinEvent(training.id, myName));
      }
    } catch (e: any) {
      const msg = `Fehler: ${e?.message ?? e}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Hinweis', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Pressable style={s.back} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.topTitle}>{training.typ === 'training' ? 'Training' : training.typ === 'match' ? 'Match' : 'Event'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <Text style={s.period}>{training.level || 'Alle Level'}</Text>
        <Text style={s.title}>{training.titel}</Text>
        {training.trainer ? (
          <Text style={s.coach}>
            <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} /> {training.trainer}
          </Text>
        ) : null}

        <View style={s.metaRow}>
          <View style={s.metaBox}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={s.metaLabel}>{training.datum}</Text>
          </View>
          <View style={s.metaBox}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={s.metaLabel}>{training.uhrzeit_von} Uhr</Text>
          </View>
          <View style={s.metaBox}>
            <Ionicons name="hourglass-outline" size={16} color={colors.primary} />
            <Text style={s.metaLabel}>{training.dauer_min} Min</Text>
          </View>
        </View>

        {training.beschreibung ? (
          <>
            <Text style={s.section}>Beschreibung</Text>
            <Text style={s.desc}>{training.beschreibung}</Text>
          </>
        ) : null}

        <Text style={s.section}>
          Teilnehmer ({training.teilnehmer.length}/{training.max_teilnehmer})
        </Text>
        <View style={s.participants}>
          {training.teilnehmer.map((name) => (
            <View key={name} style={s.participant}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={s.participantName} numberOfLines={1}>{name}</Text>
            </View>
          ))}
          {Array.from({ length: Math.max(spotsLeft, 0) }).map((_, i) => (
            <View key={`free-${i}`} style={s.participant}>
              <View style={s.freeSpot}>
                <Ionicons name="add" size={18} color={colors.textMuted} />
              </View>
              <Text style={[s.participantName, { color: colors.textMuted }]}>Frei</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>Verein</Text>
        <Pressable style={s.clubCard} onPress={() => training.verein_id && router.push(`/venue/${training.verein_id}`)}>
          <View style={{ flex: 1 }}>
            <Text style={s.clubName}>{training.verein_name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </ScrollView>

      <View style={s.footer}>
        <View>
          <Text style={s.footerPrice}>{training.preis} €</Text>
          <Text style={s.footerSub}>
            {isFull && !isJoined ? 'Ausgebucht' : `${spotsLeft} Plätze frei`}
          </Text>
        </View>
        {isJoined ? (
          <Pressable style={[s.joinBtn, s.leaveBtn]} onPress={toggle} disabled={busy}>
            <Text style={s.leaveBtnText}>Austragen</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[s.joinBtn, (isFull || busy) && { opacity: 0.4 }]}
            disabled={isFull || busy}
            onPress={toggle}
          >
            <Text style={s.joinBtnText}>
              {training.preis > 0 ? `Für ${training.preis} € buchen` : 'Jetzt eintragen'}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  period: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 4 },
  coach: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md, flexWrap: 'wrap' },
  metaBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7,
  },
  metaLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  section: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  desc: { color: colors.textMuted, lineHeight: 21 },
  participants: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  participant: { alignItems: 'center', width: 60 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: colors.bg, fontWeight: '900', fontSize: 18 },
  participantName: { color: colors.text, fontSize: 11, fontWeight: '600', marginTop: 4 },
  freeSpot: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  clubCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  clubName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, backgroundColor: colors.bgCard,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerPrice: { color: colors.text, fontSize: 20, fontWeight: '900' },
  footerSub: { color: colors.textMuted, fontSize: 12 },
  joinBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 28, height: 50,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  joinBtnText: { color: colors.bg, fontWeight: '900', fontSize: 16 },
  leaveBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  leaveBtnText: { color: colors.danger, fontWeight: '800', fontSize: 15 },
});
