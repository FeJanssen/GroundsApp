import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, AppNotification } from '../src/api/client';
import { useApp } from '../src/state/AppContext';
import { colors, radius, spacing } from '../src/theme';

const ICON_COLOR: Record<string, string> = {
  friend_request: colors.primary,
  booking: '#7BA76A',
  event: '#C9A86A',
};

export default function NotificationsScreen() {
  const { user } = useApp();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setItems(await api.getNotifications(user.id));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Benachrichtigungen</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !user ? (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
            <Text style={s.muted}>Melde dich an, um Benachrichtigungen zu sehen.</Text>
            <Pressable style={s.primaryBtn} onPress={() => router.push('/login')}>
              <Text style={s.primaryBtnText}>Zum Login</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="checkmark-done-outline" size={40} color={colors.textMuted} />
            <Text style={s.muted}>Alles erledigt – keine Neuigkeiten!</Text>
          </View>
        ) : (
          items.map((n, i) => (
            <Pressable key={`${n.type}-${i}`} style={s.row} onPress={() => router.push(n.link as any)}>
              <View style={[s.iconWrap, { backgroundColor: `${ICON_COLOR[n.type] ?? colors.primary}22` }]}>
                <Ionicons name={`${n.icon}-outline` as any} size={20} color={ICON_COLOR[n.type] ?? colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowTitle}>{n.title}</Text>
                <Text style={s.rowText} numberOfLines={2}>{n.text}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowText: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', gap: spacing.md, marginTop: 60 },
  muted: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: radius.full,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
