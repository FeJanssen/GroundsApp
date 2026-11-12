import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, ImageBackground,
  useWindowDimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Venue } from '../../src/data/mock';
import { api, ApiEvent, FriendSuggestion } from '../../src/api/client';
import { useVenues } from '../../src/hooks/useVenues';
import { useApp } from '../../src/state/AppContext';
import { colors, radius, spacing } from '../../src/theme';

const slides = [
  {
    id: 's1',
    badge: 'Für Vereine',
    title: 'Lade jetzt deinen Verein ein',
    sub: 'Plätze verwalten, Preise festlegen & Zahlungen empfangen.',
    cta: 'Verein registrieren',
    href: '/club/auth',
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80',
  },
  {
    id: 's2',
    badge: 'Community',
    title: 'Finde dein nächstes Match',
    sub: 'Spiele gegen Gegner auf deinem Level – jederzeit.',
    cta: 'Match suchen',
    href: '/matches',
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1200&q=80',
  },
  {
    id: 's3',
    badge: 'Blitzschnell',
    title: 'Buche Plätze in Sekunden',
    sub: 'Tennis, Padel & mehr – direkt in deiner Nähe.',
    cta: 'Jetzt buchen',
    href: '/book',
    image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=1200&q=80',
  },
] as const;

function HeroSlideshow() {
  const { width } = useWindowDimensions();
  const GAP = 12;
  const slideWidth = Math.min(width, 560) - spacing.md * 2;
  const step = slideWidth + GAP;
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  // Auto-Rotation
  useEffect(() => {
    const t = setInterval(() => {
      const next = (indexRef.current + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * step, animated: true });
      indexRef.current = next;
      setIndex(next);
    }, 5000);
    return () => clearInterval(t);
  }, [step]);

  return (
    <View style={{ marginTop: spacing.md }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        style={Platform.OS === 'web' ? ({ scrollSnapType: 'x mandatory', scrollPaddingLeft: spacing.md } as any) : undefined}
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        onScroll={(e) => {
          const i = Math.min(slides.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step)));
          if (i !== indexRef.current) {
            indexRef.current = i;
            setIndex(i);
          }
        }}
        scrollEventThrottle={64}
        onMomentumScrollEnd={(e) => {
          const i = Math.min(slides.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step)));
          indexRef.current = i;
          setIndex(i);
        }}
      >
        {slides.map((sl, i) => (
          <Pressable
            key={sl.id}
            onPress={() => router.push(sl.href)}
            style={[
              { width: slideWidth, marginRight: i < slides.length - 1 ? GAP : 0 },
              Platform.OS === 'web' ? ({ scrollSnapAlign: 'start', scrollSnapStop: 'always' } as any) : null,
            ]}
          >
            <ImageBackground
              source={{ uri: sl.image }}
              style={s.slide}
              imageStyle={{ borderRadius: radius.lg }}
            >
              <LinearGradient
                colors={['rgba(10,14,18,0.15)', 'rgba(10,14,18,0.85)']}
                style={s.slideOverlay}
              >
                <View style={s.slideBadge}>
                  <Text style={s.slideBadgeText}>{sl.badge}</Text>
                </View>
                <Text style={s.slideTitle}>{sl.title}</Text>
                <Text style={s.slideSub}>{sl.sub}</Text>
                <View style={s.slideCta}>
                  <Text style={s.slideCtaText}>{sl.cta}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.bg} />
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.dots}>
        {slides.map((sl, i) => (
          <View key={sl.id} style={[s.dot, i === index && s.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const circleActions = [
  { id: 'book', label: 'Platz buchen', icon: 'calendar-outline', href: '/book' },
  { id: 'training', label: 'Training finden', icon: 'fitness-outline', href: '/trainings' },
  { id: 'events', label: 'Events suchen', icon: 'megaphone-outline', href: '/events' },
  { id: 'match', label: 'Match suchen', icon: 'people-outline', href: '/matches' },
] as const;

export default function Home() {
  const [trainings, setTrainings] = useState<ApiEvent[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [lastSearch, setLastSearch] = useState<{ q: string; near: string; radius_km: number } | null>(null);
  const [lastSearchVenues, setLastSearchVenues] = useState<Venue[]>([]);
  const { venues } = useVenues();
  const { user } = useApp();

  useFocusEffect(
    useCallback(() => {
      api.getEvents('training').then(setTrainings).catch(() => {});
      if (user) {
        api.getFriendSuggestions(user.id).then(setSuggestions).catch(() => setSuggestions([]));
        api.getNotifications(user.id).then((n) => setNotifCount(n.length)).catch(() => setNotifCount(0));
      } else {
        setSuggestions([]);
        setNotifCount(0);
      }
      // Letzte Suche laden → "Basierend auf deiner letzten Suche"
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage?.getItem('jkb_last_search') : null;
        if (raw) {
          const ls = JSON.parse(raw);
          setLastSearch(ls);
          api.searchVenues({ q: ls.q || undefined, near: ls.near || undefined, radius_km: ls.radius_km || 25 })
            .then((vs) => setLastSearchVenues(vs.slice(0, 8)))
            .catch(() => setLastSearchVenues([]));
        }
      } catch { /* ignorieren */ }
    }, [user?.id])
  );

  const addFriend = async (otherId: string) => {
    if (!user) { router.push('/login'); return; }
    try {
      await api.sendFriendRequest(user.id, otherId);
      setSuggestions((prev) => prev.filter((f) => f.id !== otherId));
    } catch { /* ignorieren */ }
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.brand}>Grounds</Text>
          <Pressable style={s.bellBtn} hitSlop={8} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
            {notifCount > 0 && <View style={s.bellDot} />}
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={s.bodyWrap}>
        <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 120 }}>
        <HeroSlideshow />

        {/* Suchleiste */}
        <Pressable style={s.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={s.searchBarText}>Vereine suchen – Name, Ort, Umkreis…</Text>
        </Pressable>

        {lastSearchVenues.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Basierend auf deiner letzten Suche</Text>
            {!!lastSearch && (
              <Text style={s.sectionSub}>
                {[lastSearch.q, lastSearch.near ? `Umkreis ${lastSearch.near} (${lastSearch.radius_km} km)` : '']
                  .filter(Boolean).join(' · ')}
              </Text>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 12 }}
            >
              {lastSearchVenues.map((v) => (
                <VenueCard key={v.id} venue={v} />
              ))}
            </ScrollView>
          </>
        )}

        <Text style={s.sectionTitle}>Vorgeschlagene Vereine</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 12 }}
        >
          {venues.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </ScrollView>

        <View style={s.circleRow}>
          {circleActions.map((a) => (
            <Pressable key={a.id} style={s.circleItem} onPress={() => router.push(a.href)}>
              <View style={s.circle}>
                <Ionicons name={a.icon as any} size={26} color={colors.text} />
              </View>
              <Text style={s.circleLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={s.friendsBtn} onPress={() => router.push('/friends')}>
          <Ionicons name="person-add-outline" size={20} color={colors.text} />
          <Text style={s.friendsText}>Freunde finden</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
        </Pressable>

        {suggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 12 }}
            style={{ marginTop: spacing.md }}
          >
            {suggestions.map((f) => (
              <Pressable key={f.id} style={s.friendCard} onPress={() => router.push(`/user/${f.id}`)}>
                {f.avatar_url ? (
                  <Image source={{ uri: f.avatar_url }} style={s.friendAvatar} />
                ) : (
                  <View style={[s.friendAvatar, s.friendAvatarFallback]}>
                    <Text style={s.friendInitial}>{f.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={s.friendName} numberOfLines={1}>{f.name}</Text>
                <Text style={s.friendSport} numberOfLines={2}>{f.grund}</Text>
                <Pressable style={s.friendAddBtn} onPress={() => addFriend(f.id)}>
                  <Ionicons name="add" size={14} color={colors.text} />
                  <Text style={s.friendAddText}>Hinzufügen</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Anstehende Trainings */}
        <Text style={s.sectionTitle}>Anstehende Trainings</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 12 }}
        >
          {trainings.map((t) => (
            <Pressable key={t.id} style={s.trainingCard} onPress={() => router.push(`/training/${t.id}`)}>
              <Text style={s.trainingPeriod}>{t.level || 'Alle Level'}</Text>
              <Text style={s.trainingTitle}>{t.titel}</Text>

              <View style={s.trainingMetaRow}>
                <View style={s.trainingMeta}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={s.trainingMetaText}>{t.datum}</Text>
                </View>
                <View style={s.trainingMeta}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Text style={s.trainingMetaText}>{t.uhrzeit_von} Uhr</Text>
                </View>
                <View style={s.trainingMeta}>
                  <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                  <Text style={s.trainingMetaText}>{t.teilnehmer.length}/{t.max_teilnehmer}</Text>
                </View>
              </View>

              <View style={s.trainingFooter}>
                <View style={{ flex: 1 }}>
                  <Text style={s.trainingClub}>{t.verein_name}</Text>
                  <Text style={s.trainingLocation}>
                    <Ionicons name="person-outline" size={11} color={colors.textMuted} /> {t.trainer || 'Trainer folgt'}
                  </Text>
                </View>
                <Text style={s.trainingPrice}>{t.preis > 0 ? `${t.preis} €` : 'Gratis'}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        </ScrollView>
      </View>
    </View>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Pressable style={s.card} onPress={() => router.push(`/venue/${venue.id}`)}>
      <Image source={{ uri: venue.image }} style={s.cardImage} />
      <View style={{ padding: spacing.sm + 4 }}>
        <Text style={s.cardTitle} numberOfLines={1}>{venue.name}</Text>
        <Text style={s.cardCity}>
          <Ionicons name="location-outline" size={11} color={colors.textMuted} /> {venue.city}
        </Text>
        <View style={s.cardFooter}>
          <View style={s.rating}>
            <Ionicons name="star" size={12} color={colors.primary} />
            <Text style={s.ratingText}>{venue.rating}</Text>
          </View>
          <Text style={s.cardPrice}>ab {venue.pricePerHour} €</Text>
        </View>
      </View>
    </Pressable>
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
  brand: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.3 },
  bellBtn: { padding: 4 },
  bellDot: {
    position: 'absolute', top: 4, right: 4, width: 8, height: 8,
    borderRadius: 4, backgroundColor: colors.danger,
  },
  sectionTitle: {
    color: colors.text, fontSize: 17, fontWeight: '700',
    marginTop: spacing.lg, marginBottom: spacing.sm + 4, paddingHorizontal: spacing.md,
  },
  sectionSub: {
    color: colors.textMuted, fontSize: 12, marginTop: -spacing.sm,
    marginBottom: spacing.sm, paddingHorizontal: spacing.md,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  searchBarText: { color: colors.textMuted, fontSize: 14 },
  card: {
    width: 230, backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 110 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardCity: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  cardPrice: { color: colors.textMuted, fontSize: 12 },
  circleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, marginTop: spacing.xl,
  },
  circleItem: { alignItems: 'center', width: 76 },
  circle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  circleLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  friendsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    marginHorizontal: spacing.md, marginTop: spacing.xl,
  },
  friendsText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  friendCard: {
    width: 120, alignItems: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  friendAvatar: { width: 52, height: 52, borderRadius: 26, marginBottom: 8 },
  friendAvatarFallback: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  friendInitial: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  friendName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  friendSport: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  friendAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 10,
  },
  friendAddText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  trainingCard: {
    width: 260,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  trainingPeriod: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  trainingTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  trainingMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginTop: 10, flexWrap: 'wrap',
  },
  trainingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trainingMetaText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  trainingFooter: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  trainingClub: { color: colors.text, fontSize: 13, fontWeight: '700' },
  trainingLocation: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  trainingPrice: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  // Slideshow
  slide: { height: 190, justifyContent: 'flex-end' },
  slideOverlay: {
    flex: 1, borderRadius: radius.lg, padding: spacing.md,
    justifyContent: 'flex-end',
  },
  slideBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.primary,
    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  slideBadgeText: { color: colors.bg, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  slideTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  slideSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  slideCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#fff', borderRadius: radius.full,
    paddingHorizontal: 14, paddingVertical: 8, marginTop: 12,
  },
  slideCtaText: { color: colors.bg, fontSize: 13, fontWeight: '800' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 18 },
});
