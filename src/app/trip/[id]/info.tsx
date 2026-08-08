import { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { tripRepository } from '@/repository/TripRepository';
import { FlightLeg, Market, Trip } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Section = 'cambio' | 'voli' | 'supermercati' | 'info' | 'altro';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'cambio', label: 'Cambio' },
  { key: 'voli', label: 'Voli' },
  { key: 'supermercati', label: 'Supermercati' },
  { key: 'info', label: 'Info' },
  { key: 'altro', label: 'Altro' },
];

export default function InfoScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [section, setSection] = useState<Section>('cambio');

  useEffect(() => {
    tripRepository.getTrip(id).then((t) => {
      setTrip(t);
      if (t) navigation.setOptions({ headerTitle: t.meta.name });
    });
  }, [id]);

  if (!trip) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Caricamento...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Pill nav */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.pillBar, { borderBottomColor: theme.backgroundElement }]}
        contentContainerStyle={styles.pillBarContent}
      >
        {SECTIONS.map((s) => {
          const active = s.key === section;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSection(s.key)}
              style={[
                styles.pill,
                active
                  ? { backgroundColor: '#007AFF' }
                  : { backgroundColor: theme.backgroundElement },
              ]}
            >
              <Text style={[styles.pillText, { color: active ? 'white' : theme.textSecondary }]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Contenuto sezione */}
      <ScrollView
        key={section}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.four }]}
      >
        {section === 'cambio' && <CambioSection trip={trip} theme={theme} />}
        {section === 'voli' && <VoliSection trip={trip} theme={theme} />}
        {section === 'supermercati' && <SupermercatiSection trip={trip} theme={theme} />}
        {section === 'info' && <InfoSection trip={trip} theme={theme} />}
        {section === 'altro' && <AltroSection trip={trip} theme={theme} />}
      </ScrollView>
    </View>
  );
}

// ─── Cambio ───────────────────────────────────────────────────────────────────

function CambioSection({ trip, theme }: { trip: Trip; theme: TH }) {
  const { currency } = trip.meta;
  const [amount, setAmount] = useState('');
  const rate = currency.fallbackRate;
  const converted = amount ? (parseFloat(amount) * rate).toFixed(2) : null;

  return (
    <View style={styles.section}>
      {/* Display grande */}
      <View style={[styles.converterDisplay, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.converterRow}>
          <Text style={[styles.currencyFlag]}>{currency.local.flag}</Text>
          <TextInput
            style={[styles.converterInput, { color: theme.text }]}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={[styles.converterCode, { color: theme.textSecondary }]}>
            {currency.local.code}
          </Text>
        </View>
        <View style={[styles.converterDivider, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
        <View style={styles.converterRow}>
          <Text style={styles.currencyFlag}>{currency.home.flag}</Text>
          <Text style={[styles.converterResult, { color: converted ? theme.text : theme.textSecondary }]}>
            {converted ?? '0'}
          </Text>
          <Text style={[styles.converterCode, { color: theme.textSecondary }]}>
            {currency.home.code}
          </Text>
        </View>
        <Text style={[styles.rateNote, { color: theme.textSecondary }]}>
          1 {currency.local.code} = {rate} {currency.home.code}
        </Text>
      </View>

      {/* Quick amounts */}
      <View style={styles.quickRow}>
        {currency.quickAmounts.map((q) => (
          <Pressable
            key={q}
            onPress={() => setAmount(String(q))}
            style={[styles.quickBtn, { backgroundColor: theme.backgroundElement }]}
          >
            <Text style={styles.quickFlag}>{currency.local.flag}</Text>
            <Text style={[styles.quickAmount, { color: theme.text }]}>{q}</Text>
          </Pressable>
        ))}
      </View>

      {/* Risultati veloci */}
      {currency.quickAmounts.map((q) => {
        const res = (q * rate).toFixed(2);
        return (
          <View key={q} style={[styles.quickResult, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.quickResultFrom, { color: theme.textSecondary }]}>
              {currency.local.flag} {q} {currency.local.code}
            </Text>
            <Text style={[styles.quickResultTo, { color: theme.text }]}>
              {currency.home.flag} {res} {currency.home.code}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Voli ─────────────────────────────────────────────────────────────────────

function VoliSection({ trip, theme }: { trip: Trip; theme: TH }) {
  return (
    <View style={styles.section}>
      <FlightCard leg={trip.flights.outbound} label="Andata" theme={theme} />
      <FlightCard leg={trip.flights.return} label="Ritorno" theme={theme} />
    </View>
  );
}

function FlightCard({ leg, label, theme }: { leg: FlightLeg; label: string; theme: TH }) {
  const badgeColors = (style: string) => {
    switch (style) {
      case 'blue': return { bg: '#DBEAFE', fg: '#1E40AF' };
      case 'red': return { bg: '#FEE2E2', fg: '#991B1B' };
      case 'gold': return { bg: '#FEF3C7', fg: '#92400E' };
      default: return { bg: '#F3F4F6', fg: '#374151' };
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Text style={styles.flightLabel}>{label}</Text>

      <View style={styles.flightRoute}>
        <View style={styles.flightEndpoint}>
          <Text style={[styles.flightIata, { color: theme.text }]}>{leg.from.iata}</Text>
          <Text style={[styles.flightTime, { color: theme.text }]}>{leg.from.time}</Text>
          {leg.from.terminal ? (
            <Text style={[styles.flightTerminal, { color: theme.textSecondary }]}>Terminal {leg.from.terminal}</Text>
          ) : null}
        </View>
        <View style={styles.flightArrow}>
          <Text style={[styles.flightDuration, { color: theme.textSecondary }]}>{leg.duration}</Text>
          <SymbolView name="arrow.right" size={16} tintColor={theme.textSecondary} />
          <Text style={[styles.flightNum, { color: theme.textSecondary }]}>
            {leg.airline} {leg.flightNumber}
          </Text>
        </View>
        <View style={[styles.flightEndpoint, { alignItems: 'flex-end' }]}>
          <Text style={[styles.flightIata, { color: theme.text }]}>{leg.to.iata}</Text>
          <Text style={[styles.flightTime, { color: theme.text }]}>{leg.to.time}</Text>
          {leg.to.terminal ? (
            <Text style={[styles.flightTerminal, { color: theme.textSecondary }]}>Terminal {leg.to.terminal}</Text>
          ) : null}
        </View>
      </View>

      <Text style={[styles.flightDate, { color: theme.textSecondary }]}>{leg.date}</Text>

      {leg.trackingUrl ? (
        <Pressable
          onPress={() => Linking.openURL(leg.trackingUrl)}
          style={styles.trackBtn}
        >
          <SymbolView name="antenna.radiowaves.left.and.right" size={14} tintColor="#007AFF" />
          <Text style={styles.trackBtnText}>Traccia volo in tempo reale</Text>
        </Pressable>
      ) : null}

      {leg.checklist.length > 0 && (
        <View style={[styles.checklist, { borderTopColor: 'rgba(0,0,0,0.08)' }]}>
          <Text style={[styles.checklistTitle, { color: theme.text }]}>{leg.checklistTitle}</Text>
          {leg.checklist.map((item, i) => {
            const c = badgeColors(item.badgeStyle);
            return (
              <View key={i} style={styles.checklistItem}>
                <View style={[styles.badge, { backgroundColor: c.bg }]}>
                  <Text style={[styles.badgeText, { color: c.fg }]}>{item.badge}</Text>
                </View>
                <Text style={[styles.checklistText, { color: theme.text }]}>{item.text}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Supermercati ─────────────────────────────────────────────────────────────

function SupermercatiSection({ trip, theme }: { trip: Trip; theme: TH }) {
  if (!trip.markets.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nessun supermercato</Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      {trip.markets.map((market, i) => (
        <MarketCard key={i} market={market} theme={theme} />
      ))}
    </View>
  );
}

function MarketCard({ market, theme }: { market: Market; theme: TH }) {
  const tagColor = (style: string) => {
    switch (style) {
      case 'red': return { bg: '#FEE2E2', fg: '#991B1B' };
      case 'blue': return { bg: '#DBEAFE', fg: '#1E40AF' };
      default: return { bg: '#F3F4F6', fg: '#374151' };
    }
  };
  const tc = tagColor(market.tagStyle);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.marketHeader}>
        <View style={[styles.marketLogo, { backgroundColor: market.logoColor }]}>
          <Text style={styles.marketLogoLetter}>{market.logoLetter}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.marketNameRow}>
            <Text style={[styles.marketName, { color: theme.text }]}>{market.name}</Text>
            <View style={[styles.marketTag, { backgroundColor: tc.bg }]}>
              <Text style={[styles.marketTagText, { color: tc.fg }]}>{market.tag}</Text>
            </View>
          </View>
          <Text style={[styles.marketAddress, { color: theme.textSecondary }]}>{market.address}</Text>
        </View>
      </View>
      {market.description ? (
        <Text style={[styles.marketDesc, { color: theme.textSecondary }]}>{market.description}</Text>
      ) : null}
      {market.hours ? (
        <Text style={[styles.marketHours, { color: theme.textSecondary }]}>🕐 {market.hours}</Text>
      ) : null}
      {market.mapsDirectionsUrl ? (
        <Pressable onPress={() => Linking.openURL(market.mapsDirectionsUrl)} style={styles.guidamiBtn}>
          <SymbolView name="map.fill" size={13} tintColor="#007AFF" />
          <Text style={styles.guidamiText}>Guidami</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Info pratiche ────────────────────────────────────────────────────────────

function InfoSection({ trip, theme }: { trip: Trip; theme: TH }) {
  if (!trip.practicalInfo.items.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nessuna info pratica</Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        {trip.practicalInfo.items.map((item, i) => (
          <View
            key={i}
            style={[
              styles.infoItem,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
            ]}
          >
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{item.value}</Text>
            {item.sub ? (
              <Text style={[styles.infoSub, { color: theme.textSecondary }]}>{item.sub}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Altro ────────────────────────────────────────────────────────────────────

function AltroSection({ trip, theme }: { trip: Trip; theme: TH }) {
  return (
    <View style={styles.section}>
      {/* Oyster / trasporti locali */}
      {(trip.oyster.body.length > 0 || trip.oyster.points.length > 0) && (
        <>
          <Text style={[styles.altroHeader, { color: theme.textSecondary }]}>TRASPORTI LOCALI</Text>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {trip.oyster.body.map((line, i) => (
              <Text key={i} style={[styles.oysterBody, { color: theme.text }]}>{line}</Text>
            ))}
            {trip.oyster.points.map((pt, i) => (
              <View key={i} style={styles.oysterPointRow}>
                <Text style={{ color: '#007AFF' }}>•</Text>
                <Text style={[styles.oysterPoint, { color: theme.text }]}>{pt}</Text>
              </View>
            ))}
            {trip.oyster.tip ? (
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>💡 {trip.oyster.tip}</Text>
              </View>
            ) : null}
          </View>
        </>
      )}

      {/* Checklist prenotazioni */}
      {trip.bookingChecklist.length > 0 && (
        <>
          <Text style={[styles.altroHeader, { color: theme.textSecondary }]}>CHECKLIST PRENOTAZIONI</Text>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {trip.bookingChecklist.map((item, i) => (
              <View
                key={i}
                style={[
                  styles.checkRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
                ]}
              >
                <Text style={{ fontSize: 16 }}>{item.done ? '✅' : '⬜️'}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.checkName, { color: theme.text }]}>{item.name}</Text>
                  {item.note ? (
                    <Text style={[styles.checkNote, { color: theme.textSecondary }]}>{item.note}</Text>
                  ) : null}
                </View>
                {item.url ? (
                  <Pressable onPress={() => Linking.openURL(item.url!)}>
                    <SymbolView name="arrow.up.right.square" size={18} tintColor="#007AFF" />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Types & Styles ───────────────────────────────────────────────────────────

type TH = ReturnType<typeof import('@/hooks/use-theme').useTheme>;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pillBar: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  pillBarContent: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.one },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  pillText: { fontSize: 14, fontWeight: '600' },
  scroll: { padding: Spacing.three, gap: Spacing.two },
  section: { gap: Spacing.two },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15 },

  // Cambio
  converterDisplay: { borderRadius: 20, padding: Spacing.three, gap: 0 },
  converterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  currencyFlag: { fontSize: 28 },
  converterInput: { flex: 1, fontSize: 36, fontWeight: '300' },
  converterResult: { flex: 1, fontSize: 36, fontWeight: '300' },
  converterCode: { fontSize: 16, fontWeight: '600', width: 44, textAlign: 'right' },
  converterDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: -Spacing.three },
  rateNote: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  quickBtn: { flex: 1, minWidth: 70, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: 12, gap: 2 },
  quickFlag: { fontSize: 20 },
  quickAmount: { fontSize: 15, fontWeight: '700' },
  quickResult: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  quickResultFrom: { fontSize: 14 },
  quickResultTo: { fontSize: 14, fontWeight: '600' },

  // Voli
  flightLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#007AFF' },
  flightRoute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  flightEndpoint: { gap: 2 },
  flightIata: { fontSize: 30, fontWeight: '700', letterSpacing: 1 },
  flightTime: { fontSize: 15, fontWeight: '600' },
  flightTerminal: { fontSize: 12 },
  flightArrow: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: Spacing.two },
  flightDuration: { fontSize: 12 },
  flightNum: { fontSize: 11 },
  flightDate: { fontSize: 13 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#EFF6FF', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14 },
  trackBtnText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  checklist: { gap: Spacing.two, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  checklistTitle: { fontSize: 14, fontWeight: '600' },
  checklistItem: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  checklistText: { fontSize: 13, flex: 1, lineHeight: 18 },

  // Supermercati
  marketHeader: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  marketLogo: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  marketLogoLetter: { fontSize: 22, fontWeight: '800', color: 'white' },
  marketNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marketName: { fontSize: 16, fontWeight: '700' },
  marketTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  marketTagText: { fontSize: 11, fontWeight: '600' },
  marketAddress: { fontSize: 13 },
  marketDesc: { fontSize: 13, lineHeight: 18 },
  marketHours: { fontSize: 12, lineHeight: 18 },
  guidamiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#EFF6FF' },
  guidamiText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },

  // Info pratiche
  infoItem: { paddingVertical: Spacing.two, gap: 2 },
  infoLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  infoSub: { fontSize: 13, lineHeight: 18 },

  // Altro
  altroHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 4, marginTop: Spacing.two },
  oysterBody: { fontSize: 14, lineHeight: 20 },
  oysterPointRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  oysterPoint: { fontSize: 13, lineHeight: 18, flex: 1 },
  tipBox: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginTop: 4 },
  tipText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.two, gap: Spacing.two },
  checkName: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  checkNote: { fontSize: 13, lineHeight: 18 },
});
