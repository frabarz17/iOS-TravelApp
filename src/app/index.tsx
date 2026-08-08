import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { tripRepository } from '@/repository/TripRepository';
import { TripSummary } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const summaries = await tripRepository.getAllTripSummaries();
      setTrips(summaries);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleNewTrip = async () => {
    const id = `trip-${Date.now()}`;
    const trip = tripRepository.createEmpty(id);
    await tripRepository.saveTrip(trip);
    router.push(`/trip/${id}/itinerario`);
  };

  const handleDeleteTrip = (id: string, name: string) => {
    Alert.alert(
      'Elimina viaggio',
      `Vuoi eliminare "${name}"? L'azione non è reversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await tripRepository.deleteTrip(id);
            loadTrips();
          },
        },
      ],
    );
  };

  const renderTrip = ({ item }: { item: TripSummary }) => (
    <Pressable
      onPress={() => router.push(`/trip/${item.id}/itinerario`)}
      onLongPress={() => handleDeleteTrip(item.id, item.name)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={styles.flag}>{item.flag}</Text>
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.subtitle}
        </Text>
        <Text style={[styles.cardDates, { color: theme.textSecondary }]}>
          {formatDate(item.startDate)} – {formatDate(item.endDate)}
        </Text>
      </View>
      <SymbolView name="chevron.right" size={16} tintColor={theme.textSecondary} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + Spacing.three }]}>
        <Text style={[styles.header, { color: theme.text }]}>I miei viaggi</Text>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={renderTrip}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + Spacing.six + Spacing.four },
        ]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <SymbolView name="airplane" size={56} tintColor={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Nessun viaggio</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Tappa + per creare il tuo primo viaggio
              </Text>
            </View>
          ) : null
        }
        onRefresh={loadTrips}
        refreshing={loading}
      />

      <Pressable
        onPress={handleNewTrip}
        style={[styles.fab, { bottom: insets.bottom + Spacing.four }]}
      >
        <SymbolView name="plus" size={24} tintColor="white" />
      </Pressable>
    </View>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '–';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const month = months[parseInt(parts[1], 10) - 1] ?? '';
  return `${parseInt(parts[2], 10)} ${month} ${parts[0]}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  flag: {
    fontSize: 44,
    lineHeight: 52,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  cardDates: {
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: 100,
    paddingHorizontal: Spacing.five,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
