import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useApp } from '../../src/state/AppContext';
import { colors, radius, spacing } from '../../src/theme';

const legalItems = [
  { icon: 'document-text-outline', label: 'AGB' },
  { icon: 'shield-checkmark-outline', label: 'Datenschutzerklärung' },
  { icon: 'information-circle-outline', label: 'Impressum' },
  { icon: 'cookie', label: 'Cookie-Einstellungen', community: true },
  { icon: 'help-circle-outline', label: 'Hilfe & Support' },
] as const;

export default function Profile() {
  const { user, signOut, updateProfile } = useApp();
  const [stats, setStats] = useState({ bookings: 0, trainings: 0, matches: 0 });
  const [friendCount, setFriendCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api.getBookings().then((bs) => {
        setStats((prev) => ({ ...prev, bookings: bs.filter((b) => b.status !== 'cancelled').length }));
      }).catch(() => {});
      api.getFriends(user.id).then((f) => {
        setFriendCount(f.freunde.length);
        setRequestCount(f.anfragen.length);
      }).catch(() => {});
      api.getEvents().then((evs) => {
        const mine = evs.filter((e) => e.teilnehmer.includes(user.name));
        setStats((prev) => ({
          ...prev,
          trainings: mine.filter((e) => e.typ === 'training' || e.typ === 'event').length,
          matches: mine.filter((e) => e.typ === 'match').length,
        }));
      }).catch(() => {});
    }, [user?.id, user?.name])
  );

  const editProfile = async () => {
    if (Platform.OS !== 'web' || !user) return;
    const name = window.prompt('Dein Name:', user.name);
    if (name && name.trim() && name !== user.name) {
      try { await updateProfile({ name: name.trim() }); } catch { window.alert('Fehler beim Speichern.'); }
    }
    const sport = window.prompt('Dein Lieblingssport (z.B. Tennis, Padel):', user.lieblingssport ?? '');
    if (sport !== null && sport !== (user.lieblingssport ?? '')) {
      try { await updateProfile({ lieblingssport: sport.trim() || null }); } catch { /* ignorieren */ }
    }
  };

  const username = (user?.name ?? 'du').toLowerCase().replace(/\s+/g, '.');
  const initial = (user?.name ?? '?').charAt(0).toUpperCase();
  const sports = user?.lieblingssport
    ? user.lieblingssport.split(',').map((x) => x.trim()).filter(Boolean)
    : [];

  return (
    <View style={s.root}>
      {/* Weisser Header */}
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.username}>@{username}</Text>
          <Pressable style={s.iconBtn} hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color="#1A1A1A" />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={s.bodyWrap}>
      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profilkopf im Instagram-Stil */}
        <View style={s.profileRow}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={s.statsRow}>
            <Pressable style={s.stat} onPress={() => router.push('/friends')}>
              <Text style={s.statNum}>{friendCount}</Text>
              <Text style={s.statLabel}>Freunde</Text>
            </Pressable>
            <View style={s.stat}>
              <Text style={s.statNum}>{stats.bookings}</Text>
              <Text style={s.statLabel}>Buchungen</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>{stats.trainings + stats.matches}</Text>
              <Text style={s.statLabel}>Events</Text>
            </View>
          </View>
        </View>

        {/* Name + Bio */}
        <View style={s.bioBlock}>
          <Text style={s.name}>{user?.name ?? 'Gast'}</Text>
          <Text style={s.bio}>Immer bereit für ein Match 🎾</Text>
          <Text style={s.email}>{user?.email ?? 'Nicht angemeldet'}</Text>
          {sports.length > 0 && (
            <View style={s.sportsRow}>
              {sports.map((sp) => (
                <View key={sp} style={s.sportChip}>
                  <Text style={s.sportChipText}>{sp}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action-Buttons */}
        <View style={s.actionRow}>
          <Pressable style={s.actionBtn} onPress={editProfile}>
            <Text style={s.actionText}>Profil bearbeiten</Text>
          </Pressable>
          <Pressable style={s.actionBtn}>
            <Text style={s.actionText}>Profil teilen</Text>
          </Pressable>
          <Pressable style={[s.actionBtn, s.actionBtnSmall]} onPress={() => router.push('/friends')}>
            <Ionicons name="person-add-outline" size={16} color={colors.text} />
            {requestCount > 0 && <View style={s.reqBadge} />}
          </Pressable>
        </View>

        {/* Schnellzugriff */}
        <View style={s.menuBlock}>
          <Pressable style={s.menuRow} onPress={() => router.push('/friends')}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={s.menuText}>
              Freunde{requestCount > 0 ? ` · ${requestCount} Anfrage${requestCount > 1 ? 'n' : ''}` : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable style={s.menuRow} onPress={() => router.push('/(tabs)/bookings')}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={s.menuText}>Meine Buchungen</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable style={s.menuRow}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <Text style={s.menuText}>Zahlungsmethoden</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable style={[s.menuRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            <Text style={s.menuText}>Benachrichtigungen</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Vereins-Bereich – hervorgehoben */}
        <Pressable style={s.clubCard} onPress={() => router.push('/club/auth')}>
          <View style={s.clubIcon}>
            <Ionicons name="business" size={22} color="#C9A86A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.clubTitle}>Deinen Verein hinzufügen</Text>
            <Text style={s.clubSub}>Plätze verwalten, Preise festlegen & Zahlungen empfangen</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C9A86A" />
        </Pressable>

        {/* Rechtliches */}
        <Text style={s.sectionTitle}>Rechtliches & Hilfe</Text>
        <View style={s.menuBlock}>
          {legalItems.map((item, i) => (
            <Pressable
              key={item.label}
              style={[s.menuRow, i === legalItems.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Ionicons
                name={(item as any).community ? 'settings-outline' : (item.icon as any)}
                size={20}
                color={colors.textMuted}
              />
              <Text style={[s.menuText, { color: colors.textMuted }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Abmelden */}
        <Pressable
          style={s.logout}
          onPress={() => {
            signOut();
            router.replace('/login');
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={s.logoutText}>Abmelden</Text>
        </Pressable>

        <Text style={s.version}>JKB Grounds v0.1.0</Text>
      </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: '#FFFFFF',
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
  username: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  iconBtn: { padding: 4 },
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: spacing.lg,
  },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 2, borderColor: colors.primary },
  avatarFallback: { backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.primary, fontSize: 34, fontWeight: '900' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNum: { color: colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  bioBlock: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  bio: { color: colors.text, fontSize: 14, marginTop: 2 },
  email: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  sportsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  sportChip: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 5,
  },
  sportChipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, marginTop: spacing.md },
  actionBtn: {
    flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, alignItems: 'center', paddingVertical: 9,
  },
  actionBtnSmall: { flex: 0, paddingHorizontal: 14 },
  reqBadge: {
    position: 'absolute', top: 6, right: 8,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger,
  },
  actionText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  menuBlock: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, marginHorizontal: spacing.md, marginTop: spacing.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuText: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  sectionTitle: {
    color: colors.textMuted, fontSize: 13, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: spacing.md, marginTop: spacing.xl,
  },
  clubCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#C9A86A18', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#C9A86A55',
    padding: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.xl,
  },
  clubIcon: {
    width: 44, height: 44, borderRadius: radius.full, backgroundColor: '#C9A86A22',
    alignItems: 'center', justifyContent: 'center',
  },
  clubTitle: { color: '#C9A86A', fontWeight: '800', fontSize: 15 },
  clubSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.lg, padding: spacing.md,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  version: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
