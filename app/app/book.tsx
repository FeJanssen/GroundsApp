import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVenues } from '../src/hooks/useVenues';
import { colors, radius, spacing } from '../src/theme';

export default function BookVenue() {
  const { venues } = useVenues();
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Pressable style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.topTitle}>Platz buchen</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={venues}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: spacing.md, gap: 12 }}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/venue/${item.id}`)}>
            <Image source={{ uri: item.image }} style={s.image} />
            <View style={{ flex: 1, padding: spacing.md }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.city}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} /> {item.city}
              </Text>
              <Text style={s.price}>ab {item.pricePerHour} €</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
          </Pressable>
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, overflow: 'hidden',
  },
  image: { width: 90, height: 90 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  city: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  price: { color: colors.primary, fontSize: 13, fontWeight: '800', marginTop: 6 },
});
