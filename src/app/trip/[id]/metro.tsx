import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { WebView } from 'react-native-webview';

import { tripRepository } from '@/repository/TripRepository';
import { Trip } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function MetroScreen() {
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

  const { metroMapUrl } = trip.map;

  if (!metroMapUrl) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <SymbolView name="tram" size={48} tintColor={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Nessuna mappa metro configurata
        </Text>
      </View>
    );
  }

  // Altezza fissa 100vh, larghezza auto: la mappa riempie sempre lo schermo in verticale.
  // Se è più larga dello schermo (es. mappa London Underground) scorre orizzontalmente.
  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes, maximum-scale=8">
<style>
  * { margin: 0; padding: 0; }
  html, body {
    background: #1a1a1a;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
  }
  img {
    display: block;
    height: 100vh;
    width: auto;
  }
</style>
</head>
<body>
  <img src="${metroMapUrl}" />
</body>
</html>`;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="white" />
          </View>
        )}
        scalesPageToFit={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  webview: { flex: 1, backgroundColor: '#1a1a1a' },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
