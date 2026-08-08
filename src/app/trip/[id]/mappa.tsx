import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import { WebView } from 'react-native-webview';

import { tripRepository } from '@/repository/TripRepository';
import { Trip } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';

export default function MappaScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    tripRepository.getTrip(id).then((t) => {
      setTrip(t);
      if (t) navigation.setOptions({ headerTitle: t.meta.name });
    });
  }, [id]);

  if (!trip) return null;

  const embedUrl = `https://www.google.com/maps/d/embed?mid=${trip.map.googleMyMapsId}&ehbc=2E312F`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WebView
        source={{ uri: embedUrl }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" />
          </View>
        )}
        // disabilita lo zoom pinch-to-zoom nativo per non interferire con la mappa
        scalesPageToFit={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
