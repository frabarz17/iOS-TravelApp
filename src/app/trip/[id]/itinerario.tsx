import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { tripRepository } from '@/repository/TripRepository';
import { Trip } from '@/types/trip';
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
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Viaggio non trovato</Text>
      </View>
    );
  }

  if (trip.days.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <SymbolView name="calendar.badge.plus" size={48} tintColor={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Nessun giorno</Text>
        <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
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
            <Text style={[styles.dayNumber, { color: '#007AFF' }]}>Giorno {day.n}</Text>
            <Text style={[styles.dayDate, { color: theme.textSecondary }]}>{day.dateLabel}</Text>
          </View>
          <Text style={[styles.dayTitle, { color: theme.text }]}>{day.title}</Text>
          {day.subtitle ? (
            <Text style={[styles.daySubtitle, { color: theme.textSecondary }]}>{day.subtitle}</Text>
          ) : null}
          {day.events.length > 0 && (
            <View style={styles.events}>
              {day.events.map((ev, i) => (
                <View key={i} style={styles.eventRow}>
                  <View style={[styles.eventDot, { backgroundColor: dotColor(ev.type) }]} />
                  <View style={styles.eventContent}>
                    <Text style={[styles.eventTime, { color: theme.textSecondary }]}>{ev.time}</Text>
                    <Text style={[styles.eventName, { color: theme.text }]}>{ev.name}</Text>
                    {ev.description ? (
                      <Text style={[styles.eventDesc, { color: theme.textSecondary }]}>{ev.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  errorText: { fontSize: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptyHint: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
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
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayDate: {
    fontSize: 13,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  daySubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  events: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  eventRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  eventContent: {
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventName: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventDesc: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
