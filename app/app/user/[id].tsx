import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, PublicProfile } from '../../src/api/client';
import { useApp } from '../../src/state/AppContext';
import { colors, radius, spacing } from '../../src/theme';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setProfile(await api.getPublicProfile(id, user?.id));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => { load(); }, [load]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  const doAction = async (fn: () => Promise<any>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) {
      if (typeof window !== 'undefined') window.alert?.(e?.message ?? 'Fehler');
    }
    await load();
    setBusy(false);
  };

  const friendButton = () => {
    if (!user || !profile || user.id === profile.id) return null;
    const st = profile.freundschaft;
    if (st === 'freunde') {
      return (
        <Pressable style={s.actionBtnMuted} disabled={busy}
          onPress={() => doAction(() => api.removeFriend(user.id, profile.id))}>
          <Ionicons name="checkmark" size={16} color={colors.textMuted} />
          <Text style={s.actionTextMuted}>Freunde</Text>
        </Pressable>
      );
    }
    if (st === 'angefragt') {
      return (
        <Pressable style={s.actionBtnMuted} disabled={busy}
          onPress={() => doAction(() => api.removeFriend(user.id, profile.id))}>
          <Text style={s.actionTextMuted}>Angefragt</Text>
        </Pressable>
      );
    }
    if (st === 'anfrage_erhalten') {
      return (
        <Pressable style={s.actionBtn} disabled={busy}
          onPress={() => doAction(() => api.acceptFriendRequest(user.id, profile.id))}>
          <Text style={s.actionText}>Anfrage annehmen</Text>
        </Pressable>
      );
    }
    return (
      <Pressable style={s.actionBtn} disabled={busy}
        onPress={() => doAction(() => api.sendFriendRequest(user.id, profile.id))}>
        <Ionicons name="person-add" size={16} color="#fff" />
        <Text style={s.actionText}>Hinzufügen</Text>
      </Pressable>
    );
  };

  const sports = profile?.lieblingssport
    ? profile.lieblingssport.split(',').map((x) => x.trim()).filter(Boolean)
    : [];
  const username = (profile?.name ?? '').toLowerCase().replace(/\s+/g, '.');
  const initial = (profile?.name ?? '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>{username ? `@${username}` : 'Profil'}</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : !profile ? (
        <View style={s.center}>
          <Text style={s.muted}>Profil nicht gefunden</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
          {/* Profilkopf wie auf der eigenen Profilseite */}
          <View style={s.profileRow}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statNum}>{profile.stats.freunde}</Text>
                <Text style={s.statLabel}>Freunde</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statNum}>{profile.stats.buchungen}</Text>
                <Text style={s.statLabel}>Buchungen</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statNum}>{profile.stats.events}</Text>
                <Text style={s.statLabel}>Events</Text>
              </View>
            </View>
          </View>

          <View style={s.bioBlock}>
            <Text style={s.name}>{profile.name}</Text>
            <Text style={s.bio}>Immer bereit für ein Match 🎾</Text>
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

          <View style={s.actionRow}>{friendButton()}</View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarFallback: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.primary, fontSize: 34, fontWeight: '700' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNum: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  bioBlock: { marginTop: spacing.lg, gap: 4 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  bio: { color: colors.textMuted, fontSize: 14 },
  sportsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  sportChip: {
    backgroundColor: colors.surface, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border,
  },
  sportChipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md,
  },
  actionText: { color: '#fff', fontWeight: '700' },
  actionBtnMuted: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.surface, paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  actionTextMuted: { color: colors.textMuted, fontWeight: '700' },
  muted: { color: colors.textMuted },
});
