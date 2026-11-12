import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiEvent, Club, ClubAnalytics, Court } from '../../src/api/client';
import { colors, radius, spacing } from '../../src/theme';

const CLUB_COLOR = '#C9A86A';
const EVENT_TYPES: { key: string; label: string }[] = [
  { key: 'training', label: 'Training' },
  { key: 'event', label: 'Event' },
  { key: 'match', label: 'Match' },
];

/** Feld mit Label darüber */
function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <View style={{ marginBottom: 12, flex, minWidth: 0 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

/** Datums-/Zeit-Eingabe: nativer Browser-Picker im Web, TextInput sonst */
function DateTimeInput({
  type, value, onChange, placeholder,
}: { type: 'date' | 'time'; value: string; onChange: (v: string) => void; placeholder?: string }) {
  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type,
      value,
      onChange: (e: any) => onChange(e.target.value),
      style: {
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        color: colors.text,
        padding: '12px 14px',
        fontSize: 14,
        width: '100%',
        boxSizing: 'border-box' as const,
        colorScheme: 'dark',
        fontFamily: 'inherit',
      },
    });
  }
  return (
    <TextInput
      style={fieldStyles.input}
      placeholder={placeholder ?? (type === 'date' ? 'JJJJ-MM-TT' : 'HH:MM')}
      placeholderTextColor={colors.textMuted}
      value={value}
      onChangeText={onChange}
    />
  );
}

const fieldStyles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
});

export default function ClubManager() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [stripe, setStripe] = useState<{ connected: boolean; charges_enabled: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [courtName, setCourtName] = useState('');
  const [courtType, setCourtType] = useState('');
  const [courtPrice, setCourtPrice] = useState('20');
  const [von, setVon] = useState('07:00');
  const [bis, setBis] = useState('22:00');
  const [saving, setSaving] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  // Events
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [evTyp, setEvTyp] = useState('training');
  const [evTitel, setEvTitel] = useState('');
  const [evBeschreibung, setEvBeschreibung] = useState('');
  const [evDatum, setEvDatum] = useState('');
  const [evZeit, setEvZeit] = useState('18:00');
  const [evDauer, setEvDauer] = useState('60');
  const [evMax, setEvMax] = useState('8');
  const [evPreis, setEvPreis] = useState('0');
  const [evLevel, setEvLevel] = useState('');
  const [evTrainer, setEvTrainer] = useState('');
  const [evSaving, setEvSaving] = useState(false);
  // Analyse
  const [analytics, setAnalytics] = useState<ClubAnalytics | null>(null);
  const [tab, setTab] = useState<'verwaltung' | 'analyse' | 'news'>('verwaltung');

  const notify = (msg: string) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Hinweis', msg);
  };

  const load = useCallback(() => {
    if (!id) return;
    api.getClub(id).then(setClub).catch(() => {});
    api.getCourts(id).then(setCourts).catch(() => {});
    api.stripeStatus(id).then(setStripe).catch(() => {});
    api.getEvents(undefined, id).then(setEvents).catch(() => {});
    api.getClubAnalytics(id).then(setAnalytics).catch(() => {});
  }, [id]);

  useFocusEffect(load);

  const addCourt = async () => {
    if (!id || !courtName) return notify('Bitte einen Platznamen angeben.');
    setSaving(true);
    try {
      await api.addCourt(id, {
        name: courtName,
        platztyp: courtType,
        price: parseFloat(courtPrice.replace(',', '.')) || 0,
        buchbar_von: von,
        buchbar_bis: bis,
      });
      setCourtName(''); setCourtType(''); setCourtPrice('20'); setShowForm(false);
      load();
    } catch (e: any) {
      notify(`Fehler: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const removeCourt = async (platzId: string) => {
    if (!id) return;
    try {
      await api.deleteCourt(id, platzId);
      setCourts((prev) => prev.filter((c) => c.id !== platzId));
    } catch (e: any) {
      notify(`Fehler: ${e?.message ?? e}`);
    }
  };

  const addEvent = async () => {
    if (!id || !evTitel || !evDatum) return notify('Bitte Titel und Datum (JJJJ-MM-TT) angeben.');
    setEvSaving(true);
    try {
      await api.createEvent(id, {
        typ: evTyp as ApiEvent['typ'],
        titel: evTitel,
        beschreibung: evBeschreibung,
        datum: evDatum,
        uhrzeit_von: evZeit,
        dauer_min: parseInt(evDauer, 10) || 60,
        max_teilnehmer: parseInt(evMax, 10) || 8,
        preis: parseFloat(evPreis.replace(',', '.')) || 0,
        level: evLevel,
        trainer: evTrainer,
      });
      setEvTitel(''); setEvBeschreibung(''); setEvDatum(''); setShowEventForm(false);
      load();
    } catch (e: any) {
      notify(`Fehler: ${e?.message ?? e}`);
    } finally {
      setEvSaving(false);
    }
  };

  const removeEvent = async (eventId: string) => {
    if (!id) return;
    try {
      await api.deleteEvent(id, eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (e: any) {
      notify(`Fehler: ${e?.message ?? e}`);
    }
  };

  const connectStripe = async () => {
    if (!id) return;
    setStripeLoading(true);
    try {
      const { onboarding_url } = await api.stripeOnboarding(id);
      if (Platform.OS === 'web') window.location.href = onboarding_url;
    } catch (e: any) {
      notify(`Stripe-Fehler: ${e?.message ?? e}`);
    } finally {
      setStripeLoading(false);
    }
  };

  if (!club) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={CLUB_COLOR} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const stripeReady = stripe?.connected && stripe?.charges_enabled;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.headerRow}>
          <Pressable style={s.back} onPress={() => router.replace('/(tabs)/profile')}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={s.clubBadge}>
            <Ionicons name="business" size={14} color={CLUB_COLOR} />
            <Text style={s.clubBadgeText}>Vereins-Manager</Text>
          </View>
        </View>

        <Text style={s.title}>{club.name}</Text>
        <Text style={s.sub}>{club.city ?? 'Kein Ort hinterlegt'} · {club.email}</Text>

        {/* Tabs */}
        <View style={s.tabRow}>
          {([
            { key: 'verwaltung', label: 'Verwaltung', icon: 'settings-outline' },
            { key: 'analyse', label: 'Analyse', icon: 'stats-chart-outline' },
            { key: 'news', label: 'Neuigkeiten', icon: 'newspaper-outline' },
          ] as const).map((t) => (
            <Pressable
              key={t.key}
              style={[s.tabChip, tab === t.key && s.tabChipActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon} size={15} color={tab === t.key ? '#1A1A1A' : colors.textMuted} />
              <Text style={[s.tabChipText, tab === t.key && s.tabChipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'analyse' && (
          <>
            {!analytics ? (
              <ActivityIndicator color={CLUB_COLOR} style={{ marginTop: spacing.lg }} />
            ) : (
              <>
                {/* Umsatz-Kacheln */}
                <View style={s.statGrid}>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Umsatz gesamt</Text>
                    <Text style={s.statValue}>{analytics.revenue_total.toFixed(2)} €</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Netto (nach 5%)</Text>
                    <Text style={[s.statValue, { color: '#7BA76A' }]}>{analytics.revenue_net.toFixed(2)} €</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Buchungen</Text>
                    <Text style={s.statValue}>{analytics.bookings_total}</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Event-Teilnahmen</Text>
                    <Text style={s.statValue}>{analytics.event_participants}</Text>
                  </View>
                </View>

                <View style={s.card}>
                  <Text style={s.cardTitle}>Umsatz-Aufteilung</Text>
                  <View style={s.splitRow}>
                    <Text style={s.splitLabel}>Platzbuchungen</Text>
                    <Text style={s.splitValue}>{analytics.revenue_bookings.toFixed(2)} €</Text>
                  </View>
                  <View style={s.splitRow}>
                    <Text style={s.splitLabel}>Trainings & Events</Text>
                    <Text style={s.splitValue}>{analytics.revenue_events.toFixed(2)} €</Text>
                  </View>
                  <View style={s.splitRow}>
                    <Text style={s.splitLabel}>Davon online bezahlt</Text>
                    <Text style={s.splitValue}>{analytics.revenue_online.toFixed(2)} €</Text>
                  </View>
                  <View style={s.splitRow}>
                    <Text style={[s.splitLabel, { color: colors.danger }]}>Plattform-Provision (5%)</Text>
                    <Text style={[s.splitValue, { color: colors.danger }]}>−{analytics.commission.toFixed(2)} €</Text>
                  </View>
                  {analytics.bookings_cancelled > 0 && (
                    <View style={s.splitRow}>
                      <Text style={s.splitLabel}>Stornierte Buchungen</Text>
                      <Text style={s.splitValue}>{analytics.bookings_cancelled}</Text>
                    </View>
                  )}
                </View>

                {/* Umsatz pro Platz */}
                <Text style={s.sectionTitle}>Umsatz pro Platz</Text>
                {analytics.by_court.map((c) => {
                  const max = Math.max(...analytics.by_court.map((x) => x.revenue), 1);
                  return (
                    <View key={c.platz_id} style={s.barRow}>
                      <View style={s.barHeader}>
                        <Text style={s.barName}>{c.name}</Text>
                        <Text style={s.barValue}>{c.revenue.toFixed(2)} € · {c.count} Buchungen</Text>
                      </View>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${Math.max((c.revenue / max) * 100, 2)}%` }]} />
                      </View>
                    </View>
                  );
                })}

                {/* Umsatz pro Monat */}
                <Text style={s.sectionTitle}>Umsatz pro Monat</Text>
                {analytics.by_month.length === 0 ? (
                  <Text style={s.emptyText}>Noch keine Umsätze.</Text>
                ) : (
                  analytics.by_month.map((m) => {
                    const max = Math.max(...analytics.by_month.map((x) => x.revenue), 1);
                    return (
                      <View key={m.month} style={s.barRow}>
                        <View style={s.barHeader}>
                          <Text style={s.barName}>{m.month}</Text>
                          <Text style={s.barValue}>{m.revenue.toFixed(2)} €</Text>
                        </View>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { width: `${Math.max((m.revenue / max) * 100, 2)}%`, backgroundColor: '#7BA76A' }]} />
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </>
        )}

        {tab === 'news' && (
          <>
            {!analytics ? (
              <ActivityIndicator color={CLUB_COLOR} style={{ marginTop: spacing.lg }} />
            ) : analytics.news.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="newspaper-outline" size={28} color={colors.textMuted} />
                <Text style={s.emptyText}>Noch keine Aktivitäten.</Text>
              </View>
            ) : (
              analytics.news.map((n, i) => (
                <View key={i} style={s.newsRow}>
                  <View style={[s.courtIcon, n.type === 'event' && { backgroundColor: '#7BA76A22' }]}>
                    <Ionicons
                      name={n.type === 'event' ? 'people' : 'calendar'}
                      size={15}
                      color={n.type === 'event' ? '#7BA76A' : CLUB_COLOR}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.courtName, n.cancelled && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                      {n.title}
                    </Text>
                    <Text style={s.courtMeta}>
                      {n.sub} · {n.date} {n.time ? `· ${n.time} Uhr` : ''}
                      {n.cancelled ? ' · storniert' : ''}
                    </Text>
                  </View>
                  <Text style={s.courtPrice}>{n.price > 0 ? `${n.price.toFixed(2)} €` : '–'}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'verwaltung' && (
        <>
        {/* Stripe / Zahlungen */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.iconCircle, { backgroundColor: stripeReady ? '#7BA76A22' : `${CLUB_COLOR}22` }]}>
              <Ionicons name="card" size={18} color={stripeReady ? '#7BA76A' : CLUB_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Zahlungen</Text>
              <Text style={s.cardSub}>
                {stripeReady
                  ? 'Stripe verbunden – du empfängst Zahlungen (95% je Buchung).'
                  : stripe?.connected
                  ? 'Stripe-Konto angelegt – Einrichtung noch nicht abgeschlossen.'
                  : 'Verbinde Stripe, um Zahlungen zu empfangen.'}
              </Text>
            </View>
            {stripeReady && <Ionicons name="checkmark-circle" size={22} color="#7BA76A" />}
          </View>
          {!stripeReady && (
            <Pressable style={s.goldBtn} onPress={connectStripe} disabled={stripeLoading}>
              {stripeLoading ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <Text style={s.goldBtnText}>
                  {stripe?.connected ? 'Einrichtung fortsetzen' : 'Stripe verbinden'}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Plätze */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Plätze ({courts.length})</Text>
          <Pressable style={s.addBtn} onPress={() => setShowForm((v) => !v)}>
            <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#1A1A1A" />
          </Pressable>
        </View>

        {showForm && (
          <View style={s.card}>
            <Field label="Platzname *">
              <TextInput
                style={fieldStyles.input} placeholder="z.B. Platz 1" placeholderTextColor={colors.textMuted}
                value={courtName} onChangeText={setCourtName}
              />
            </Field>
            <Field label="Belag / Typ">
              <TextInput
                style={fieldStyles.input} placeholder="z.B. Sand, Halle, Padel" placeholderTextColor={colors.textMuted}
                value={courtType} onChangeText={setCourtType}
              />
            </Field>
            <Field label="Preis pro Stunde (€)">
              <TextInput
                style={fieldStyles.input} placeholder="20" placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad" value={courtPrice} onChangeText={setCourtPrice}
              />
            </Field>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Buchbar von" flex={1}>
                <DateTimeInput type="time" value={von} onChange={setVon} />
              </Field>
              <Field label="Buchbar bis" flex={1}>
                <DateTimeInput type="time" value={bis} onChange={setBis} />
              </Field>
            </View>
            <Pressable style={s.goldBtn} onPress={addCourt} disabled={saving}>
              {saving ? <ActivityIndicator color="#1A1A1A" /> : <Text style={s.goldBtnText}>Platz anlegen</Text>}
            </Pressable>
          </View>
        )}

        {courts.length === 0 && !showForm && (
          <View style={s.empty}>
            <Ionicons name="tennisball-outline" size={28} color={colors.textMuted} />
            <Text style={s.emptyText}>Noch keine Plätze – leg deinen ersten an!</Text>
          </View>
        )}

        {courts.map((c) => (
          <View key={c.id} style={s.courtRow}>
            <View style={s.courtIcon}>
              <Ionicons name="tennisball" size={16} color={CLUB_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.courtName}>{c.name}</Text>
              <Text style={s.courtMeta}>
                {c.platztyp ? `${c.platztyp} · ` : ''}{c.buchbar_von}–{c.buchbar_bis} Uhr
              </Text>
            </View>
            <Text style={s.courtPrice}>{c.price} €/h</Text>
            <Pressable style={s.deleteBtn} onPress={() => removeCourt(c.id)}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        ))}

        {/* Trainings & Events */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Trainings & Events ({events.length})</Text>
          <Pressable style={s.addBtn} onPress={() => setShowEventForm((v) => !v)}>
            <Ionicons name={showEventForm ? 'close' : 'add'} size={20} color="#1A1A1A" />
          </Pressable>
        </View>

        {showEventForm && (
          <View style={s.card}>
            <Text style={fieldStyles.label}>Art des Angebots</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {EVENT_TYPES.map((t) => (
                <Pressable
                  key={t.key}
                  style={[s.typChip, evTyp === t.key && s.typChipActive]}
                  onPress={() => setEvTyp(t.key)}
                >
                  <Text style={[s.typChipText, evTyp === t.key && s.typChipTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Field label="Titel *">
              <TextInput
                style={fieldStyles.input} placeholder="z.B. Tennis-Training für Anfänger"
                placeholderTextColor={colors.textMuted} value={evTitel} onChangeText={setEvTitel}
              />
            </Field>

            <Field label="Beschreibung">
              <TextInput
                style={fieldStyles.input} placeholder="Worum geht es? (optional)"
                placeholderTextColor={colors.textMuted} value={evBeschreibung} onChangeText={setEvBeschreibung}
              />
            </Field>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Datum *" flex={1}>
                <DateTimeInput type="date" value={evDatum} onChange={setEvDatum} />
              </Field>
              <Field label="Uhrzeit *" flex={1}>
                <DateTimeInput type="time" value={evZeit} onChange={setEvZeit} />
              </Field>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Dauer (Min)" flex={1}>
                <TextInput
                  style={fieldStyles.input} placeholder="60" placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad" value={evDauer} onChangeText={setEvDauer}
                />
              </Field>
              <Field label="Max. Teilnehmer" flex={1}>
                <TextInput
                  style={fieldStyles.input} placeholder="8" placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad" value={evMax} onChangeText={setEvMax}
                />
              </Field>
              <Field label="Preis (€)" flex={1}>
                <TextInput
                  style={fieldStyles.input} placeholder="0 = gratis" placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad" value={evPreis} onChangeText={setEvPreis}
                />
              </Field>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Level" flex={1}>
                <TextInput
                  style={fieldStyles.input} placeholder="z.B. Anfänger" placeholderTextColor={colors.textMuted}
                  value={evLevel} onChangeText={setEvLevel}
                />
              </Field>
              <Field label="Trainer" flex={1}>
                <TextInput
                  style={fieldStyles.input} placeholder="z.B. Coach Jan" placeholderTextColor={colors.textMuted}
                  value={evTrainer} onChangeText={setEvTrainer}
                />
              </Field>
            </View>

            <Pressable style={s.goldBtn} onPress={addEvent} disabled={evSaving}>
              {evSaving ? <ActivityIndicator color="#1A1A1A" /> : <Text style={s.goldBtnText}>Anlegen</Text>}
            </Pressable>
          </View>
        )}

        {events.length === 0 && !showEventForm && (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
            <Text style={s.emptyText}>Noch keine Trainings oder Events.</Text>
          </View>
        )}

        {events.map((e) => (
          <View key={e.id} style={s.courtRow}>
            <View style={s.courtIcon}>
              <Ionicons
                name={e.typ === 'training' ? 'fitness' : e.typ === 'match' ? 'trophy' : 'calendar'}
                size={16} color={CLUB_COLOR}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.courtName}>{e.titel}</Text>
              <Text style={s.courtMeta}>
                {e.datum} · {e.uhrzeit_von} Uhr · {e.teilnehmer.length}/{e.max_teilnehmer} Teilnehmer
              </Text>
            </View>
            <Text style={s.courtPrice}>{e.preis > 0 ? `${e.preis} €` : 'Gratis'}</Text>
            <Pressable style={s.deleteBtn} onPress={() => removeEvent(e.id)}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 80, maxWidth: 560, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  back: {
    width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  clubBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${CLUB_COLOR}22`,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
  },
  clubBadgeText: { color: CLUB_COLOR, fontWeight: '700', fontSize: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  cardSub: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  goldBtn: {
    backgroundColor: CLUB_COLOR, borderRadius: radius.full, paddingVertical: 13,
    alignItems: 'center', marginTop: spacing.md,
  },
  goldBtnText: { color: '#1A1A1A', fontWeight: '800', fontSize: 14 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  addBtn: {
    width: 36, height: 36, borderRadius: radius.full, backgroundColor: CLUB_COLOR,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 10,
  },
  empty: { alignItems: 'center', gap: 8, paddingVertical: spacing.lg },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  courtRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, paddingHorizontal: spacing.md, marginBottom: 8,
  },
  courtIcon: {
    width: 32, height: 32, borderRadius: radius.full, backgroundColor: `${CLUB_COLOR}22`,
    alignItems: 'center', justifyContent: 'center',
  },
  courtName: { color: colors.text, fontWeight: '700', fontSize: 14 },
  courtMeta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  courtPrice: { color: CLUB_COLOR, fontWeight: '800', fontSize: 14 },
  deleteBtn: { padding: 6 },
  typChip: {
    flex: 1, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 8, alignItems: 'center', backgroundColor: colors.bg,
  },
  typChipActive: { backgroundColor: CLUB_COLOR, borderColor: CLUB_COLOR },
  typChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  typChipTextActive: { color: '#1A1A1A' },
  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  tabChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10, backgroundColor: colors.bgCard,
  },
  tabChipActive: { backgroundColor: CLUB_COLOR, borderColor: CLUB_COLOR },
  tabChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  tabChipTextActive: { color: '#1A1A1A' },
  // Analyse
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.md },
  statCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.bgCard,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  splitRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  splitLabel: { color: colors.textMuted, fontSize: 13 },
  splitValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  barRow: { marginBottom: 12 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  barValue: { color: colors.textMuted, fontSize: 12 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.bgCard, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: CLUB_COLOR },
  // News
  newsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, paddingHorizontal: spacing.md, marginBottom: 8,
  },
});
