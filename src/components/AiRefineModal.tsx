import { useEffect, useState } from 'react';
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

import { getApiKey, refineTrip, saveApiKey } from '@/services/claude';
import { tripRepository } from '@/repository/TripRepository';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { Trip } from '@/types/trip';

interface RefinedPreview {
  trip: Trip;
  beforeDays: number;
  beforeEvents: number;
  afterDays: number;
  afterEvents: number;
}

export function AiRefineModal({
  visible,
  onClose,
  trip,
  onTripUpdated,
}: {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
  onTripUpdated: (trip: Trip) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const [instructions, setInstructions] = useState('');
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RefinedPreview | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && !keyLoaded) {
      getApiKey().then(k => {
        setSavedKey(k);
        setKeyLoaded(true);
      });
    }
    if (!visible) {
      setPreview(null);
      setError(null);
      setInstructions('');
    }
  }, [visible, keyLoaded]);

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

  const handleRefine = async () => {
    if (!savedKey || !instructions.trim()) return;
    setError(null);
    setPreview(null);
    setRefining(true);
    try {
      const beforeDays = trip.days.length;
      const beforeEvents = trip.days.reduce((s, d) => s + d.events.length, 0);
      const refined = await refineTrip({
        trip,
        instructions: instructions.trim(),
        apiKey: savedKey,
      });
      const afterDays = refined.days.length;
      const afterEvents = refined.days.reduce((s, d) => s + d.events.length, 0);
      setPreview({ trip: refined, beforeDays, beforeEvents, afterDays, afterEvents });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto. Riprova.');
    } finally {
      setRefining(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await tripRepository.saveTrip(preview.trip);
      onTripUpdated(preview.trip);
      onClose();
    } catch {
      Alert.alert('Errore', 'Impossibile salvare le modifiche. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const beforeEvents = trip.days.reduce((s, d) => s + d.events.length, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[rStyles.root, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[rStyles.header, { borderBottomColor: theme.backgroundElement }]}>
            <Pressable onPress={onClose} style={rStyles.headerBtn}>
              <Text style={[rStyles.cancel, { color: theme.textSecondary }]}>Chiudi</Text>
            </Pressable>
            <View style={rStyles.headerCenter}>
              <SymbolView name="sparkles" size={16} tintColor="#007AFF" />
              <Text style={[rStyles.title, { color: theme.text }]}>Modifica con AI</Text>
            </View>
            <View style={rStyles.headerBtn} />
          </View>

          <ScrollView
            contentContainerStyle={[rStyles.body, { paddingBottom: insets.bottom + Spacing.five }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* API Key */}
            {!savedKey ? (
              <View style={[rStyles.keyBox, { backgroundColor: theme.backgroundElement }]}>
                <SymbolView name="key.fill" size={20} tintColor="#007AFF" />
                <Text style={[rStyles.keyTitle, { color: theme.text }]}>Chiave API richiesta</Text>
                <Text style={[rStyles.keyHint, { color: theme.textSecondary }]}>
                  Inserisci la tua chiave da aistudio.google.com per usare Gemini.
                </Text>
                <TextInput
                  style={[rStyles.keyInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.backgroundElement }]}
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
                  style={[rStyles.keyBtn, { opacity: apiKeyInput.trim() ? 1 : 0.4 }]}
                >
                  {savingKey ? <ActivityIndicator color="white" /> : <Text style={rStyles.keyBtnText}>Salva chiave</Text>}
                </Pressable>
              </View>
            ) : (
              <>
                {/* Trip context */}
                <View style={[rStyles.contextBox, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[rStyles.contextName, { color: theme.text }]} numberOfLines={1}>
                    {trip.meta.flag} {trip.meta.name}
                  </Text>
                  <Text style={[rStyles.contextSub, { color: theme.textSecondary }]}>
                    {trip.days.length} giorni · {beforeEvents} attività
                  </Text>
                </View>

                {/* Instructions input */}
                {!preview && (
                  <>
                    <Text style={[rStyles.label, { color: theme.textSecondary }]}>COSA VUOI MODIFICARE?</Text>
                    <View style={[rStyles.instructionBox, { backgroundColor: theme.backgroundElement }]}>
                      <TextInput
                        style={[rStyles.instructionInput, { color: theme.text }]}
                        value={instructions}
                        onChangeText={setInstructions}
                        placeholder={'es. Sostituisci il giorno 3 con qualcosa adatto ai bambini\nes. Aggiungi una serata a teatro\nes. Rimuovi gli musei e metti più street food\nes. Cambia il titolo del viaggio in qualcosa di più poetico'}
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        textAlignVertical="top"
                        autoFocus
                      />
                    </View>

                    {error && (
                      <View style={rStyles.errorBox}>
                        <SymbolView name="exclamationmark.triangle.fill" size={16} tintColor="#FF3B30" />
                        <Text style={rStyles.errorText}>{error}</Text>
                      </View>
                    )}

                    <Pressable
                      onPress={handleRefine}
                      disabled={!instructions.trim() || refining}
                      style={[rStyles.refineBtn, { opacity: instructions.trim() && !refining ? 1 : 0.4 }]}
                    >
                      {refining ? (
                        <View style={rStyles.refiningRow}>
                          <ActivityIndicator color="white" />
                          <Text style={rStyles.refineBtnText}>Gemini sta elaborando...</Text>
                        </View>
                      ) : (
                        <View style={rStyles.refiningRow}>
                          <SymbolView name="sparkles" size={16} tintColor="white" />
                          <Text style={rStyles.refineBtnText}>Applica modifiche</Text>
                        </View>
                      )}
                    </Pressable>
                  </>
                )}

                {/* Preview */}
                {preview && (
                  <View style={[rStyles.previewBox, { backgroundColor: theme.backgroundElement }]}>
                    <SymbolView name="checkmark.circle.fill" size={32} tintColor="#34C759" />
                    <Text style={[rStyles.previewTitle, { color: theme.text }]}>Modifiche pronte</Text>

                    {preview.trip.meta.name !== trip.meta.name && (
                      <View style={[rStyles.diffRow, { borderColor: theme.background }]}>
                        <Text style={[rStyles.diffLabel, { color: theme.textSecondary }]}>Nome</Text>
                        <View style={rStyles.diffValues}>
                          <Text style={[rStyles.diffOld, { color: theme.textSecondary }]} numberOfLines={1}>
                            {trip.meta.name}
                          </Text>
                          <SymbolView name="arrow.right" size={12} tintColor={theme.textSecondary} />
                          <Text style={[rStyles.diffNew, { color: theme.text }]} numberOfLines={1}>
                            {preview.trip.meta.name}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={rStyles.statsRow}>
                      <View style={[rStyles.stat, { backgroundColor: theme.background }]}>
                        <Text style={[rStyles.statNum, { color: theme.text }]}>
                          {preview.afterDays}
                          {preview.afterDays !== preview.beforeDays && (
                            <Text style={{ color: preview.afterDays > preview.beforeDays ? '#34C759' : '#FF3B30', fontSize: 13 }}>
                              {' '}({preview.afterDays > preview.beforeDays ? '+' : ''}{preview.afterDays - preview.beforeDays})
                            </Text>
                          )}
                        </Text>
                        <Text style={[rStyles.statLabel, { color: theme.textSecondary }]}>giorni</Text>
                      </View>
                      <View style={[rStyles.stat, { backgroundColor: theme.background }]}>
                        <Text style={[rStyles.statNum, { color: theme.text }]}>
                          {preview.afterEvents}
                          {preview.afterEvents !== preview.beforeEvents && (
                            <Text style={{ color: preview.afterEvents > preview.beforeEvents ? '#34C759' : '#FF3B30', fontSize: 13 }}>
                              {' '}({preview.afterEvents > preview.beforeEvents ? '+' : ''}{preview.afterEvents - preview.beforeEvents})
                            </Text>
                          )}
                        </Text>
                        <Text style={[rStyles.statLabel, { color: theme.textSecondary }]}>attività</Text>
                      </View>
                    </View>

                    <View style={rStyles.previewActions}>
                      <Pressable
                        onPress={() => { setPreview(null); setError(null); }}
                        style={[rStyles.discardBtn, { borderColor: theme.textSecondary }]}
                      >
                        <Text style={[rStyles.discardBtnText, { color: theme.text }]}>Riprova</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleApply}
                        disabled={saving}
                        style={[rStyles.applyBtn, { opacity: saving ? 0.6 : 1 }]}
                      >
                        {saving
                          ? <ActivityIndicator color="white" />
                          : <Text style={rStyles.applyBtnText}>Salva modifiche</Text>
                        }
                      </Pressable>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const rStyles = StyleSheet.create({
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 17, fontWeight: '600' },
  cancel: { fontSize: 17 },
  body: { padding: Spacing.three, gap: Spacing.two },

  keyBox: {
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
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

  contextBox: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  contextName: { fontSize: 16, fontWeight: '700' },
  contextSub: { fontSize: 13 },

  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: Spacing.one, marginBottom: 4 },

  instructionBox: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4 },
  instructionInput: { fontSize: 15, lineHeight: 22, minHeight: 160, paddingVertical: 12, textAlignVertical: 'top' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderRadius: 12,
    padding: 14,
  },
  errorText: { flex: 1, color: '#FF3B30', fontSize: 13, lineHeight: 19 },

  refineBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  refiningRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refineBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  previewBox: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  previewTitle: { fontSize: 18, fontWeight: '700' },

  diffRow: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  diffLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  diffValues: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  diffOld: { fontSize: 13, textDecorationLine: 'line-through', flex: 1 },
  diffNew: { fontSize: 13, fontWeight: '600', flex: 1 },

  statsRow: { flexDirection: 'row', gap: Spacing.two, width: '100%' },
  stat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 2,
  },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500' },

  previewActions: { flexDirection: 'row', gap: Spacing.two, width: '100%', marginTop: Spacing.one },
  discardBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
  },
  discardBtnText: { fontSize: 15, fontWeight: '600' },
  applyBtn: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  applyBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
