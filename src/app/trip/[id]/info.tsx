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

export default function InfoScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    console.log('[INFO] id param:', id);
    tripRepository.getTrip(id).then((t) => {
      console.log('[INFO] trip loaded:', t ? t.meta.name : 'NULL');
      setTrip(t);
      if (t) navigation.setOptions({ title: t.meta.name });
    }).catch((e) => console.error('[INFO] error:', e));
  }, [id]);

  if (!trip) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#999' }}>Caricamento...</Text>
      </View>
    );
  }

  const { flights, meta, practicalInfo, markets, oyster, bookingChecklist } = trip;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.four }]}
    >
      {/* Voli */}
      <SectionHeader title="Voli" symbol="airplane" />
      <FlightCard leg={flights.outbound} label="✈ Andata" theme={theme} />
      <FlightCard leg={flights.return} label="✈ Ritorno" theme={theme} />

      {/* Convertitore */}
      <SectionHeader title="Convertitore" symbol="arrow.left.arrow.right.circle" />
      <CurrencyConverter currency={meta.currency} theme={theme} />

      {/* Info pratiche */}
      {practicalInfo.items.length > 0 && (
        <>
          <SectionHeader title="Info pratiche" symbol="info.circle" />
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {practicalInfo.items.map((item, i) => (
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
        </>
      )}

      {/* Supermercati */}
      {markets.length > 0 && (
        <>
          <SectionHeader title="Supermercati" symbol="cart" />
          {markets.map((market, i) => (
            <MarketCard key={i} market={market} theme={theme} />
          ))}
        </>
      )}

      {/* Trasporti locali */}
      {(oyster.body.length > 0 || oyster.points.length > 0) && (
        <>
          <SectionHeader title="Trasporti locali" symbol="mappin.and.ellipse" />
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {oyster.body.map((line, i) => (
              <Text key={i} style={[styles.oysterBody, { color: theme.text }]}>{line}</Text>
            ))}
            {oyster.points.length > 0 && (
              <View style={styles.oysterPoints}>
                {oyster.points.map((pt, i) => (
                  <View key={i} style={styles.oysterPointRow}>
                    <Text style={{ color: '#007AFF' }}>•</Text>
                    <Text style={[styles.oysterPoint, { color: theme.text }]}>{pt}</Text>
                  </View>
                ))}
              </View>
            )}
            {oyster.tip ? (
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>💡 {oyster.tip}</Text>
              </View>
            ) : null}
          </View>
        </>
      )}

      {/* Checklist prenotazioni */}
      {bookingChecklist.length > 0 && (
        <>
          <SectionHeader title="Checklist prenotazioni" symbol="list.bullet" />
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {bookingChecklist.map((item, i) => (
              <View
                key={i}
                style={[
                  styles.checkRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
                ]}
              >
                <Text style={{ fontSize: 16 }}>{item.done ? '✅' : '⬜️'}</Text>
                <View style={styles.checkContent}>
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
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, symbol }: { title: string; symbol: string }) {
  return (
    <View style={styles.sectionHeader}>
      <SymbolView name={symbol as never} size={16} tintColor="#007AFF" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function FlightCard({ leg, label, theme }: { leg: FlightLeg; label: string; theme: ReturnType<typeof import('@/hooks/use-theme').useTheme> }) {
  const badgeColor = (style: string) => {
    switch (style) {
      case 'blue': return { bg: '#DBEAFE', fg: '#1E40AF' };
      case 'red': return { bg: '#FEE2E2', fg: '#991B1B' };
      case 'gold': return { bg: '#FEF3C7', fg: '#92400E' };
      default: return { bg: '#F3F4F6', fg: '#374151' };
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.flightLabel, { color: '#007AFF' }]}>{label}</Text>
      <View style={styles.flightRoute}>
        <View style={styles.flightEndpoint}>
          <Text style={[styles.flightIata, { color: theme.text }]}>{leg.from.iata}</Text>
          <Text style={[styles.flightTime, { color: theme.textSecondary }]}>{leg.from.time}</Text>
          {leg.from.terminal ? (
            <Text style={[styles.flightTerminal, { color: theme.textSecondary }]}>T{leg.from.terminal}</Text>
          ) : null}
        </View>
        <View style={styles.flightMiddle}>
          <Text style={[styles.flightDuration, { color: theme.textSecondary }]}>{leg.duration}</Text>
          <View style={[styles.flightLine, { backgroundColor: theme.textSecondary }]} />
          <Text style={[styles.flightNumber, { color: theme.textSecondary }]}>
            {leg.airline} {leg.flightNumber}
          </Text>
        </View>
        <View style={[styles.flightEndpoint, { alignItems: 'flex-end' }]}>
          <Text style={[styles.flightIata, { color: theme.text }]}>{leg.to.iata}</Text>
          <Text style={[styles.flightTime, { color: theme.textSecondary }]}>{leg.to.time}</Text>
          {leg.to.terminal ? (
            <Text style={[styles.flightTerminal, { color: theme.textSecondary }]}>T{leg.to.terminal}</Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.flightDate, { color: theme.textSecondary }]}>{leg.date}</Text>
      {leg.checklist.length > 0 && (
        <View style={styles.checklistBox}>
          <Text style={[styles.checklistTitle, { color: theme.text }]}>{leg.checklistTitle}</Text>
          {leg.checklist.map((item, i) => {
            const c = badgeColor(item.badgeStyle);
            return (
              <View key={i} style={styles.checklistItem}>
                <View style={[styles.checklistBadge, { backgroundColor: c.bg }]}>
                  <Text style={[styles.checklistBadgeText, { color: c.fg }]}>{item.badge}</Text>
                </View>
                <Text style={[styles.checklistItemText, { color: theme.text }]}>{item.text}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function CurrencyConverter({ currency, theme }: { currency: Trip['meta']['currency']; theme: ReturnType<typeof import('@/hooks/use-theme').useTheme> }) {
  const [amount, setAmount] = useState('');
  const rate = currency.fallbackRate;
  const converted = amount ? (parseFloat(amount) * rate).toFixed(2) : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.currencyRow}>
        <Text style={[styles.currencyLabel, { color: theme.text }]}>
          {currency.local.flag} {currency.local.code} → {currency.home.flag} {currency.home.code}
        </Text>
        <Text style={[styles.currencyRate, { color: theme.textSecondary }]}>
          1 {currency.local.code} = {rate} {currency.home.code}
        </Text>
      </View>
      <View style={styles.currencyInputRow}>
        <TextInput
          style={[styles.currencyInput, { backgroundColor: theme.background, color: theme.text, borderColor: 'rgba(0,0,0,0.1)' }]}
          keyboardType="decimal-pad"
          placeholder={`Importo in ${currency.local.code}`}
          placeholderTextColor={theme.textSecondary}
          value={amount}
          onChangeText={setAmount}
        />
        {converted && (
          <View style={styles.currencyResult}>
            <Text style={[styles.currencyResultAmount, { color: theme.text }]}>
              {converted}
            </Text>
            <Text style={[styles.currencyResultLabel, { color: theme.textSecondary }]}>
              {currency.home.code}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.quickAmounts}>
        {currency.quickAmounts.map((q) => (
          <Pressable
            key={q}
            onPress={() => setAmount(String(q))}
            style={[styles.quickBtn, { backgroundColor: theme.background }]}
          >
            <Text style={[styles.quickBtnText, { color: '#007AFF' }]}>
              {currency.local.flag} {q}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MarketCard({ market, theme }: { market: Market; theme: ReturnType<typeof import('@/hooks/use-theme').useTheme> }) {
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
        <View style={styles.marketInfo}>
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
        <Pressable
          onPress={() => Linking.openURL(market.mapsDirectionsUrl)}
          style={styles.guidamiBtn}
        >
          <SymbolView name="map.fill" size={13} tintColor="#007AFF" />
          <Text style={styles.guidamiText}>Guidami</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#007AFF',
  },
  // Flight
  flightLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flightRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  flightEndpoint: {
    alignItems: 'flex-start',
    gap: 2,
  },
  flightIata: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  flightTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  flightTerminal: {
    fontSize: 12,
  },
  flightMiddle: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
  },
  flightDuration: {
    fontSize: 12,
  },
  flightLine: {
    height: 1,
    width: '100%',
    opacity: 0.3,
  },
  flightNumber: {
    fontSize: 11,
    fontWeight: '500',
  },
  flightDate: {
    fontSize: 13,
  },
  checklistBox: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  checklistItem: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  checklistBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  checklistBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checklistItemText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  // Currency
  currencyRow: {
    gap: 2,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyRate: {
    fontSize: 13,
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  currencyInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  currencyResult: {
    alignItems: 'flex-end',
  },
  currencyResultAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  currencyResultLabel: {
    fontSize: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Practical info
  infoItem: {
    paddingVertical: Spacing.two,
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Markets
  marketHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  marketLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  marketLogoLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
  },
  marketInfo: {
    flex: 1,
    gap: 2,
  },
  marketNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  marketName: {
    fontSize: 16,
    fontWeight: '700',
  },
  marketTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  marketTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  marketAddress: {
    fontSize: 13,
  },
  marketDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  marketHours: {
    fontSize: 12,
    lineHeight: 18,
  },
  guidamiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
  },
  guidamiText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  // Oyster
  oysterBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  oysterPoints: {
    gap: 6,
    paddingTop: Spacing.one,
  },
  oysterPointRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  oysterPoint: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  tipBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  // Checklist
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  checkContent: {
    flex: 1,
    gap: 2,
  },
  checkName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  checkNote: {
    fontSize: 13,
    lineHeight: 18,
  },
});
