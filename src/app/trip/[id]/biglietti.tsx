import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

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

  useEffect(() => {
    tripRepository.getTrip(id).then((t) => {
      setTrip(t);
      if (t) navigation.setOptions({ title: t.meta.name });
    });
  }, [id]);

  if (!trip) return null;

  const openPdf = async (ticket: Ticket) => {
    const uri = tripRepository.getTicketUri(id, ticket.pdfPath);
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    }
  };

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
          onOpen={() => openPdf(ticket)}
        />
      ))}
    </ScrollView>
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
  onOpen: () => void;
}) {
  const [pdfExists, setPdfExists] = useState(false);

  useEffect(() => {
    const uri = tripRepository.getTicketUri(tripId, ticket.pdfPath);
    FileSystem.getInfoAsync(uri).then((info) => setPdfExists(info.exists));
  }, [tripId, ticket.pdfPath]);

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

      <Pressable
        onPress={onOpen}
        style={[
          styles.pdfBtn,
          { backgroundColor: pdfExists ? '#EFF6FF' : theme.background, opacity: pdfExists ? 1 : 0.4 },
        ]}
      >
        <SymbolView name="doc.fill" size={14} tintColor={pdfExists ? '#007AFF' : theme.textSecondary} />
        <Text style={[styles.pdfBtnText, { color: pdfExists ? '#007AFF' : theme.textSecondary }]}>
          {pdfExists ? 'Apri PDF' : 'PDF non disponibile'}
        </Text>
      </Pressable>
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
  dayLabel: {
    fontSize: 13,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pdfBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
