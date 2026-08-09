import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { tripRepository } from '@/repository/TripRepository';
import { Trip, TripSummary } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import londonTripJson from '../../assets/london-2026.json';

const londonTrip = londonTripJson as unknown as Trip;
const HEADER_IMG = require('../../assets/images/rich/HeaderHome.jpg');
const EMPTY_IMG = require('../../assets/images/rich/emptyState.jpg');
const CARD_HEIGHT = 210;

interface TripModalState {
  mode: 'new' | 'edit';
  tripId?: string;
  name: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  cities: string[];
}

interface NominatimResult { display_name: string; lat: string; lon: string; }

type AppTheme = ReturnType<typeof import('@/hooks/use-theme').useTheme>;

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<TripModalState | null>(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      setTrips(await tripRepository.getAllTripSummaries());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const openNewModal = () =>
    setEditModal({ mode: 'new', name: '', subtitle: '', startDate: '', endDate: '', cities: [] });

  const openEditModal = (item: TripSummary) =>
    setEditModal({
      mode: 'edit', tripId: item.id,
      name: item.name, subtitle: item.subtitle,
      startDate: item.startDate, endDate: item.endDate,
      cities: item.cities,
    });

  const handleSave = async (data: {
    name: string; subtitle: string; startDate: string; endDate: string;
    cities: string[]; coverUri?: string;
  }) => {
    if (!editModal) return;
    if (editModal.mode === 'new') {
      const id = `trip-${Date.now()}`;
      const trip = tripRepository.createEmpty(id);
      trip.meta.name = data.name.trim();
      trip.meta.subtitle = data.subtitle.trim() || trip.meta.subtitle;
      trip.meta.startDate = data.startDate;
      trip.meta.endDate = data.endDate;
      trip.meta.cities = data.cities;
      await tripRepository.saveTrip(trip);
      if (data.coverUri) await tripRepository.saveCoverPhoto(id, data.coverUri);
      setEditModal(null);
      router.push(`/trip/${id}/itinerario`);
    } else if (editModal.tripId) {
      const trip = await tripRepository.getTrip(editModal.tripId);
      if (trip) {
        trip.meta.name = data.name.trim();
        trip.meta.subtitle = data.subtitle.trim();
        trip.meta.startDate = data.startDate;
        trip.meta.endDate = data.endDate;
        trip.meta.cities = data.cities;
        await tripRepository.saveTrip(trip);
        if (data.coverUri) await tripRepository.saveCoverPhoto(editModal.tripId, data.coverUri);
      }
      setEditModal(null);
      loadTrips();
    }
  };

  const handleDelete = async (tripId: string, name: string) => {
    Alert.alert('Elimina viaggio', `Vuoi eliminare "${name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive',
        onPress: async () => {
          await tripRepository.deleteTrip(tripId);
          setEditModal(null);
          loadTrips();
        },
      },
    ]);
  };

  const handleLoadSample = async () => {
    await tripRepository.saveTrip(londonTrip);
    loadTrips();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TripCard
            item={item}
            onPress={() => router.push(`/trip/${item.id}/itinerario`)}
            onEdit={() => openEditModal(item)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 90 },
        ]}
        ListHeaderComponent={
          <HomeHeader tripCount={trips.length} insetTop={insets.top} />
        }
        ListEmptyComponent={
          !loading ? <EmptyState onLoadSample={handleLoadSample} theme={theme} /> : null
        }
        ListFooterComponent={
          trips.length > 0 && !trips.some((t) => t.id === 'london-2026') ? (
            <Pressable onPress={handleLoadSample} style={styles.sampleRow}>
              <Text style={styles.sampleFlag}>🇬🇧</Text>
              <Text style={[styles.sampleText, { color: theme.textSecondary }]}>
                Carica viaggio di esempio (London 2026)
              </Text>
            </Pressable>
          ) : null
        }
        onRefresh={loadTrips}
        refreshing={loading}
      />

      <Pressable
        onPress={openNewModal}
        style={[styles.fab, { bottom: insets.bottom + Spacing.four }]}
      >
        <SymbolView name="plus" size={26} tintColor="white" />
      </Pressable>

      {editModal && (
        <TripEditModal
          modal={editModal}
          theme={theme}
          insets={insets}
          onSave={handleSave}
          onDelete={editModal.tripId ? () => handleDelete(editModal.tripId!, editModal.name) : undefined}
          onClose={() => setEditModal(null)}
        />
      )}
    </View>
  );
}

// ─── Hero header ──────────────────────────────────────────────────────────────

function HomeHeader({ tripCount, insetTop }: { tripCount: number; insetTop: number }) {
  const subtitle =
    tripCount === 0 ? 'Dove andiamo?' :
    tripCount === 1 ? '1 viaggio pianificato' :
    `${tripCount} viaggi pianificati`;

  return (
    <ImageBackground
      source={HEADER_IMG}
      style={[styles.hero, { paddingTop: insetTop }]}
      imageStyle={styles.heroImage}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.68)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <Text style={styles.heroEyebrow}>✈️  I MIEI VIAGGI</Text>
        <Text style={styles.heroTitle}>{subtitle}</Text>
      </View>
    </ImageBackground>
  );
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({
  item,
  onPress,
  onEdit,
}: {
  item: TripSummary;
  onPress: () => void;
  onEdit: () => void;
}) {
  const [coverUri, setCoverUri] = useState<string | null>(null);

  useEffect(() => {
    const uri = tripRepository.getCoverPhotoUri(item.id);
    FileSystem.getInfoAsync(uri).then((info) => setCoverUri(info.exists ? uri : null));
  }, [item.id]);

  const dateRange = item.startDate && item.endDate
    ? `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
    >
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[item.theme.primary, item.theme.accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.70)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.cardContent}>
        {/* Edit button */}
        <View style={styles.cardTop}>
          <Pressable onPress={onEdit} style={styles.editCircleBtn} hitSlop={12}>
            <SymbolView name="pencil" size={13} tintColor="white" />
          </Pressable>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Info bottom */}
        <View style={styles.cardBottom}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          {item.cities.length > 0 && (
            <Text style={styles.cardCities} numberOfLines={1}>
              {item.cities.join('  ·  ')}
            </Text>
          )}
          {dateRange && (
            <Text style={styles.cardMeta} numberOfLines={1}>{dateRange}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  onLoadSample,
  theme,
}: {
  onLoadSample: () => void;
  theme: ReturnType<typeof import('@/hooks/use-theme').useTheme>;
}) {
  return (
    <View style={styles.emptyWrapper}>
      <View style={styles.emptyCard}>
        <ImageBackground
          source={EMPTY_IMG}
          style={styles.emptyImg}
          imageStyle={styles.emptyImgStyle}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.72)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>Nessun viaggio ancora</Text>
            <Text style={styles.emptyHint}>
              Tappa + per pianificare il tuo prossimo viaggio
            </Text>
          </View>
        </ImageBackground>
      </View>

      <Pressable onPress={onLoadSample} style={styles.sampleRow}>
        <Text style={styles.sampleFlag}>🇬🇧</Text>
        <Text style={[styles.sampleText, { color: theme.textSecondary }]}>
          Carica viaggio di esempio (London 2026)
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Trip edit modal ──────────────────────────────────────────────────────────

function TripEditModal({
  modal,
  theme,
  insets,
  onSave,
  onDelete,
  onClose,
}: {
  modal: TripModalState;
  theme: AppTheme;
  insets: { bottom: number; top: number };
  onSave: (data: {
    name: string; subtitle: string; startDate: string; endDate: string;
    cities: string[]; coverUri?: string;
  }) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(modal.name);
  const [subtitle, setSubtitle] = useState(modal.subtitle);
  const [startDate, setStartDate] = useState(modal.startDate);
  const [endDate, setEndDate] = useState(modal.endDate);
  const [cities, setCities] = useState<string[]>(modal.cities);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<NominatimResult[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modal.tripId) {
      const uri = tripRepository.getCoverPhotoUri(modal.tripId);
      FileSystem.getInfoAsync(uri).then(info => {
        if (info.exists) setCoverUri(uri);
      });
    }
  }, [modal.tripId]);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const searchCity = async () => {
    if (!citySearch.trim()) return;
    setCitySearching(true);
    setCityResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(citySearch)}&format=json&limit=5`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'iOS-TravelApp/1.0' } });
      setCityResults(await resp.json());
    } catch {
      Alert.alert('Errore', 'Impossibile cercare la città.');
    } finally {
      setCitySearching(false);
    }
  };

  const addCity = (result: NominatimResult) => {
    const cityName = result.display_name.split(',')[0].trim();
    if (!cities.includes(cityName)) setCities(prev => [...prev, cityName]);
    setCitySearch('');
    setCityResults([]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nome obbligatorio', 'Inserisci un nome per il viaggio.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name, subtitle, startDate, endDate, cities, coverUri: coverUri ?? undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[tmStyles.root, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[tmStyles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={onClose} style={tmStyles.headerBtn}>
            <Text style={[tmStyles.cancel, { color: theme.textSecondary }]}>Annulla</Text>
          </Pressable>
          <Text style={[tmStyles.title, { color: theme.text }]}>
            {modal.mode === 'new' ? 'Nuovo viaggio' : 'Modifica viaggio'}
          </Text>
          <Pressable onPress={handleSave} style={tmStyles.headerBtn} disabled={saving}>
            <Text style={[tmStyles.save, { opacity: saving ? 0.5 : 1 }]}>
              {modal.mode === 'new' ? 'Crea' : 'Salva'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[tmStyles.body, { paddingBottom: insets.bottom + Spacing.five }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover photo */}
          <Pressable onPress={pickCover} style={tmStyles.cover}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient colors={['#1A1A2E', '#2D4A8F']} style={StyleSheet.absoluteFill} />
            )}
            <View style={tmStyles.coverOverlay}>
              <SymbolView name="camera.fill" size={20} tintColor="white" />
              <Text style={tmStyles.coverLabel}>
                {coverUri ? 'Cambia foto' : 'Aggiungi foto cover'}
              </Text>
            </View>
          </Pressable>

          {/* Nome */}
          <Text style={[tmStyles.label, { color: theme.textSecondary }]}>NOME *</Text>
          <View style={[tmStyles.field, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[tmStyles.input, { color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder="es. Londra 2026"
              placeholderTextColor={theme.textSecondary}
              autoFocus={modal.mode === 'new'}
              returnKeyType="next"
            />
          </View>

          {/* Sottotitolo */}
          <Text style={[tmStyles.label, { color: theme.textSecondary }]}>SOTTOTITOLO</Text>
          <View style={[tmStyles.field, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[tmStyles.input, { color: theme.text }]}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="es. La Nostra Avventura"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="next"
            />
          </View>

          {/* Date */}
          <Text style={[tmStyles.label, { color: theme.textSecondary }]}>DATE</Text>
          <View style={tmStyles.dateRow}>
            <View style={[tmStyles.field, tmStyles.dateField, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[tmStyles.dateHint, { color: theme.textSecondary }]}>Dal</Text>
              <TextInput
                style={[tmStyles.input, { color: theme.text }]}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="AAAA-MM-GG"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={[tmStyles.field, tmStyles.dateField, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[tmStyles.dateHint, { color: theme.textSecondary }]}>Al</Text>
              <TextInput
                style={[tmStyles.input, { color: theme.text }]}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="AAAA-MM-GG"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Città */}
          <Text style={[tmStyles.label, { color: theme.textSecondary }]}>CITTÀ</Text>

          {cities.length > 0 && (
            <View style={tmStyles.chips}>
              {cities.map((city, i) => (
                <Pressable
                  key={i}
                  onPress={() => setCities(prev => prev.filter((_, j) => j !== i))}
                  style={[tmStyles.chip, { backgroundColor: theme.backgroundElement }]}
                >
                  <Text style={[tmStyles.chipText, { color: theme.text }]}>{city}</Text>
                  <SymbolView name="xmark" size={10} tintColor={theme.textSecondary} />
                </Pressable>
              ))}
            </View>
          )}

          <View style={[tmStyles.field, { backgroundColor: theme.backgroundElement }]}>
            <View style={tmStyles.searchRow}>
              <TextInput
                style={[tmStyles.input, { flex: 1, color: theme.text }]}
                value={citySearch}
                onChangeText={setCitySearch}
                placeholder="Cerca città..."
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={searchCity}
                returnKeyType="search"
              />
              <Pressable
                onPress={searchCity}
                disabled={!citySearch.trim() || citySearching}
                style={[tmStyles.searchBtn, { opacity: citySearch.trim() ? 1 : 0.35 }]}
              >
                {citySearching
                  ? <ActivityIndicator size="small" color="white" />
                  : <SymbolView name="magnifyingglass" size={14} tintColor="white" />}
              </Pressable>
            </View>

            {cityResults.length > 0 && (
              <View style={tmStyles.results}>
                {cityResults.map((r, i) => {
                  const parts = r.display_name.split(',');
                  const cityName = parts[0].trim();
                  const addr = parts.slice(1, 3).join(',').trim();
                  return (
                    <Pressable
                      key={i}
                      onPress={() => addCity(r)}
                      style={[
                        tmStyles.resultRow,
                        i < cityResults.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.background,
                        },
                      ]}
                    >
                      <SymbolView name="mappin" size={12} tintColor="#007AFF" />
                      <View style={{ flex: 1 }}>
                        <Text style={[tmStyles.resultName, { color: theme.text }]} numberOfLines={1}>
                          {cityName}
                        </Text>
                        {addr ? (
                          <Text style={[tmStyles.resultAddr, { color: theme.textSecondary }]} numberOfLines={1}>
                            {addr}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Delete */}
          {onDelete && (
            <Pressable onPress={onDelete} style={tmStyles.deleteBtn}>
              <SymbolView name="trash" size={16} tintColor="#FF3B30" />
              <Text style={tmStyles.deleteText}>Elimina viaggio</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const tmStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 64 },
  title: { fontSize: 17, fontWeight: '600' },
  cancel: { fontSize: 17 },
  save: { fontSize: 17, fontWeight: '600', color: '#007AFF', textAlign: 'right' },
  body: { padding: Spacing.three, gap: Spacing.two },
  cover: {
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverOverlay: { alignItems: 'center', gap: 8 },
  coverLabel: { color: 'white', fontSize: 15, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: Spacing.two, marginBottom: 4 },
  field: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2 },
  input: { fontSize: 16, paddingVertical: 12 },
  dateRow: { flexDirection: 'row', gap: Spacing.two },
  dateField: { flex: 1 },
  dateHint: { fontSize: 11, fontWeight: '600', paddingTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '500' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtn: {
    backgroundColor: '#007AFF', borderRadius: 10,
    width: 34, height: 34, justifyContent: 'center', alignItems: 'center', marginRight: 2,
  },
  results: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)', marginTop: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 4 },
  resultName: { fontSize: 14, fontWeight: '500' },
  resultAddr: { fontSize: 12, marginTop: 1 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: Spacing.four, padding: 16,
    borderRadius: 14, borderWidth: 1, borderColor: '#FF3B30',
  },
  deleteText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '–';
  const [year, month, day] = iso.split('-');
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1] ?? ''} ${year}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: Spacing.three, paddingTop: 0 },

  // Hero
  hero: {
    height: 260,
    justifyContent: 'flex-end',
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.four + 4,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Card
  card: {
    height: CARD_HEIGHT,
    marginHorizontal: Spacing.three,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    ...StyleSheet.absoluteFill,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardTop: {
    alignItems: 'flex-end',
  },
  cameraBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 7,
  },
  cardMiddle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFlag: {
    fontSize: 52,
  },
  cardBottom: {
    gap: 4,
  },
  cardName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardCities: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  editCircleBtn: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyWrapper: {
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  emptyCard: {
    marginHorizontal: Spacing.three,
    height: 260,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyImg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  emptyImgStyle: {
    resizeMode: 'cover',
  },
  emptyContent: {
    padding: Spacing.four,
    gap: Spacing.one,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
  },

  // Sample row
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sampleFlag: { fontSize: 18 },
  sampleText: { fontSize: 14 },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },

  // Trip name modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  tripModal: {
    width: '100%',
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  tripModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  tripModalLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: Spacing.one,
  },
  tripModalInput: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  tripModalBtns: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  tripModalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tripModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  tripModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
