import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { tripRepository } from '@/repository/TripRepository';
import { Trip, TripDay, TripEvent } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function ItinerarioScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const tabScrollRef = useRef<ScrollView>(null);
  const loading = trip === null;

  useEffect(() => {
    tripRepository.getTrip(id).then((t) => {
      if (!t) return;
      setTrip(t);
      navigation.setOptions({ headerTitle: t.meta.name });

      // auto-seleziona il giorno corrente
      const today = new Date().toISOString().slice(0, 10);
      const idx = t.days.findIndex((d) => d.date === today);
      setSelectedIdx(idx >= 0 ? idx : 0);
    });
  }, [id]);

  // scrolla il tab bar sul giorno selezionato
  useEffect(() => {
    if (!trip) return;
    // ogni tab è circa 64px di larghezza
    const TAB_WIDTH = 64;
    tabScrollRef.current?.scrollTo({
      x: Math.max(0, selectedIdx * TAB_WIDTH - 120),
      animated: true,
    });
  }, [selectedIdx, trip]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!trip || trip.days.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <SymbolView name="calendar.badge.plus" size={48} tintColor={theme.textSecondary} />
        <Text style={[styles.centerTitle, { color: theme.text }]}>Nessun giorno</Text>
        <Text style={[styles.centerText, { color: theme.textSecondary }]}>
          Aggiungi giorni al viaggio per vedere l'itinerario
        </Text>
      </View>
    );
  }

  const day = trip.days[selectedIdx];
  const primary = trip.meta.theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tab giorni */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: theme.backgroundElement }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {trip.days.map((d, i) => {
          const active = i === selectedIdx;
          const color = active ? primary : theme.textSecondary;
          return (
            <Pressable key={i} onPress={() => setSelectedIdx(i)} style={styles.tab}>
              <Text style={[styles.tabDayN, { color }]}>G{d.n}</Text>
              <Text style={[styles.tabDate, { color }]}>{d.dateLabel}</Text>
              {active && <View style={[styles.tabIndicator, { backgroundColor: primary }]} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Contenuto giorno selezionato */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.dayContent, { paddingBottom: insets.bottom + Spacing.four }]}
      >
        <DayCard day={day} theme={theme} />
      </ScrollView>
    </View>
  );
}

function DayCard({ day, theme }: { day: TripDay; theme: ReturnType<typeof import('@/hooks/use-theme').useTheme> }) {
  return (
    <View style={styles.dayCard}>
      {/* Intestazione giorno */}
      <View style={[styles.dayHeader, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.dayTitle, { color: theme.text }]}>{day.title}</Text>
        {day.subtitle ? (
          <Text style={[styles.daySubtitle, { color: theme.textSecondary }]}>{day.subtitle}</Text>
        ) : null}
        {day.zone ? (
          <View style={styles.zoneRow}>
            <SymbolView name="location.fill" size={12} tintColor={theme.textSecondary} />
            <Text style={[styles.zone, { color: theme.textSecondary }]}>{day.zone}</Text>
          </View>
        ) : null}
        {day.badges.length > 0 && (
          <View style={styles.badgeRow}>
            {day.badges.map((b, i) => (
              <View key={i} style={[styles.badge, { backgroundColor: badgeBg(b.color) }]}>
                <Text style={[styles.badgeText, { color: badgeFg(b.color) }]}>{b.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Timeline eventi */}
      {day.events.map((ev, i) => (
        <EventRow key={i} event={ev} theme={theme} isLast={i === day.events.length - 1} />
      ))}

      {/* Note giorno */}
      {day.dayDescription ? (
        <View style={[styles.noteBox, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.noteText, { color: theme.textSecondary }]}>{day.dayDescription}</Text>
        </View>
      ) : null}
    </View>
  );
}

function EventRow({
  event,
  theme,
  isLast,
}: {
  event: TripEvent;
  theme: ReturnType<typeof import('@/hooks/use-theme').useTheme>;
  isLast: boolean;
}) {
  const openMaps = () => {
    Linking.openURL(`maps:?q=${encodeURIComponent(event.placeGuide ?? '')}`);
  };

  return (
    <View style={[styles.eventRow, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.eventLeft}>
        <View style={[styles.dot, { backgroundColor: dotColor(event.type) }]} />
        {!isLast && <View style={[styles.line, { backgroundColor: theme.backgroundElement }]} />}
      </View>
      <View style={styles.eventBody}>
        <View style={styles.eventTopRow}>
          <Text style={[styles.eventTime, { color: theme.textSecondary }]}>{event.time}</Text>
          {event.type === 'booked' && event.showBookingBadge !== false && (
            <View style={styles.bookedBadge}>
              <Text style={styles.bookedText}>✓ Prenotato</Text>
            </View>
          )}
        </View>
        <Text style={[styles.eventName, { color: theme.text }]}>{event.name}</Text>
        {event.description ? (
          <Text style={[styles.eventDesc, { color: theme.textSecondary }]}>{event.description}</Text>
        ) : null}
        {event.tip ? (
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>💡 {event.tip}</Text>
          </View>
        ) : null}
        {event.alert ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⚠️ {event.alert}</Text>
          </View>
        ) : null}
        {event.placeGuide ? (
          <Pressable onPress={openMaps} style={styles.guidamiBtn}>
            <SymbolView name="map.fill" size={13} tintColor="#007AFF" />
            <Text style={styles.guidamiText}>Guidami</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dotColor(type: string): string {
  switch (type) {
    case 'booked': return '#C8102E';
    case 'meal': return '#C5A028';
    case 'logistics': return '#6B6B6B';
    default: return '#012169';
  }
}

function badgeBg(color: string): string {
  switch (color) {
    case 'red': return '#FEE2E2';
    case 'gold': return '#FEF3C7';
    case 'blue': return '#DBEAFE';
    default: return '#F3F4F6';
  }
}

function badgeFg(color: string): string {
  switch (color) {
    case 'red': return '#991B1B';
    case 'gold': return '#92400E';
    case 'blue': return '#1E40AF';
    default: return '#374151';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centerTitle: { fontSize: 20, fontWeight: '600' },
  centerText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Tab bar
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: Spacing.two,
  },
  tab: {
    width: 64,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: 2,
    position: 'relative',
  },
  tabDayN: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabDate: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
  },

  // Day content
  dayContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dayCard: {
    gap: Spacing.two,
  },
  dayHeader: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  dayTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  daySubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  zone: {
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.one,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Timeline
  eventRow: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventLeft: {
    width: 32,
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    opacity: 0.3,
  },
  eventBody: {
    flex: 1,
    padding: Spacing.three,
    paddingLeft: Spacing.two,
    gap: 4,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bookedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  eventDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  alertBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
  },
  alertText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
  },
  guidamiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    marginTop: 2,
  },
  guidamiText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  noteBox: {
    borderRadius: 12,
    padding: Spacing.three,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
