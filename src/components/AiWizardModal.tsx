import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import DateTimePicker from '@react-native-community/datetimepicker';

import { generateTrip, getApiKey, saveApiKey } from '@/services/claude';
import { tripRepository } from '@/repository/TripRepository';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { Trip } from '@/types/trip';
import { Airport, filterAirports } from '@/constants/airports';

const TRIP_TYPES = ['Culturale', 'Relax', 'Gastronomico', 'Avventura', 'Shopping', 'Misto'];
const CHILD_AGES = ['0-2 anni', '3-6 anni', '7-12 anni', '13-17 anni'];

interface WizardPreview {
  trip: Trip;
  days: number;
  events: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

export function AiWizardModal({
  visible,
  onClose,
  onTripCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onTripCreated: (tripId: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // API key state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Form state
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState<string[]>([]);
  const [tripType, setTripType] = useState('Culturale');
  const [interests, setInterests] = useState('');
  const [notes, setNotes] = useState('');
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);

  // Airport search state
  const [arrivalAirportText, setArrivalAirportText] = useState('');
  const [arrivalAirportSuggestions, setArrivalAirportSuggestions] = useState<Airport[]>([]);
  const [departureAirportText, setDepartureAirportText] = useState('');
  const [departureAirportSuggestions, setDepartureAirportSuggestions] = useState<Airport[]>([]);

  // Time picker state
  const [arrivalTimeDate, setArrivalTimeDate] = useState<Date | null>(null);
  const [departureTimeDate, setDepartureTimeDate] = useState<Date | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<'arrival' | 'departure' | null>(null);

  // Hotel search state
  const [hotelSearch, setHotelSearch] = useState('');
  const [hotel, setHotel] = useState('');
  const [hotelSuggestions, setHotelSuggestions] = useState<NominatimResult[]>([]);
  const [hotelSearching, setHotelSearching] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WizardPreview | null>(null);
  const [saving, setSaving] = useState(false);

  // Load key on open
  const handleVisible = () => {
    if (!keyLoaded) {
      getApiKey().then(k => {
        setSavedKey(k);
        setKeyLoaded(true);
      });
    }
  };

  const handleSaveKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    setSavingKey(true);
    try {
      await saveApiKey(trimmed);
      setSavedKey(trimmed);
      setApiKeyInput('');
    } finally {
      setSavingKey(false);
    }
  };

  const formatTime = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const makeDefaultTime = (hours: number, minutes = 0): Date => {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const searchHotel = async () => {
    const q = hotelSearch.trim();
    if (!q) return;
    setHotelSearching(true);
    setHotelSuggestions([]);
    try {
      const query = encodeURIComponent(q + (destination ? ' ' + destination.trim() : ''));
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&addressdetails=0`,
        { headers: { 'User-Agent': 'TravelApp/1.0' } },
      );
      const data: NominatimResult[] = await res.json();
      setHotelSuggestions(data);
    } catch {
      // silent fail
    } finally {
      setHotelSearching(false);
    }
  };

  const handleArrivalAirportChange = (text: string) => {
    setArrivalAirportText(text);
    setArrivalAirportSuggestions(filterAirports(text));
  };

  const selectArrivalAirport = (ap: Airport) => {
    setArrivalAirportText(`${ap.iata} — ${ap.city}`);
    setArrivalAirportSuggestions([]);
  };

  const handleDepartureAirportChange = (text: string) => {
    setDepartureAirportText(text);
    setDepartureAirportSuggestions(filterAirports(text));
  };

  const selectDepartureAirport = (ap: Airport) => {
    setDepartureAirportText(`${ap.iata} — ${ap.city}`);
    setDepartureAirportSuggestions([]);
  };

  const selectHotel = (result: NominatimResult) => {
    const parts = result.display_name.split(',');
    setHotel(parts.slice(0, 3).join(',').trim());
    setHotelSearch('');
    setHotelSuggestions([]);
  };

  const clearHotel = () => {
    setHotel('');
    setHotelSearch('');
    setHotelSuggestions([]);
  };

  const handleGenerate = async () => {
    if (!savedKey) return;
    setError(null);
    setPreview(null);
    setGenerating(true);
    try {
      const trip = await generateTrip({
        destination: destination.trim(),
        startDate,
        endDate,
        adults,
        children,
        tripType,
        interests: interests.trim(),
        notes: notes.trim(),
        arrivalAirport: arrivalAirportText.trim() || undefined,
        arrivalTime: arrivalTimeDate ? formatTime(arrivalTimeDate) : undefined,
        hotel: hotel.trim() || undefined,
        departureAirport: departureAirportText.trim() || undefined,
        departureTime: departureTimeDate ? formatTime(departureTimeDate) : undefined,
        apiKey: savedKey,
      });
      const totalEvents = trip.days.reduce((s, d) => s + d.events.length, 0);
      setPreview({ trip, days: trip.days.length, events: totalEvents });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto. Riprova.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await tripRepository.saveTrip(preview.trip);
      onTripCreated(preview.trip.meta.id);
    } catch {
      Alert.alert('Errore', 'Impossibile salvare il viaggio. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const canGenerate = !!savedKey && destination.trim().length > 0 && !!startDate && !!endDate;

  const dateStringToDate = (s: string): Date => {
    const d = new Date(s || Date.now());
    return isNaN(d.getTime()) ? new Date() : d;
  };
  const dateToString = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const formatDate = (iso: string): string => {
    if (!iso) return 'Seleziona';
    const [year, month, day] = iso.split('-');
    const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1] ?? ''} ${year}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={handleVisible}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[wStyles.root, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[wStyles.header, { borderBottomColor: theme.backgroundElement }]}>
            <Pressable onPress={onClose} style={wStyles.headerBtn}>
              <Text style={[wStyles.cancel, { color: theme.textSecondary }]}>Chiudi</Text>
            </Pressable>
            <View style={wStyles.headerTitleRow}>
              <Text style={[wStyles.title, { color: theme.text }]}>Crea con AI</Text>
            </View>
            <View style={wStyles.headerBtn} />
          </View>

          <ScrollView
            contentContainerStyle={[wStyles.body, { paddingBottom: insets.bottom + Spacing.five }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── API Key section ── */}
            {!savedKey ? (
              <View style={[wStyles.keyBox, { backgroundColor: theme.backgroundElement }]}>
                <SymbolView name="key.fill" size={20} tintColor="#007AFF" />
                <Text style={[wStyles.keyTitle, { color: theme.text }]}>Chiave API Anthropic</Text>
                <Text style={[wStyles.keyHint, { color: theme.textSecondary }]}>
                  Inserisci la tua chiave API da aistudio.google.com per generare itinerari con Gemini (gratuito).
                </Text>
                <TextInput
                  style={[wStyles.keyInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.backgroundElement }]}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  placeholder="Incolla la tua chiave API"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <Pressable
                  onPress={handleSaveKey}
                  disabled={savingKey || !apiKeyInput.trim()}
                  style={[wStyles.keyBtn, { opacity: apiKeyInput.trim() ? 1 : 0.4 }]}
                >
                  {savingKey
                    ? <ActivityIndicator color="white" />
                    : <Text style={wStyles.keyBtnText}>Salva chiave</Text>
                  }
                </Pressable>
              </View>
            ) : (
              <View style={[wStyles.keyRow, { backgroundColor: theme.backgroundElement }]}>
                <SymbolView name="checkmark.seal.fill" size={16} tintColor="#34C759" />
                <Text style={[wStyles.keyOk, { color: theme.text }]}>Chiave API configurata</Text>
                <Pressable onPress={() => setSavedKey(null)} hitSlop={12}>
                  <Text style={wStyles.keyChange}>Cambia</Text>
                </Pressable>
              </View>
            )}

            {/* ── Trip form (solo se key presente) ── */}
            {savedKey && !preview && (
              <>
                <Text style={[wStyles.label, { color: theme.textSecondary }]}>DESTINAZIONE *</Text>
                <View style={[wStyles.field, { backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    style={[wStyles.input, { color: theme.text }]}
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="es. Tokyo, Giappone"
                    placeholderTextColor={theme.textSecondary}
                    returnKeyType="next"
                  />
                </View>

                <Text style={[wStyles.label, { color: theme.textSecondary }]}>DATE *</Text>
                <View style={wStyles.dateRow}>
                  <Pressable
                    style={[wStyles.field, wStyles.dateField, { backgroundColor: theme.backgroundElement }]}
                    onPress={() => setActiveDatePicker(p => p === 'start' ? null : 'start')}
                  >
                    <Text style={[wStyles.dateHint, { color: theme.textSecondary }]}>Dal</Text>
                    <Text style={[wStyles.dateValue, { color: startDate ? theme.text : theme.textSecondary }]}>
                      {formatDate(startDate)}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[wStyles.field, wStyles.dateField, { backgroundColor: theme.backgroundElement }]}
                    onPress={() => setActiveDatePicker(p => p === 'end' ? null : 'end')}
                  >
                    <Text style={[wStyles.dateHint, { color: theme.textSecondary }]}>Al</Text>
                    <Text style={[wStyles.dateValue, { color: endDate ? theme.text : theme.textSecondary }]}>
                      {formatDate(endDate)}
                    </Text>
                  </Pressable>
                </View>
                {activeDatePicker && (
                  <View style={[wStyles.field, { backgroundColor: theme.backgroundElement, padding: 0, overflow: 'hidden' }]}>
                    <View style={wStyles.pickerDoneRow}>
                      <Text style={[wStyles.pickerDoneLabel, { color: theme.textSecondary }]}>
                        {activeDatePicker === 'start' ? 'Dal' : 'Al'}
                      </Text>
                      <Pressable onPress={() => setActiveDatePicker(null)}>
                        <Text style={wStyles.pickerDoneText}>Fatto</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={dateStringToDate(activeDatePicker === 'start' ? startDate : endDate)}
                      mode="date"
                      display="spinner"
                      onChange={(_, date) => {
                        if (!date) return;
                        const s = dateToString(date);
                        if (activeDatePicker === 'start') setStartDate(s);
                        else setEndDate(s);
                      }}
                      locale="it"
                    />
                  </View>
                )}

                <Text style={[wStyles.label, { color: theme.textSecondary }]}>ADULTI</Text>
                <View style={[wStyles.stepperRow, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[wStyles.stepperValue, { color: theme.text }]}>
                    {adults} adult{adults === 1 ? 'o' : 'i'}
                  </Text>
                  <View style={wStyles.stepperBtns}>
                    <Pressable
                      onPress={() => setAdults(a => Math.max(1, a - 1))}
                      style={[wStyles.stepperBtn, { backgroundColor: theme.background }]}
                    >
                      <SymbolView name="minus" size={14} tintColor={theme.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => setAdults(a => Math.min(10, a + 1))}
                      style={[wStyles.stepperBtn, { backgroundColor: theme.background }]}
                    >
                      <SymbolView name="plus" size={14} tintColor={theme.text} />
                    </Pressable>
                  </View>
                </View>

                <Text style={[wStyles.label, { color: theme.textSecondary }]}>BAMBINI</Text>
                <View style={[wStyles.stepperRow, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[wStyles.stepperValue, { color: theme.text }]}>
                    {children.length === 0 ? 'Nessuno' : `${children.length} bambin${children.length === 1 ? 'o' : 'i'}`}
                  </Text>
                  <View style={wStyles.stepperBtns}>
                    <Pressable
                      onPress={() => setChildren(c => c.slice(0, -1))}
                      disabled={children.length === 0}
                      style={[wStyles.stepperBtn, { backgroundColor: theme.background, opacity: children.length === 0 ? 0.3 : 1 }]}
                    >
                      <SymbolView name="minus" size={14} tintColor={theme.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => setChildren(c => [...c, '7-12 anni'])}
                      disabled={children.length >= 6}
                      style={[wStyles.stepperBtn, { backgroundColor: theme.background }]}
                    >
                      <SymbolView name="plus" size={14} tintColor={theme.text} />
                    </Pressable>
                  </View>
                </View>
                {children.length > 0 && (
                  <View style={[wStyles.childrenBox, { backgroundColor: theme.backgroundElement }]}>
                    {children.map((age, i) => (
                      <View key={i} style={wStyles.childRow}>
                        <Text style={[wStyles.childLabel, { color: theme.textSecondary }]}>
                          Bambino {i + 1}
                        </Text>
                        <View style={wStyles.childPills}>
                          {CHILD_AGES.map(range => (
                            <Pressable
                              key={range}
                              onPress={() => setChildren(c => c.map((a, j) => j === i ? range : a))}
                              style={[
                                wStyles.childPill,
                                { backgroundColor: age === range ? '#007AFF' : theme.background },
                              ]}
                            >
                              <Text style={[wStyles.childPillText, { color: age === range ? 'white' : theme.text }]}>
                                {range}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* ── VOLO DI ANDATA ── */}
                <Text style={[wStyles.label, { color: theme.textSecondary }]}>VOLO DI ANDATA (opzionale)</Text>

                {/* Aeroporto arrivo */}
                <View style={[wStyles.searchRow, { backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    style={[wStyles.searchInput, { color: theme.text }]}
                    value={arrivalAirportText}
                    onChangeText={handleArrivalAirportChange}
                    placeholder="Aeroporto di arrivo (es. NRT, Tokyo)"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {arrivalAirportText.length > 0 && (
                    <Pressable
                      onPress={() => { setArrivalAirportText(''); setArrivalAirportSuggestions([]); }}
                      hitSlop={12}
                    >
                      <SymbolView name="xmark.circle.fill" size={18} tintColor={theme.textSecondary} />
                    </Pressable>
                  )}
                </View>
                {arrivalAirportSuggestions.length > 0 && (
                  <View style={[wStyles.suggestBox, { backgroundColor: theme.backgroundElement }]}>
                    {arrivalAirportSuggestions.map((ap, idx) => (
                      <Pressable
                        key={ap.iata}
                        onPress={() => selectArrivalAirport(ap)}
                        style={[
                          wStyles.suggestItem,
                          idx < arrivalAirportSuggestions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.background },
                        ]}
                      >
                        <Text style={[wStyles.suggestIata, { color: '#007AFF' }]}>{ap.iata}</Text>
                        <View style={wStyles.suggestMeta}>
                          <Text style={[wStyles.suggestName, { color: theme.text }]} numberOfLines={1}>{ap.name}</Text>
                          <Text style={[wStyles.suggestSub, { color: theme.textSecondary }]}>{ap.city} · {ap.country}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Orario atterraggio */}
                <Pressable
                  style={[wStyles.timeField, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => {
                    if (activeTimePicker === 'arrival') {
                      setActiveTimePicker(null);
                    } else {
                      if (!arrivalTimeDate) setArrivalTimeDate(makeDefaultTime(14, 0));
                      setActiveTimePicker('arrival');
                    }
                  }}
                >
                  <Text style={[wStyles.timeHint, { color: theme.textSecondary }]}>Orario atterraggio</Text>
                  <View style={wStyles.timeValueRow}>
                    <Text style={[wStyles.timeValue, { color: arrivalTimeDate ? theme.text : theme.textSecondary }]}>
                      {arrivalTimeDate ? formatTime(arrivalTimeDate) : 'Seleziona'}
                    </Text>
                    <SymbolView
                      name={activeTimePicker === 'arrival' ? 'chevron.up' : 'chevron.down'}
                      size={12}
                      tintColor={theme.textSecondary}
                    />
                  </View>
                </Pressable>
                {activeTimePicker === 'arrival' && (
                  <View style={[wStyles.pickerContainer, { backgroundColor: theme.backgroundElement }]}>
                    <View style={wStyles.pickerDoneRow}>
                      <Text style={[wStyles.pickerDoneLabel, { color: theme.textSecondary }]}>Atterraggio</Text>
                      <Pressable onPress={() => setActiveTimePicker(null)}>
                        <Text style={wStyles.pickerDoneText}>Fatto</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={arrivalTimeDate ?? makeDefaultTime(14, 0)}
                      mode="time"
                      display="spinner"
                      onChange={(_, date) => { if (date) setArrivalTimeDate(date); }}
                      locale="it"
                    />
                  </View>
                )}

                {/* ── ALLOGGIO ── */}
                <Text style={[wStyles.label, { color: theme.textSecondary }]}>ALLOGGIO (opzionale)</Text>
                {hotel ? (
                  <View style={[wStyles.selectedRow, { backgroundColor: theme.backgroundElement }]}>
                    <SymbolView name="building.2.fill" size={16} tintColor="#007AFF" />
                    <Text style={[wStyles.selectedText, { color: theme.text }]} numberOfLines={2}>{hotel}</Text>
                    <Pressable onPress={clearHotel} hitSlop={12}>
                      <SymbolView name="xmark.circle.fill" size={18} tintColor={theme.textSecondary} />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={[wStyles.searchRow, { backgroundColor: theme.backgroundElement }]}>
                      <TextInput
                        style={[wStyles.searchInput, { color: theme.text }]}
                        value={hotelSearch}
                        onChangeText={setHotelSearch}
                        placeholder="Cerca struttura o indirizzo"
                        placeholderTextColor={theme.textSecondary}
                        returnKeyType="search"
                        onSubmitEditing={searchHotel}
                      />
                      <Pressable
                        onPress={searchHotel}
                        disabled={hotelSearching || !hotelSearch.trim()}
                        hitSlop={12}
                        style={{ opacity: hotelSearch.trim() ? 1 : 0.4 }}
                      >
                        {hotelSearching
                          ? <ActivityIndicator size="small" color="#007AFF" />
                          : <SymbolView name="magnifyingglass" size={18} tintColor="#007AFF" />
                        }
                      </Pressable>
                    </View>
                    {hotelSuggestions.length > 0 && (
                      <View style={[wStyles.suggestBox, { backgroundColor: theme.backgroundElement }]}>
                        {hotelSuggestions.map((r, idx) => (
                          <Pressable
                            key={r.place_id}
                            onPress={() => selectHotel(r)}
                            style={[
                              wStyles.suggestItem,
                              idx < hotelSuggestions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.background },
                            ]}
                          >
                            <SymbolView name="mappin.circle.fill" size={20} tintColor="#007AFF" />
                            <Text style={[wStyles.suggestName, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                              {r.display_name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* ── VOLO DI RITORNO ── */}
                <Text style={[wStyles.label, { color: theme.textSecondary }]}>VOLO DI RITORNO (opzionale)</Text>

                {/* Aeroporto partenza */}
                <View style={[wStyles.searchRow, { backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    style={[wStyles.searchInput, { color: theme.text }]}
                    value={departureAirportText}
                    onChangeText={handleDepartureAirportChange}
                    placeholder="Aeroporto di partenza (es. NRT, Tokyo)"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {departureAirportText.length > 0 && (
                    <Pressable
                      onPress={() => { setDepartureAirportText(''); setDepartureAirportSuggestions([]); }}
                      hitSlop={12}
                    >
                      <SymbolView name="xmark.circle.fill" size={18} tintColor={theme.textSecondary} />
                    </Pressable>
                  )}
                </View>
                {departureAirportSuggestions.length > 0 && (
                  <View style={[wStyles.suggestBox, { backgroundColor: theme.backgroundElement }]}>
                    {departureAirportSuggestions.map((ap, idx) => (
                      <Pressable
                        key={ap.iata}
                        onPress={() => selectDepartureAirport(ap)}
                        style={[
                          wStyles.suggestItem,
                          idx < departureAirportSuggestions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.background },
                        ]}
                      >
                        <Text style={[wStyles.suggestIata, { color: '#007AFF' }]}>{ap.iata}</Text>
                        <View style={wStyles.suggestMeta}>
                          <Text style={[wStyles.suggestName, { color: theme.text }]} numberOfLines={1}>{ap.name}</Text>
                          <Text style={[wStyles.suggestSub, { color: theme.textSecondary }]}>{ap.city} · {ap.country}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Orario decollo */}
                <Pressable
                  style={[wStyles.timeField, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => {
                    if (activeTimePicker === 'departure') {
                      setActiveTimePicker(null);
                    } else {
                      if (!departureTimeDate) setDepartureTimeDate(makeDefaultTime(10, 0));
                      setActiveTimePicker('departure');
                    }
                  }}
                >
                  <Text style={[wStyles.timeHint, { color: theme.textSecondary }]}>Orario decollo</Text>
                  <View style={wStyles.timeValueRow}>
                    <Text style={[wStyles.timeValue, { color: departureTimeDate ? theme.text : theme.textSecondary }]}>
                      {departureTimeDate ? formatTime(departureTimeDate) : 'Seleziona'}
                    </Text>
                    <SymbolView
                      name={activeTimePicker === 'departure' ? 'chevron.up' : 'chevron.down'}
                      size={12}
                      tintColor={theme.textSecondary}
                    />
                  </View>
                </Pressable>
                {activeTimePicker === 'departure' && (
                  <View style={[wStyles.pickerContainer, { backgroundColor: theme.backgroundElement }]}>
                    <View style={wStyles.pickerDoneRow}>
                      <Text style={[wStyles.pickerDoneLabel, { color: theme.textSecondary }]}>Decollo</Text>
                      <Pressable onPress={() => setActiveTimePicker(null)}>
                        <Text style={wStyles.pickerDoneText}>Fatto</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={departureTimeDate ?? makeDefaultTime(10, 0)}
                      mode="time"
                      display="spinner"
                      onChange={(_, date) => { if (date) setDepartureTimeDate(date); }}
                      locale="it"
                    />
                  </View>
                )}

                <Text style={[wStyles.label, { color: theme.textSecondary }]}>TIPO DI VIAGGIO</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={wStyles.pillsScroll}
                  contentContainerStyle={wStyles.pills}
                >
                  {TRIP_TYPES.map(t => (
                    <Pressable
                      key={t}
                      onPress={() => setTripType(t)}
                      style={[wStyles.pill, { backgroundColor: t === tripType ? '#007AFF' : theme.backgroundElement }]}
                    >
                      <Text style={[wStyles.pillText, { color: t === tripType ? 'white' : theme.text }]}>{t}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[wStyles.label, { color: theme.textSecondary }]}>COSA VUOI FARE E VEDERE</Text>
                <View style={[wStyles.field, { backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    style={[wStyles.input, wStyles.multiline, { color: theme.text }]}
                    value={interests}
                    onChangeText={setInterests}
                    placeholder="es. templi, sushi autentico, quartiere Akihabara, Fuji, mercati locali..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <Text style={[wStyles.label, { color: theme.textSecondary }]}>NOTE AGGIUNTIVE</Text>
                <View style={[wStyles.field, { backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    style={[wStyles.input, wStyles.multiline, { color: theme.text }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="es. primo viaggio in Giappone, preferisco muovermi a piedi, bambini piccoli..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>

                {/* Error */}
                {error && (
                  <View style={wStyles.errorBox}>
                    <SymbolView name="exclamationmark.triangle.fill" size={16} tintColor="#FF3B30" />
                    <Text style={wStyles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Generate button */}
                <Pressable
                  onPress={handleGenerate}
                  disabled={!canGenerate || generating}
                  style={[wStyles.generateBtn, { opacity: canGenerate && !generating ? 1 : 0.4 }]}
                >
                  {generating ? (
                    <View style={wStyles.generatingRow}>
                      <ActivityIndicator color="white" />
                      <Text style={wStyles.generateBtnText}>Claude sta pianificando...</Text>
                    </View>
                  ) : (
                    <Text style={wStyles.generateBtnText}>Genera itinerario</Text>
                  )}
                </Pressable>
              </>
            )}

            {/* ── Preview ── */}
            {preview && (
              <View style={[wStyles.previewBox, { backgroundColor: theme.backgroundElement }]}>
                <View style={wStyles.previewCheck}>
                  <SymbolView name="checkmark.circle.fill" size={32} tintColor="#34C759" />
                </View>
                <Text style={[wStyles.previewName, { color: theme.text }]} numberOfLines={2}>
                  {preview.trip.meta.name}
                </Text>
                <Text style={[wStyles.previewSubtitle, { color: theme.textSecondary }]}>
                  {preview.trip.meta.subtitle}
                </Text>
                <View style={wStyles.previewStats}>
                  <View style={[wStyles.previewStat, { backgroundColor: theme.background }]}>
                    <Text style={[wStyles.previewStatNum, { color: theme.text }]}>{preview.days}</Text>
                    <Text style={[wStyles.previewStatLabel, { color: theme.textSecondary }]}>
                      giorn{preview.days === 1 ? 'o' : 'i'}
                    </Text>
                  </View>
                  <View style={[wStyles.previewStat, { backgroundColor: theme.background }]}>
                    <Text style={[wStyles.previewStatNum, { color: theme.text }]}>{preview.events}</Text>
                    <Text style={[wStyles.previewStatLabel, { color: theme.textSecondary }]}>attività</Text>
                  </View>
                  <View style={[wStyles.previewStat, { backgroundColor: theme.background }]}>
                    <Text style={[wStyles.previewStatNum, { color: theme.text }]}>{preview.trip.meta.flag}</Text>
                    <Text style={[wStyles.previewStatLabel, { color: theme.textSecondary }]}>destinazione</Text>
                  </View>
                </View>

                <View style={wStyles.previewActions}>
                  <Pressable
                    onPress={() => { setPreview(null); setError(null); }}
                    style={[wStyles.regenBtn, { borderColor: theme.textSecondary }]}
                  >
                    <SymbolView name="arrow.clockwise" size={14} tintColor={theme.text} />
                    <Text style={[wStyles.regenBtnText, { color: theme.text }]}>Rigenera</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCreate}
                    disabled={saving}
                    style={[wStyles.createBtn, { opacity: saving ? 0.6 : 1 }]}
                  >
                    {saving
                      ? <ActivityIndicator color="white" />
                      : <Text style={wStyles.createBtnText}>Crea viaggio</Text>
                    }
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const wStyles = StyleSheet.create({
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
  headerTitleRow: { alignItems: 'center', gap: 4 },
  title: { fontSize: 17, fontWeight: '600' },
  cancel: { fontSize: 17 },
  body: { padding: Spacing.three, gap: Spacing.two },

  // API Key
  keyBox: {
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  keyTitle: { fontSize: 16, fontWeight: '700' },
  keyHint: { fontSize: 13, lineHeight: 19 },
  keyInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'ui-monospace',
  },
  keyBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 11,
    alignItems: 'center',
    width: '100%',
  },
  keyBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    marginBottom: Spacing.two,
  },
  keyOk: { flex: 1, fontSize: 14, fontWeight: '500' },
  keyChange: { fontSize: 14, color: '#007AFF', fontWeight: '500' },

  // Form
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: Spacing.two, marginBottom: 4 },
  field: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2 },
  input: { fontSize: 16, paddingVertical: 12 },
  multiline: { minHeight: 80, paddingTop: 12, paddingBottom: 12 },

  dateRow: { flexDirection: 'row', gap: Spacing.two },
  dateField: { flex: 1 },
  dateHint: { fontSize: 11, fontWeight: '600', paddingTop: 8 },
  dateValue: { fontSize: 16, fontWeight: '600', paddingVertical: 10 },
  pickerDoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  pickerDoneLabel: { fontSize: 13, fontWeight: '600' },
  pickerDoneText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
  pickerContainer: { borderRadius: 14, overflow: 'hidden' },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepperValue: { fontSize: 16, fontWeight: '500' },
  stepperBtns: { flexDirection: 'row', gap: Spacing.two },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Airport / hotel search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 },

  // Suggestions dropdown
  suggestBox: { borderRadius: 14, overflow: 'hidden' },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestIata: { fontSize: 15, fontWeight: '800', minWidth: 36, fontFamily: 'ui-monospace' },
  suggestMeta: { flex: 1, gap: 2 },
  suggestName: { fontSize: 14, fontWeight: '500' },
  suggestSub: { fontSize: 12 },

  // Time picker field
  timeField: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeHint: { fontSize: 14 },
  timeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeValue: { fontSize: 16, fontWeight: '600' },

  // Selected hotel row
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 19 },

  childrenBox: { borderRadius: 14, padding: Spacing.two, gap: Spacing.two },
  childRow: { gap: 6 },
  childLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginLeft: 2 },
  childPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  childPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  childPillText: { fontSize: 13, fontWeight: '500' },

  pillsScroll: { flexShrink: 0, flexGrow: 0 },
  pills: { flexDirection: 'row', paddingVertical: 6, alignItems: 'center' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  pillText: { fontSize: 13, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderRadius: 12,
    padding: 14,
  },
  errorText: { flex: 1, color: '#FF3B30', fontSize: 13, lineHeight: 19 },

  generateBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  generateBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Preview
  previewBox: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  previewCheck: { marginBottom: 4 },
  previewName: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  previewSubtitle: { fontSize: 14, textAlign: 'center' },
  previewStats: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  previewStat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 2,
  },
  previewStatNum: { fontSize: 22, fontWeight: '800' },
  previewStatLabel: { fontSize: 11, fontWeight: '500' },
  previewActions: { flexDirection: 'row', gap: Spacing.two, width: '100%', marginTop: Spacing.one },
  regenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
  },
  regenBtnText: { fontSize: 15, fontWeight: '600' },
  createBtn: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  createBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
