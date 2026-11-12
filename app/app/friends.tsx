import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, FriendUser, FriendsData } from '../src/api/client';
import { useApp } from '../src/state/AppContext';
import { colors, radius, spacing } from '../src/theme';

type Tab = 'freunde' | 'anfragen' | 'suchen';

function Avatar({ user, size = 44 }: { user: FriendUser; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
        {user.name?.charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useApp();
  const [tab, setTab] = useState<Tab>('freunde');
  const [data, setData] = useState<FriendsData>({ freunde: [], anfragen: [], gesendet: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setData(await api.getFriends(user.id));
    } catch {
      // ignorieren
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Debounced Suche
  useEffect(() => {
    if (!user) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        setResults(await api.searchFriends(user.id, query.trim()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, user]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'));

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Freunde</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>Bitte melde dich an, um Freunde zu finden.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/login')}>
            <Text style={styles.primaryBtnText}>Zum Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const doAction = async (fn: () => Promise<any>) => {
    try {
      await fn();
    } catch (e: any) {
      if (typeof window !== 'undefined') window.alert?.(e?.message ?? 'Fehler');
    }
    await load();
    if (query.trim().length >= 2) {
      try { setResults(await api.searchFriends(user.id, query.trim())); } catch {}
    }
  };

  const renderActionButton = (u: FriendUser) => {
    const status = u.freundschaft ?? 'keine';
    if (status === 'freunde') {
      return (
        <Pressable style={styles.smallBtnMuted} onPress={() => doAction(() => api.removeFriend(user.id, u.id))}>
          <Ionicons name="checkmark" size={14} color={colors.textMuted} />
          <Text style={styles.smallBtnMutedText}>Freunde</Text>
        </Pressable>
      );
    }
    if (status === 'angefragt') {
      return (
        <Pressable style={styles.smallBtnMuted} onPress={() => doAction(() => api.removeFriend(user.id, u.id))}>
          <Text style={styles.smallBtnMutedText}>Angefragt</Text>
        </Pressable>
      );
    }
    if (status === 'anfrage_erhalten') {
      return (
        <Pressable style={styles.smallBtn} onPress={() => doAction(() => api.acceptFriendRequest(user.id, u.id))}>
          <Text style={styles.smallBtnText}>Annehmen</Text>
        </Pressable>
      );
    }
    return (
      <Pressable style={styles.smallBtn} onPress={() => doAction(() => api.sendFriendRequest(user.id, u.id))}>
        <Ionicons name="person-add" size={14} color="#fff" />
        <Text style={styles.smallBtnText}>Hinzufügen</Text>
      </Pressable>
    );
  };

  const UserRow = ({ u, right }: { u: FriendUser; right: React.ReactNode }) => (
    <Pressable style={styles.row} onPress={() => router.push(`/user/${u.id}`)}>
      <Avatar user={u} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>{u.name}</Text>
        {!!u.lieblingssport && <Text style={styles.rowSub} numberOfLines={1}>{u.lieblingssport}</Text>}
      </View>
      {right}
    </Pressable>
  );

  const requestCount = data.anfragen.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Freunde</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {([
          ['freunde', `Freunde (${data.freunde.length})`],
          ['anfragen', requestCount > 0 ? `Anfragen (${requestCount})` : 'Anfragen'],
          ['suchen', 'Suchen'],
        ] as [Tab, string][]).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tabChip, tab === key && styles.tabChipActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabChipText, tab === key && styles.tabChipTextActive]}>{label}</Text>
            {key === 'anfragen' && requestCount > 0 && <View style={styles.badge} />}
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : tab === 'freunde' ? (
          <>
            {data.freunde.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                <Text style={styles.muted}>Noch keine Freunde – such dir welche!</Text>
                <Pressable style={styles.primaryBtn} onPress={() => setTab('suchen')}>
                  <Text style={styles.primaryBtnText}>Freunde suchen</Text>
                </Pressable>
              </View>
            )}
            {data.freunde.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                right={
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => doAction(() => api.removeFriend(user.id, u.id))}
                  >
                    <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
                  </Pressable>
                }
              />
            ))}
          </>
        ) : tab === 'anfragen' ? (
          <>
            {data.anfragen.length === 0 && data.gesendet.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="mail-open-outline" size={40} color={colors.textMuted} />
                <Text style={styles.muted}>Keine offenen Anfragen</Text>
              </View>
            )}
            {data.anfragen.length > 0 && <Text style={styles.sectionLabel}>Erhalten</Text>}
            {data.anfragen.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                right={
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={styles.smallBtn} onPress={() => doAction(() => api.acceptFriendRequest(user.id, u.id))}>
                      <Text style={styles.smallBtnText}>Annehmen</Text>
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => doAction(() => api.declineFriendRequest(user.id, u.id))}>
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                }
              />
            ))}
            {data.gesendet.length > 0 && <Text style={styles.sectionLabel}>Gesendet</Text>}
            {data.gesendet.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                right={
                  <Pressable style={styles.smallBtnMuted} onPress={() => doAction(() => api.removeFriend(user.id, u.id))}>
                    <Text style={styles.smallBtnMutedText}>Zurückziehen</Text>
                  </Pressable>
                }
              />
            ))}
          </>
        ) : (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Name oder E-Mail suchen…"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            {searching && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <Text style={[styles.muted, { textAlign: 'center', marginTop: 24 }]}>Niemanden gefunden</Text>
            )}
            {!searching && query.trim().length < 2 && (
              <Text style={[styles.muted, { textAlign: 'center', marginTop: 24 }]}>
                Mindestens 2 Zeichen eingeben
              </Text>
            )}
            {results.map((u) => (
              <UserRow key={u.id} u={u} right={renderActionButton(u)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  tabChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabChipTextActive: { color: '#fff' },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  avatar: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700' },
  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.full,
  },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  smallBtnMuted: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  smallBtnMutedText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    color: colors.textMuted, fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm,
  },
  empty: { alignItems: 'center', gap: spacing.md, marginTop: 48 },
  muted: { color: colors.textMuted, fontSize: 14 },
  primaryBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: radius.full,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, outlineStyle: 'none' } as any,
});
