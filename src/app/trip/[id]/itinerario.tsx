import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { tripRepository } from '@/repository/TripRepository';
import { Trip, TripEvent } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function ItinerarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tripRepository.getTrip(id).then((t) => {
      setTrip(t);
      if (t) navigation.setOptions({ title: t.meta.name });
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <SymbolView name="exclamationmark.triangle" size={48} tintColor={theme.textSecondary} />
        <Text style={[styles.centerText, { color: theme.textSecondary }]}>Viaggio non trovato</Text>
      </View>
    );
  }

  if (trip.days.length === 0) {
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

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.four }]}
    >
      {trip.days.map((day) => (
        <View key={day.n} style={[styles.dayCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayNumber, { color: dayNumberColor(day.style) }]}>
              Giorno {day.n}
            </Text>
            <Text style={[styles.dayDate, { color: theme.textSecondary }]}>{day.dateLabel}</Text>
          </View>
          <Text style={[styles.dayTitle, { color: theme.text }]}>{day.title}</Text>
          {day.subtitle ? (
            <Text style={[styles.daySubtitle, { color: theme.textSecondary }]}>{day.subtitle}</Text>
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
          {day.events.length > 0 && (
            <View style={styles.events}>
              {day.events.map((ev, i) => (
                <EventRow key={i} event={ev} theme={theme} />
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function EventRow({ event, theme }: { event: TripEvent; theme: ReturnType<typeof import('@/hooks/use-theme').useTheme> }) {
  const openMaps = () => {
    const encoded = encodeURIComponent(event.placeGuide ?? '');
    Linking.openURL(`maps:?q=${encoded}`);
  };

  return (
    <View style={[styles.eventRow, { borderTopColor: theme.backgroundElement }]}>
      <View style={[styles.eventDot, { backgroundColor: dotColor(event.type) }]} />
      <View style={styles.eventContent}>
        <View style={styles.eventTopRow}>
          <Text style={[styles.eventTime, { color: theme.textSecondary }]}>{event.time}</Text>
          {event.type === 'booked' && event.showBookingBadge !== false && (
            <View style={styles.bookedBadge}>
              <Text style={styles.bookedBadgeText}>✓ Prenotato</Text>
            </View>
          )}
        </View>
        <Text style={[styles.eventName, { color: theme.text }]}>{event.name}</Text>
        {event.description ? (
          <Text style={[styles.eventDesc, { color: theme.textSecondary }]}>{event.description}</Text>
        ) : null}
        {event.tip ? (
          <View style={styles.tipRow}>
            <Text style={styles.tipText}>💡 {event.tip}</Text>
          </View>
        ) : null}
        {event.alert ? (
          <View style={styles.alertRow}>
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

function dotColor(type: string): string {
  switch (type) {
    case 'booked': return '#C8102E';
    case 'meal': return '#C5A028';
    case 'logistics': return '#6B6B6B';
    default: return '#012169';
  }
}

function dayNumberColor(style: string): string {
  switch (style) {
    case 'special': return '#C8102E';
    case 'gold': return '#C5A028';
    case 'last': return '#444444';
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centerTitle: { fontSize: 20, fontWeight: '600' },
  centerText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  list: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  dayCard: {
    borderRadius: 16,
    padding: Spacing.three,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dayDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  daySubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.two,
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
  events: {
    marginTop: Spacing.two,
    gap: 0,
  },
  eventRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.07)',
    marginTop: Spacing.two,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  eventContent: {
    flex: 1,
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
  bookedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },
  eventName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  eventDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipRow: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tipText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  alertRow: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
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
    paddingVertical: 4,
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
});
