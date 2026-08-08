import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';

import { tripRepository } from '@/repository/TripRepository';
import { Ticket, Trip } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function BigliettiScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [viewingUri, setViewingUri] = useState<string | null>(null);

  useEffect(() => {
    tripRepository.getTrip(id).then((t) => {
      setTrip(t);
      if (t) navigation.setOptions({ headerTitle: t.meta.name });
    });
  }, [id]);

  if (!trip) return null;

  const tickets = trip.tickets;

  if (tickets.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.background }]}>
        <SymbolView name="ticket" size={48} tintColor={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Nessun biglietto</Text>
        <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
          I biglietti aggiunti al viaggio appariranno qui
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.four }]}
      >
        {tickets.map((ticket, i) => (
          <TicketCard
            key={i}
            ticket={ticket}
            theme={theme}
            tripId={id}
            onOpen={(uri) => setViewingUri(uri)}
          />
        ))}
      </ScrollView>

      {/* PDF viewer modal — inline, senza uscire dall'app */}
      <Modal
        visible={!!viewingUri}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewingUri(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setViewingUri(null)} style={styles.closeBtn}>
              <SymbolView name="xmark.circle.fill" size={28} tintColor="#8E8E93" />
            </Pressable>
          </View>
          {viewingUri && (
            <WebView
              source={{ uri: viewingUri }}
              style={styles.pdfViewer}
              originWhitelist={['file://*', 'http://*', 'https://*']}
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

function TicketCard({
  ticket,
  theme,
  tripId,
  onOpen,
}: {
  ticket: Ticket;
  theme: ReturnType<typeof import('@/hooks/use-theme').useTheme>;
  tripId: string;
  onOpen: (uri: string) => void;
}) {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const localUri = tripRepository.getTicketUri(tripId, ticket.pdfPath);

  useEffect(() => {
    FileSystem.getInfoAsync(localUri).then((info) => {
      if (info.exists) setPdfUri(localUri);
    });
  }, [localUri]);

  const importPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const picked = result.assets[0].uri;
    const dir = localUri.substring(0, localUri.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.copyAsync({ from: picked, to: localUri });
    setPdfUri(localUri);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, { backgroundColor: ticket.isVip ? '#FEF3C7' : '#EFF6FF' }]}>
          <SymbolView
            name="ticket.fill"
            size={26}
            tintColor={ticket.isVip ? '#92400E' : '#1E40AF'}
          />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.ticketName, { color: theme.text }]} numberOfLines={2}>
              {ticket.name}
            </Text>
            {ticket.isVip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
          </View>
          <Text style={[styles.dayLabel, { color: theme.textSecondary }]}>{ticket.dayLabel}</Text>
        </View>
      </View>

      {pdfUri ? (
        <Pressable onPress={() => onOpen(pdfUri)} style={styles.pdfBtn}>
          <SymbolView name="doc.fill" size={14} tintColor="#007AFF" />
          <Text style={styles.pdfBtnText}>Apri PDF</Text>
        </Pressable>
      ) : (
        <Pressable onPress={importPdf} style={styles.importBtn}>
          <SymbolView name="arrow.down.doc.fill" size={14} tintColor="#34C759" />
          <Text style={styles.importBtnText}>Collega PDF da Files</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptyHint: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  scroll: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTop: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flexWrap: 'wrap',
  },
  ticketName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  vipBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  vipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  dayLabel: { fontSize: 13 },

  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pdfBtnText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },

  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FFF4',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  importBtnText: { fontSize: 13, fontWeight: '600', color: '#34C759' },

  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.two,
  },
  closeBtn: {
    padding: 4,
  },
  pdfViewer: {
    flex: 1,
  },
});
