import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { tripRepository } from '@/repository/TripRepository';
import { Trip } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function MappaScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    tripRepository.getTrip(id).then((t) => {
      setTrip(t);
      if (t) navigation.setOptions({ title: t.meta.name });
    });
  }, [id]);

  if (!trip) return null;

  const { googleMyMapsId, metroMapUrl } = trip.map;
  const mapsUrl = `https://www.google.com/maps/d/viewer?mid=${googleMyMapsId}`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.four }]}
    >
      {googleMyMapsId ? (
        <Pressable
          onPress={() => Linking.openURL(mapsUrl)}
          style={[styles.card, { backgroundColor: theme.backgroundElement }]}
        >
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
              <SymbolView name="map.fill" size={28} tintColor="#1E40AF" />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Mappa del viaggio</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                Tutti i luoghi salvati · si apre in Maps
              </Text>
            </View>
            <SymbolView name="arrow.up.right.square" size={20} tintColor="#007AFF" />
          </View>
        </Pressable>
      ) : null}

      {metroMapUrl ? (
        <Pressable
          onPress={() => Linking.openURL(metroMapUrl)}
          style={[styles.card, { backgroundColor: theme.backgroundElement }]}
        >
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
              <SymbolView name="tram" size={28} tintColor="#991B1B" />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Mappa metro</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                Schema completo della rete · si apre nel browser
              </Text>
            </View>
            <SymbolView name="arrow.up.right.square" size={20} tintColor="#007AFF" />
          </View>
        </Pressable>
      ) : null}

      {!googleMyMapsId && !metroMapUrl && (
        <View style={styles.empty}>
          <SymbolView name="map" size={48} tintColor={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Nessuna mappa configurata
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.three,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 15,
  },
});
