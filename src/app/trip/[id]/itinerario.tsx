import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { tripRepository } from '@/repository/TripRepository';
import { Trip, TripDay, TripEvent, EventType, Ticket } from '@/types/trip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { AiRefineModal } from '@/components/AiRefineModal';

// ─── Tipi locali ──────────────────────────────────────────────────────────────

type TH = ReturnType<typeof import('@/hooks/use-theme').useTheme>;

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

function guidamiUrl(ev: { placeGuide?: string; placeLat?: number; placeLon?: number }): string {
  if (ev.placeLat && ev.placeLon) {
    return `maps://?ll=${ev.placeLat},${ev.placeLon}&q=${encodeURIComponent(ev.placeGuide ?? '')}`;
  }
  return `maps:?q=${encodeURIComponent(ev.placeGuide ?? '')}`;
}

interface EditingEvent {
  eventIdx: number | null; // null = nuovo evento
  draft: TripEvent;
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;

function timeToPx(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h + m / 60) * HOUR_HEIGHT;
}

function pxToTime(px: number): string {
  const snapped = Math.round(Math.max(0, Math.min(px, HOUR_HEIGHT * 23.75)) / (HOUR_HEIGHT / 4)) * (HOUR_HEIGHT / 4);
  const totalMinutes = Math.round(snapped / HOUR_HEIGHT * 60);
  const h = Math.min(23, Math.floor(totalMinutes / 60));
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function defaultBlockHeight(event: TripEvent): number {
  if (!event.timeTo) return HOUR_HEIGHT * 0.75;
  const h = timeToPx(event.timeTo) - timeToPx(event.time);
  return Math.max(HOUR_HEIGHT / 4, h);
}

// ─── Screen principale ────────────────────────────────────────────────────────

export default function ItinerarioScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [showAiRefine, setShowAiRefine] = useState(false);

  useEffect(() => {
    tripRepository.getTrip(id).then((t) => {
      if (!t) return;
      setTrip(t);
      navigation.setOptions({
        headerTitle: t.meta.name,
        headerRight: () => (
          <Pressable
            onPress={() => setShowAiRefine(true)}
            style={{ marginRight: 8, padding: 4 }}
            hitSlop={8}
          >
            <SymbolView name="sparkles" size={20} tintColor="#007AFF" />
          </Pressable>
        ),
      });
    });
  }, [id]);

  const saveTrip = async (updated: Trip) => {
    setTrip(updated);
    await tripRepository.saveTrip(updated);
  };

  const handleSaveEvent = async (dayIdx: number, eventIdx: number | null, draft: TripEvent) => {
    if (!trip) return;
    const day = trip.days[dayIdx];
    const oldEvent = eventIdx !== null ? day.events[eventIdx] : null;
    const oldTicketPath = oldEvent?.ticketPath;

    const days = trip.days.map((d, i) => {
      if (i !== dayIdx) return d;
      const events = [...d.events];
      if (eventIdx === null) {
        events.push(draft);
      } else {
        events[eventIdx] = draft;
      }
      events.sort((a, b) => a.time.localeCompare(b.time));
      return { ...d, events };
    });

    // Sync trip.tickets[]
    let tickets = [...trip.tickets];
    if (oldTicketPath && oldTicketPath !== draft.ticketPath) {
      tickets = tickets.filter(t => t.pdfPath !== oldTicketPath);
    }
    if (draft.ticketPath && draft.isBooked) {
      const ticket: Ticket = {
        name: draft.name,
        dayN: day.n,
        dayLabel: day.dateLabel,
        pdfPath: draft.ticketPath,
        isVip: false,
      };
      const existingIdx = tickets.findIndex(t => t.pdfPath === draft.ticketPath);
      if (existingIdx >= 0) {
        tickets[existingIdx] = ticket;
      } else {
        tickets.push(ticket);
      }
    }

    await saveTrip({ ...trip, days, tickets });
  };

  const handleDeleteEvent = async (dayIdx: number, eventIdx: number) => {
    if (!trip) return;
    const deletedEvent = trip.days[dayIdx].events[eventIdx];
    const days = trip.days.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, events: d.events.filter((_, ei) => ei !== eventIdx) };
    });
    // Remove ticket if event had one
    const tickets = deletedEvent.ticketPath
      ? trip.tickets.filter(t => t.pdfPath !== deletedEvent.ticketPath)
      : trip.tickets;
    await saveTrip({ ...trip, days, tickets });
  };

  const handleSaveDayHeader = async (dayIdx: number, title: string, subtitle: string, zone: string) => {
    if (!trip) return;
    const days = trip.days.map((d, i) =>
      i !== dayIdx ? d : { ...d, title, subtitle, zone }
    );
    await saveTrip({ ...trip, days });
  };

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (trip.days.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <SymbolView name="calendar.badge.plus" size={48} tintColor={theme.textSecondary} />
        <Text style={[styles.centerTitle, { color: theme.text }]}>Nessun giorno</Text>
        <Text style={[styles.centerText, { color: theme.textSecondary }]}>
          Aggiungi giorni al viaggio per vedere l'itinerario
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Griglia giorni — visual calendar */}
      <ScrollView
        contentContainerStyle={[
          styles.dayGrid,
          { paddingBottom: insets.bottom + Spacing.five },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {trip.days.map((d, i) => (
          <DayCard
            key={d.n}
            day={d}
            tripId={id}
            onPress={() => setSelectedDayIdx(i)}
          />
        ))}
      </ScrollView>

      {/* Day detail sheet — contiene i modal di editing al suo interno */}
      {selectedDayIdx !== null && (
        <DayDetailSheet
          day={trip.days[selectedDayIdx]}
          tripId={id}
          theme={theme}
          insets={insets}
          onSaveEvent={(eventIdx, draft) => handleSaveEvent(selectedDayIdx, eventIdx, draft)}
          onDeleteEvent={(eventIdx) => handleDeleteEvent(selectedDayIdx, eventIdx)}
          onSaveDayHeader={(title, subtitle, zone) => handleSaveDayHeader(selectedDayIdx, title, subtitle, zone)}
          onClose={() => setSelectedDayIdx(null)}
        />
      )}

      <AiRefineModal
        visible={showAiRefine}
        onClose={() => setShowAiRefine(false)}
        trip={trip}
        onTripUpdated={(updated) => {
          setTrip(updated);
          navigation.setOptions({ headerTitle: updated.meta.name });
        }}
      />
    </View>
  );
}

// ─── Day card (visual calendar) ───────────────────────────────────────────────

function dayGradient(style: import('@/types/trip').DayStyle): [string, string] {
  switch (style) {
    case 'special': return ['#9B0A23', '#C8102E'];
    case 'gold':    return ['#7A5C0E', '#C5A028'];
    case 'last':    return ['#2C2C2E', '#48484A'];
    default:        return ['#012169', '#034694'];
  }
}

function DayCard({
  day,
  tripId,
  onPress,
}: {
  day: import('@/types/trip').TripDay;
  tripId: string;
  onPress: () => void;
}) {
  const [coverUri, setCoverUri] = useState<string | null>(null);

  useEffect(() => {
    const uri = tripRepository.getDayCoverPhotoUri(tripId, day.n);
    FileSystem.getInfoAsync(uri).then((info) => setCoverUri(info.exists ? uri : null));
  }, [tripId, day.n]);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (result.canceled) return;
    await tripRepository.saveDayCoverPhoto(tripId, day.n, result.assets[0].uri);
    setCoverUri(result.assets[0].uri);
  };

  const [gradStart, gradEnd] = dayGradient(day.style);

  const CardBackground = coverUri ? (
    <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
  ) : (
    <LinearGradient
      colors={[gradStart, gradEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.dayCard, { opacity: pressed ? 0.88 : 1 }]}
    >
      {CardBackground}

      {/* Overlay scuro */}
      <LinearGradient
        colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.62)']}
        style={StyleSheet.absoluteFill}
      />

      {/* Camera button */}
      <Pressable onPress={pickCover} style={styles.dayCardCamera} hitSlop={12}>
        <SymbolView name="camera.fill" size={13} tintColor="rgba(255,255,255,0.9)" />
      </Pressable>

      {/* Contenuto centrato */}
      <View style={styles.dayCardContent}>
        <Text style={styles.dayCardN}>{day.dateLabel}</Text>
        <Text style={styles.dayCardDate}>Giorno {day.n}</Text>
        {day.title ? (
          <Text style={styles.dayCardTitle} numberOfLines={1}>{day.title}</Text>
        ) : null}
        {(() => {
          const places = [...new Set(
            day.events
              .filter(ev => ev.placeGuide)
              .map(ev => ev.placeGuide!)
          )].slice(0, 2);
          return places.length > 0 ? (
            <Text style={styles.dayCardZone} numberOfLines={1}>
              📍 {places.join('  ·  ')}
            </Text>
          ) : null;
        })()}
      </View>

      {/* Event count pill */}
      {day.events.length > 0 && (
        <View style={styles.dayCardEventBadge}>
          <Text style={styles.dayCardEventBadgeText}>{day.events.length} attività</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Calendar components ──────────────────────────────────────────────────────

function CalendarEventBlock({
  event,
  eventIdx,
  theme,
  onMove,
  onResize,
  onTap,
  onDragStart,
  onDragEnd,
}: {
  event: TripEvent;
  eventIdx: number;
  theme: TH;
  onMove: (idx: number, newTime: string) => void;
  onResize: (idx: number, newTimeTo: string) => void;
  onTap: (idx: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const baseTop = timeToPx(event.time);
  const baseHeight = defaultBlockHeight(event);
  const ty = useSharedValue(0);
  const heightDelta = useSharedValue(0);

  // .runOnJS(true) → tutte le callback girano sul JS thread, safe per setter React
  const movePan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-6, 6])
    .onBegin(() => {
      ty.value = 0;
      onDragStart();
    })
    .onUpdate((e) => {
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      const newTime = pxToTime(baseTop + e.translationY);
      ty.value = withSpring(0, { duration: 200 });
      onDragEnd();
      onMove(eventIdx, newTime);
    });

  const resizePan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-6, 6])
    .onBegin(() => {
      heightDelta.value = 0;
      onDragStart();
    })
    .onUpdate((e) => {
      heightDelta.value = e.translationY;
    })
    .onEnd((e) => {
      const newTimeTo = pxToTime(baseTop + baseHeight + e.translationY);
      heightDelta.value = withSpring(0, { duration: 200 });
      onDragEnd();
      onResize(eventIdx, newTimeTo);
    });

  const blockAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    height: Math.max(HOUR_HEIGHT / 4, baseHeight + heightDelta.value),
  }));

  const accentColor = dotColor(event);
  const bgColor = accentColor + '22';

  return (
    <GestureDetector gesture={movePan}>
      <Animated.View
        style={[
          styles.calBlock,
          blockAnimStyle,
          {
            top: baseTop,
            backgroundColor: bgColor,
            borderLeftColor: accentColor,
          },
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => onTap(eventIdx)}
        >
          <Text style={[styles.calBlockName, { color: theme.text }]} numberOfLines={1}>{event.name}</Text>
          <Text style={[styles.calBlockTime, { color: theme.textSecondary }]}>
            {event.time}{event.timeTo ? ` → ${event.timeTo}` : ''}
          </Text>
        </Pressable>
        {/* Resize handle — gesture separata */}
        <GestureDetector gesture={resizePan}>
          <View style={styles.calResizeHandle}>
            <View style={[styles.calResizeBar, { backgroundColor: accentColor + '88' }]} />
          </View>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
}

function CurrentTimeIndicator() {
  const [topPx, setTopPx] = useState(() => {
    const now = new Date();
    return timeToPx(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTopPx(timeToPx(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ position: 'absolute', top: topPx, left: 44, right: 8, height: 0 }}>
      <View style={styles.calNowDot} />
      <View style={styles.calNowLine} />
    </View>
  );
}

function DayCalendarView({
  day,
  theme,
  insets,
  onMove,
  onResize,
  onTap,
}: {
  day: TripDay;
  theme: TH;
  insets: ReturnType<typeof import('react-native-safe-area-context').useSafeAreaInsets>;
  onMove: (idx: number, newTime: string) => void;
  onResize: (idx: number, newTimeTo: string) => void;
  onTap: (idx: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (day.events.length > 0) {
      const firstTop = timeToPx(day.events[0].time);
      setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, firstTop - HOUR_HEIGHT * 1.5), animated: true }), 150);
    }
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      scrollEnabled={!isDragging}
      showsVerticalScrollIndicator={false}
      style={{ marginHorizontal: -Spacing.three }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
    >
      <View style={{ height: HOUR_HEIGHT * 24, position: 'relative' }}>
        {/* Griglia ore */}
        {Array.from({ length: 24 }).map((_, h) => (
          <View key={h} style={[styles.calHourRow, { top: h * HOUR_HEIGHT }]}>
            <Text style={[styles.calHourLabel, { color: theme.textSecondary }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
            <View style={[styles.calHourLine, { backgroundColor: theme.backgroundElement }]} />
          </View>
        ))}
        {/* Indicatore ora corrente */}
        <CurrentTimeIndicator />
        {/* Blocchi evento */}
        {day.events.map((ev, i) => (
          <CalendarEventBlock
            key={i}
            event={ev}
            eventIdx={i}
            theme={theme}
            onMove={onMove}
            onResize={onResize}
            onTap={onTap}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Day detail sheet ─────────────────────────────────────────────────────────

function DayDetailSheet({
  day,
  tripId,
  theme,
  insets,
  onSaveEvent,
  onDeleteEvent,
  onSaveDayHeader,
  onClose,
}: {
  day: import('@/types/trip').TripDay;
  tripId: string;
  theme: TH;
  insets: ReturnType<typeof import('react-native-safe-area-context').useSafeAreaInsets>;
  onSaveEvent: (eventIdx: number | null, draft: TripEvent) => Promise<void>;
  onDeleteEvent: (eventIdx: number) => Promise<void>;
  onSaveDayHeader: (title: string, subtitle: string, zone: string) => Promise<void>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<EditingEvent | null>(null);
  const [editingDayHeader, setEditingDayHeader] = useState(false);
  const [calView, setCalView] = useState<'list' | 'calendar'>('list');
  const [gradStart, gradEnd] = dayGradient(day.style);

  const handleDeleteEvent = (eventIdx: number) => {
    Alert.alert('Elimina attività', 'Vuoi rimuovere questa attività?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await onDeleteEvent(eventIdx);
          setEditing(null);
        },
      },
    ]);
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheetContainer, { backgroundColor: theme.background }]}>
        {/* Strip colorato con drag handle */}
        <LinearGradient
          colors={[gradStart, gradEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sheetStrip}
        >
          <View style={styles.sheetDragHandle} />
        </LinearGradient>

        {/* Header sheet */}
        <View style={styles.sheetHeader}>
          <Pressable onPress={onClose} style={styles.sheetCloseBtn}>
            <SymbolView name="xmark.circle.fill" size={28} tintColor={theme.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>{day.title}</Text>
            {day.subtitle ? (
              <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{day.subtitle}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => setEditingDayHeader(true)} style={styles.sheetEditBtn} hitSlop={8}>
            <SymbolView name="pencil" size={16} tintColor="#007AFF" />
          </Pressable>
        </View>

        {/* Corpo */}
        <View style={{ flex: 1 }}>
          {/* Header fisso: zone + toggle */}
          <View style={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.one }}>
            {day.zone ? (
              <View style={styles.sheetZoneRow}>
                <SymbolView name="location.fill" size={12} tintColor={theme.textSecondary} />
                <Text style={[styles.sheetZone, { color: theme.textSecondary }]}>{day.zone}</Text>
              </View>
            ) : null}
            {/* Toggle Lista / Calendario */}
            <View style={[styles.calToggleRow, { backgroundColor: theme.backgroundElement }]}>
              {(['list', 'calendar'] as const).map(v => (
                <Pressable
                  key={v}
                  onPress={() => setCalView(v)}
                  style={[
                    styles.calToggleBtn,
                    calView === v && [styles.calToggleBtnActive, { backgroundColor: theme.background }],
                  ]}
                >
                  <Text style={[styles.calToggleBtnText, { color: calView === v ? '#007AFF' : theme.textSecondary }]}>
                    {v === 'list' ? 'Lista' : 'Calendario'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {calView === 'list' ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: insets.bottom + Spacing.five, gap: Spacing.two, paddingTop: Spacing.two }}
              keyboardShouldPersistTaps="handled"
            >
              <EventList
                day={day}
                theme={theme}
                onEdit={(idx) => setEditing({ eventIdx: idx, draft: { ...day.events[idx] } })}
              />
              <Pressable
                onPress={() => setEditing({ eventIdx: null, draft: emptyEvent() })}
                style={[styles.addBtn, { borderColor: theme.backgroundElement }]}
              >
                <SymbolView name="plus.circle" size={18} tintColor="#007AFF" />
                <Text style={styles.addBtnText}>Aggiungi attività</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <DayCalendarView
                day={day}
                theme={theme}
                insets={insets}
                onMove={(idx, newTime) => {
                  const ev = day.events[idx];
                  // Mantieni la durata originale spostando anche timeTo dello stesso delta
                  const durationPx = ev.timeTo
                    ? timeToPx(ev.timeTo) - timeToPx(ev.time)
                    : HOUR_HEIGHT * 0.75;
                  const newTimeTo = ev.timeTo ? pxToTime(timeToPx(newTime) + durationPx) : ev.timeTo;
                  // Controlla sovrapposizione con altri eventi
                  const newStartPx = timeToPx(newTime);
                  const newEndPx = newStartPx + durationPx;
                  const overlaps = day.events.some((other, i) => {
                    if (i === idx) return false;
                    const otherStart = timeToPx(other.time);
                    const otherEnd = otherStart + defaultBlockHeight(other);
                    return newStartPx < otherEnd && newEndPx > otherStart;
                  });
                  if (!overlaps) {
                    onSaveEvent(idx, { ...ev, time: newTime, timeTo: newTimeTo });
                  }
                }}
                onResize={(idx, newTimeTo) => {
                  const ev = day.events[idx];
                  const newEndPx = timeToPx(newTimeTo);
                  const startPx = timeToPx(ev.time);
                  if (newEndPx <= startPx + HOUR_HEIGHT / 4) return; // min 15 min
                  const overlaps = day.events.some((other, i) => {
                    if (i === idx) return false;
                    const otherStart = timeToPx(other.time);
                    const otherEnd = otherStart + defaultBlockHeight(other);
                    return startPx < otherEnd && newEndPx > otherStart;
                  });
                  if (!overlaps) {
                    onSaveEvent(idx, { ...ev, timeTo: newTimeTo });
                  }
                }}
                onTap={(idx) => setEditing({ eventIdx: idx, draft: { ...day.events[idx] } })}
              />
              <Pressable
                onPress={() => setEditing({ eventIdx: null, draft: emptyEvent() })}
                style={[styles.addBtn, { borderColor: theme.backgroundElement, marginHorizontal: Spacing.three, marginBottom: insets.bottom + Spacing.two }]}
              >
                <SymbolView name="plus.circle" size={18} tintColor="#007AFF" />
                <Text style={styles.addBtnText}>Aggiungi attività</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Modal edit evento — dentro la sheet per stacking corretto */}
        {editing && (
          <EventEditModal
            draft={editing.draft}
            isNew={editing.eventIdx === null}
            tripId={tripId}
            theme={theme}
            onSave={async (draft) => {
              await onSaveEvent(editing.eventIdx, draft);
              setEditing(null);
            }}
            onDelete={
              editing.eventIdx !== null
                ? () => handleDeleteEvent(editing.eventIdx!)
                : undefined
            }
            onClose={() => setEditing(null)}
          />
        )}

        {/* Modal edit intestazione giorno */}
        {editingDayHeader && (
          <DayHeaderEditModal
            day={day}
            theme={theme}
            onSave={async (title, subtitle, zone) => {
              await onSaveDayHeader(title, subtitle, zone);
              setEditingDayHeader(false);
            }}
            onClose={() => setEditingDayHeader(false)}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Event list con raggruppamento opzionali ──────────────────────────────────

function EventList({
  day,
  theme,
  onEdit,
}: {
  day: TripDay;
  theme: TH;
  onEdit: (idx: number) => void;
}) {
  // Raggruppa eventi opzionali con lo stesso orario
  const groups: Array<{ type: 'single'; idx: number } | { type: 'options'; time: string; indices: number[] }> = [];

  day.events.forEach((ev, idx) => {
    if (!ev.isOptional) {
      groups.push({ type: 'single', idx });
      return;
    }
    const last = groups[groups.length - 1];
    if (last && last.type === 'options' && last.time === ev.time) {
      last.indices.push(idx);
    } else {
      groups.push({ type: 'options', time: ev.time, indices: [idx] });
    }
  });

  return (
    <View style={styles.timeline}>
      {groups.map((g, gi) => {
        if (g.type === 'single') {
          const ev = day.events[g.idx];
          return (
            <EventRow
              key={gi}
              event={ev}
              theme={theme}
              onEdit={() => onEdit(g.idx)}
            />
          );
        }
        // Gruppo di opzioni alternative
        return (
          <OptionsGroup
            key={gi}
            time={g.time}
            events={g.indices.map((i) => ({ ev: day.events[i], idx: i }))}
            theme={theme}
            onEdit={(idx) => onEdit(idx)}
          />
        );
      })}
    </View>
  );
}

// ─── Options group (G8 pattern) ───────────────────────────────────────────────

function OptionsGroup({
  time,
  events,
  theme,
  onEdit,
}: {
  time: string;
  events: { ev: TripEvent; idx: number }[];
  theme: TH;
  onEdit: (idx: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={[styles.optionsGroup, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.eventAccentStrip, { backgroundColor: '#8E8E93' }]} />
      <View style={{ flex: 1 }}>
        {/* Header gruppo */}
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={[styles.optionsHeader, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.eventTime, { color: theme.textSecondary }]}>{time}</Text>
          <View style={styles.optionsBadge}>
            <Text style={styles.optionsBadgeText}>Scegli un'opzione</Text>
          </View>
          <SymbolView
            name={expanded ? 'chevron.up' : 'chevron.down'}
            size={12}
            tintColor={theme.textSecondary}
          />
        </Pressable>

        {expanded && events.map(({ ev, idx }) => (
          <Pressable
            key={idx}
            onPress={() => onEdit(idx)}
            style={[styles.optionItem, { backgroundColor: theme.backgroundElement }]}
          >
            <Text style={[styles.optionName, { color: theme.text }]}>{ev.name}</Text>
            {ev.description ? (
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                {ev.description}
              </Text>
            ) : null}
            {ev.placeGuide ? (
              <Pressable
                onPress={() => Linking.openURL(guidamiUrl(ev))}
                style={styles.guidamiInline}
              >
                <SymbolView name="map.fill" size={11} tintColor="#007AFF" />
                <Text style={styles.guidamiInlineText}>Guidami</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({
  event,
  theme,
  onEdit,
}: {
  event: TripEvent;
  theme: TH;
  onEdit: () => void;
}) {
  const isBooked = event.isBooked || event.type === 'booked';
  const bgColor = isBooked
    ? 'rgba(200,16,46,0.07)'
    : theme.backgroundElement;

  return (
    <Pressable
      onPress={onEdit}
      style={[styles.eventRowContainer]}
    >
      <View style={[styles.eventBody, { backgroundColor: bgColor }]}>
        <View style={[styles.eventAccentStrip, { backgroundColor: dotColor(event) }]} />
        {/* Orario */}
        <View style={styles.eventTopRow}>
          <Text style={[styles.eventTime, { color: theme.textSecondary }]}>
            {event.time}{event.timeTo ? ` → ${event.timeTo}` : ''}
          </Text>
          {/* Matitina edit */}
          <View style={{ flex: 1 }} />
          <View style={styles.eventEditCircle}>
            <SymbolView name="pencil" size={11} tintColor="#007AFF" />
          </View>
        </View>

        <Text style={[styles.eventName, { color: theme.text }]}>{event.name}</Text>

        {event.description ? (
          <Text style={[styles.eventDesc, { color: theme.textSecondary }]}>{event.description}</Text>
        ) : null}

        {event.tip ? (
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>💡 {event.tip}</Text>
          </View>
        ) : null}

        {event.alert ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⏰ {event.alert}</Text>
          </View>
        ) : null}

        {event.placeGuide ? (
          <Pressable
            onPress={() => Linking.openURL(guidamiUrl(event))}
            style={styles.guidamiBtn}
          >
            <SymbolView name="map.fill" size={13} tintColor="#007AFF" />
            <Text style={styles.guidamiText}>Guidami</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Event edit modal ─────────────────────────────────────────────────────────

function normalizeEventDraft(ev: TripEvent): TripEvent {
  if (ev.type === 'booked') return { ...ev, type: 'visit', isBooked: true };
  return ev;
}

function EventEditModal({
  draft: initialDraft,
  isNew,
  tripId,
  theme,
  onSave,
  onDelete,
  onClose,
}: {
  draft: TripEvent;
  isNew: boolean;
  tripId: string;
  theme: TH;
  onSave: (draft: TripEvent) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TripEvent>(() => normalizeEventDraft(initialDraft));
  const set = (partial: Partial<TripEvent>) => setDraft((d) => ({ ...d, ...partial }));

  const [searchQuery, setSearchQuery] = useState(initialDraft.placeGuide ?? '');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<'start' | 'end' | null>(null);

  const pickTicket = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setIsUploadingPdf(true);
    try {
      const file = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const filename = `event-${Date.now()}.pdf`;
      const pdfPath = await tripRepository.saveTicketPdf(tripId, filename, base64);
      set({ ticketPath: pdfPath });
    } catch {
      Alert.alert('Errore', 'Impossibile caricare il file. Riprova.');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const searchPlace = async (query = searchQuery) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'iOS-TravelApp/1.0' } });
      const data: NominatimResult[] = await resp.json();
      setSearchResults(data);
    } catch {
      // silently ignore network errors during auto-search
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = (result: NominatimResult) => {
    const shortName = result.display_name.split(',')[0].trim();
    set({ placeGuide: shortName, placeLat: parseFloat(result.lat), placeLon: parseFloat(result.lon) });
    setSearchQuery(shortName);
    setSearchResults([]);
  };

  const clearPlace = () => {
    set({ placeGuide: undefined, placeLat: undefined, placeLon: undefined });
    setSearchQuery('');
    setSearchResults([]);
  };

  const EVENT_TYPES: { key: EventType; label: string; color: string }[] = [
    { key: 'visit', label: 'Visita', color: '#012169' },
    { key: 'meal', label: 'Pasto', color: '#C5A028' },
    { key: 'logistics', label: 'Spostamento', color: '#6B6B6B' },
  ];

  const handleSave = () => {
    if (!draft.name.trim()) {
      Alert.alert('Titolo obbligatorio', 'Inserisci un titolo per l\'attività.');
      return;
    }
    if (!isValidTime(draft.time)) {
      Alert.alert('Orario non valido', 'Usa il formato HH:MM (es. 09:30).');
      return;
    }
    if (draft.timeTo && !isValidTime(draft.timeTo)) {
      Alert.alert('Orario fine non valido', 'Usa il formato HH:MM (es. 11:00).');
      return;
    }
    onSave(draft);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={styles.dragHandle} />
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalBtn}>
            <Text style={styles.modalBtnCancel}>Annulla</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {isNew ? 'Nuova attività' : 'Modifica attività'}
          </Text>
          <Pressable onPress={handleSave} style={styles.modalBtn}>
            <Text style={styles.modalBtnSave}>Salva</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tipo evento */}
          <SectionLabel label="Tipo" theme={theme} />
          <View style={styles.typeRow}>
            {EVENT_TYPES.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => set({ type: t.key })}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: draft.type === t.key ? t.color : theme.backgroundElement,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typePillText,
                    { color: draft.type === t.key ? 'white' : theme.textSecondary },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Orario */}
          <SectionLabel label="Orario" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.timeRow}>
              {/* Orario inizio */}
              <Pressable
                style={{ flex: 1 }}
                onPress={() => setActiveTimePicker(p => p === 'start' ? null : 'start')}
              >
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Da</Text>
                <View style={[styles.timePickerBtn, activeTimePicker === 'start' && { borderColor: '#007AFF', borderWidth: 1.5 }]}>
                  <Text style={[styles.timePickerBtnText, { color: theme.text }]}>{draft.time || '—'}</Text>
                  <SymbolView name="clock" size={13} tintColor={theme.textSecondary} />
                </View>
              </Pressable>
              <Text style={[styles.timeSep, { color: theme.textSecondary }]}>→</Text>
              {/* Orario fine */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>A</Text>
                <View style={styles.timeRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (!draft.timeTo) {
                        // imposta default: inizio + 1h
                        const base = timeToDate(draft.time || '09:00');
                        base.setHours(base.getHours() + 1);
                        set({ timeTo: dateToTime(base) });
                      }
                      setActiveTimePicker(p => p === 'end' ? null : 'end');
                    }}
                  >
                    <View style={[styles.timePickerBtn, activeTimePicker === 'end' && { borderColor: '#007AFF', borderWidth: 1.5 }]}>
                      <Text style={[styles.timePickerBtnText, { color: draft.timeTo ? theme.text : theme.textSecondary }]}>
                        {draft.timeTo || 'Opzionale'}
                      </Text>
                      <SymbolView name="clock" size={13} tintColor={theme.textSecondary} />
                    </View>
                  </Pressable>
                  {draft.timeTo && (
                    <Pressable
                      onPress={() => { set({ timeTo: undefined }); setActiveTimePicker(null); }}
                      hitSlop={10}
                      style={{ paddingLeft: 6, justifyContent: 'center' }}
                    >
                      <SymbolView name="xmark.circle.fill" size={16} tintColor={theme.textSecondary} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
            {/* Picker inline */}
            {activeTimePicker && (
              <View>
                <View style={styles.pickerDoneRow}>
                  <Pressable onPress={() => setActiveTimePicker(null)}>
                    <Text style={styles.pickerDoneText}>Fatto</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={activeTimePicker === 'start'
                    ? timeToDate(draft.time)
                    : timeToDate(draft.timeTo ?? draft.time)}
                  mode="time"
                  display="spinner"
                  minuteInterval={5}
                  onChange={(_, date) => {
                    if (!date) return;
                    if (activeTimePicker === 'start') set({ time: dateToTime(date) });
                    else set({ timeTo: dateToTime(date) });
                  }}
                />
              </View>
            )}
          </View>

          {/* Titolo */}
          <SectionLabel label="Titolo" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.fieldInput, { color: theme.text }]}
              value={draft.name}
              onChangeText={(v) => set({ name: v })}
              placeholder="Nome dell'attività"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {/* Descrizione */}
          <SectionLabel label="Descrizione" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.fieldInputMulti, { color: theme.text }]}
              value={draft.description}
              onChangeText={(v) => set({ description: v })}
              placeholder="Aggiungi una descrizione..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Suggerimento 💡 */}
          <SectionLabel label="💡 Suggerimento" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.fieldInputMulti, { color: theme.text }]}
              value={draft.tip ?? ''}
              onChangeText={(v) => set({ tip: v || undefined })}
              placeholder="Consiglio utile per questa tappa..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Avviso ⏰ */}
          <SectionLabel label="⏰ Avviso" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.fieldInputMulti, { color: theme.text }]}
              value={draft.alert ?? ''}
              onChangeText={(v) => set({ alert: v || undefined })}
              placeholder="Avviso o promemoria orario..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Guidami */}
          <SectionLabel label="Guidami" theme={theme} />

          {/* Luogo selezionato */}
          {draft.placeGuide && draft.placeLat ? (
            <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.placeSelectedRow}>
                <SymbolView name="mappin.circle.fill" size={16} tintColor="#34C759" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.placeSelectedName, { color: theme.text }]}>{draft.placeGuide}</Text>
                  <Text style={[styles.placeSelectedCoords, { color: theme.textSecondary }]}>
                    {draft.placeLat.toFixed(5)}, {draft.placeLon!.toFixed(5)}
                  </Text>
                </View>
                <Pressable onPress={clearPlace} hitSlop={12}>
                  <SymbolView name="xmark.circle.fill" size={18} tintColor={theme.textSecondary} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => Linking.openURL(guidamiUrl(draft))}
                style={styles.verificaBtn}
              >
                <SymbolView name="map" size={14} tintColor="#007AFF" />
                <Text style={styles.verificaBtnText}>Verifica su Mappe</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
              {/* Ricerca testo */}
              <View style={styles.placeSearchRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1, color: theme.text }]}
                  value={searchQuery}
                  onChangeText={(v) => {
                    setSearchQuery(v);
                    set({ placeGuide: v || undefined, placeLat: undefined, placeLon: undefined });
                    setSearchResults([]);
                    if (searchTimer.current) clearTimeout(searchTimer.current);
                    if (!v.trim()) { setIsSearching(false); return; }
                    setIsSearching(true);
                    searchTimer.current = setTimeout(() => searchPlace(v), 650);
                  }}
                  placeholder="es. Buckingham Palace, London"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (searchTimer.current) clearTimeout(searchTimer.current);
                    searchPlace(searchQuery);
                  }}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={theme.textSecondary} style={{ marginRight: 4 }} />
                )}
              </View>

              {/* Risultati Nominatim */}
              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((r, i) => {
                    const parts = r.display_name.split(',').map(p => p.trim());
                    const name = parts[0];
                    const filtered = parts.slice(1).filter(p => !/^\d/.test(p));
                    const country = filtered[filtered.length - 1] ?? '';
                    const region = filtered.slice(-3, -1).join(', ');
                    const context = region ? `${region} · ${country}` : country;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => selectPlace(r)}
                        style={[
                          styles.searchResultRow,
                          i < searchResults.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.background },
                        ]}
                      >
                        <SymbolView name="mappin" size={13} tintColor="#007AFF" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.searchResultName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
                          {context ? <Text style={[styles.searchResultAddr, { color: theme.textSecondary }]} numberOfLines={1}>{context}</Text> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Toggle Prenotato — solo per visita e pasto */}
          {(draft.type === 'visit' || draft.type === 'meal') && (
            <>
              <SectionLabel label="Prenotazione" theme={theme} />
              <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabel, { color: theme.text }]}>Prenotato</Text>
                    <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                      Attiva se hai già una prenotazione per questa tappa
                    </Text>
                  </View>
                  <Switch
                    value={draft.isBooked === true}
                    onValueChange={(v) => set({ isBooked: v || undefined, ticketPath: v ? draft.ticketPath : undefined })}
                  />
                </View>
              </View>

              {/* Upload biglietto — visibile solo se prenotato */}
              {draft.isBooked && (
                <>
                  <SectionLabel label="Biglietto PDF" theme={theme} />
                  {draft.ticketPath ? (
                    <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
                      <View style={styles.ticketRow}>
                        <SymbolView name="doc.fill" size={18} tintColor="#007AFF" />
                        <Text style={[styles.ticketName, { color: theme.text }]} numberOfLines={1}>
                          {draft.ticketPath.split('/').pop()}
                        </Text>
                        <Pressable onPress={() => set({ ticketPath: undefined })} hitSlop={12}>
                          <SymbolView name="xmark.circle.fill" size={18} tintColor={theme.textSecondary} />
                        </Pressable>
                      </View>
                      <Text style={[styles.ticketHint, { color: theme.textSecondary }]}>
                        Il biglietto apparirà anche nella sezione Biglietti
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={pickTicket}
                      disabled={isUploadingPdf}
                      style={[styles.uploadBtn, { borderColor: theme.backgroundElement, opacity: isUploadingPdf ? 0.5 : 1 }]}
                    >
                      {isUploadingPdf
                        ? <ActivityIndicator size="small" color="#007AFF" />
                        : <SymbolView name="arrow.up.doc" size={18} tintColor="#007AFF" />}
                      <Text style={styles.uploadBtnText}>
                        {isUploadingPdf ? 'Caricamento…' : 'Carica biglietto PDF'}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </>
          )}

          {/* Evento alternativo */}
          <SectionLabel label="Evento alternativo" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>
                  È un'opzione alternativa
                </Text>
                <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                  Gli eventi alternativi con lo stesso orario vengono raggruppati
                </Text>
              </View>
              <Switch
                value={draft.isOptional === true}
                onValueChange={(v) => set({ isOptional: v || undefined })}
              />
            </View>
          </View>

          {/* Elimina */}
          {onDelete && (
            <Pressable onPress={onDelete} style={styles.deleteBtn}>
              <SymbolView name="trash" size={16} tintColor="#FF3B30" />
              <Text style={styles.deleteBtnText}>Elimina attività</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Day header edit modal ────────────────────────────────────────────────────

function DayHeaderEditModal({
  day,
  theme,
  onSave,
  onClose,
}: {
  day: TripDay;
  theme: TH;
  onSave: (title: string, subtitle: string, zone: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(day.title);
  const [subtitle, setSubtitle] = useState(day.subtitle);
  const [zone, setZone] = useState(day.zone);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={styles.dragHandle} />
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalBtn}>
            <Text style={styles.modalBtnCancel}>Annulla</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Intestazione giorno</Text>
          <Pressable onPress={() => onSave(title, subtitle, zone)} style={styles.modalBtn}>
            <Text style={styles.modalBtnSave}>Salva</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <SectionLabel label="Titolo giornata" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.fieldInput, { color: theme.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Titolo della giornata"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <SectionLabel label="Sottotitolo" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.fieldInput, { color: theme.text }]}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="es. Martedì 5 Agosto · South London"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <SectionLabel label="Zona / Area" theme={theme} />
          <View style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.fieldInput, { color: theme.text }]}
              value={zone}
              onChangeText={setZone}
              placeholder="es. South Kensington"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Componente utilità ────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: TH }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{label}</Text>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyEvent(): TripEvent {
  return {
    time: '',
    name: '',
    type: 'visit',
    description: '',
  };
}

function isValidTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}


function timeToDate(time: string): Date {
  const [h, m] = (time || '09:00').split(':').map(Number);
  const d = new Date();
  d.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dotColor(event: TripEvent): string {
  if (event.isBooked || event.type === 'booked') return '#C8102E';
  switch (event.type) {
    case 'meal': return '#C5A028';
    case 'logistics': return '#6B6B6B';
    default: return '#012169';
  }
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three, padding: Spacing.five },
  centerTitle: { fontSize: 20, fontWeight: '600' },
  centerText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Tab bar
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, flexGrow: 0 },
  tabBarContent: { paddingHorizontal: Spacing.two },
  tab: { width: 64, alignItems: 'center', paddingVertical: Spacing.two, gap: 2, position: 'relative' },
  tabDayN: { fontSize: 13, fontWeight: '700' },
  tabDate: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },

  // Day content
  dayContent: { padding: Spacing.three, gap: Spacing.two },

  // Day header
  dayHeader: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  dayHeaderTop: { flexDirection: 'row', alignItems: 'flex-start' },
  dayTitle: { fontSize: 22, fontWeight: '700' },
  daySubtitle: { fontSize: 14, marginTop: 2 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  zone: { fontSize: 13 },
  editDayBtn: { padding: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  placesList: { gap: 3, paddingTop: 2 },
  placesLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  placesText: { fontSize: 13, lineHeight: 18 },

  // Aggiungi btn
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },

  // Timeline
  timeline: { gap: Spacing.two },
  eventRowContainer: {},
  eventAccentStrip: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  eventBody: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: 4,
    marginBottom: Spacing.one,
  },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  eventTime: { fontSize: 12, fontWeight: '600' },
  eventName: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  eventDesc: { fontSize: 13, lineHeight: 18 },
  tipBox: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8 },
  tipText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  alertBox: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8 },
  alertText: { fontSize: 12, color: '#991B1B', lineHeight: 17 },
  guidamiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 12, backgroundColor: '#EFF6FF', marginTop: 2,
  },
  guidamiText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },

  // Options group
  optionsGroup: { borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  optionsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    borderRadius: 12, padding: Spacing.two, paddingHorizontal: Spacing.three,
    marginBottom: 4,
  },
  optionsBadge: { backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  optionsBadgeText: { fontSize: 11, fontWeight: '700', color: '#3730A3' },
  optionItem: {
    borderRadius: 12, padding: Spacing.two, paddingHorizontal: Spacing.three,
    marginBottom: 4, gap: 4,
  },
  optionName: { fontSize: 14, fontWeight: '600' },
  optionDesc: { fontSize: 12, lineHeight: 17 },
  guidamiInline: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 10, backgroundColor: '#EFF6FF', marginTop: 2,
  },
  guidamiInlineText: { fontSize: 12, fontWeight: '600', color: '#007AFF' },

  // Modal
  // Drag handle — pill centrato in cima ai modal
  dragHandle: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.25)',
  },

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.three, paddingTop: 4, paddingBottom: 18,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBtn: { minWidth: 70 },
  modalBtnCancel: { fontSize: 17, color: '#8E8E93' },
  modalBtnSave: { fontSize: 17, fontWeight: '600', color: '#007AFF', textAlign: 'right' },
  modalScroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: 4,
    paddingBottom: 80,
    gap: 0,
  },

  // Form fields
  sectionLabel: {
    fontSize: 13, fontWeight: '600', letterSpacing: 0.1,
    marginTop: 20, marginBottom: 6, marginLeft: 4,
  },
  fieldCard: {
    borderRadius: 16, paddingHorizontal: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  fieldInput: { fontSize: 16, paddingVertical: 15 },
  fieldInputMulti: { fontSize: 15, paddingVertical: 12, lineHeight: 22, minHeight: 64 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, paddingTop: 10, color: '#8E8E93' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 4 },
  timeInput: { fontSize: 26, fontWeight: '200', paddingTop: 14, paddingBottom: 8 },
  timeSep: { fontSize: 20, fontWeight: '200', marginTop: 16 },
  typeRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  typePill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  typePillText: { fontSize: 14, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: Spacing.two },
  switchLabel: { fontSize: 15, fontWeight: '500' },
  switchSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 8 },
  ticketName: { flex: 1, fontSize: 14, fontWeight: '500' },
  ticketHint: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two, padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  uploadBtnText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
  verificaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 12, backgroundColor: '#EFF6FF', marginBottom: 10,
  },
  verificaBtnText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two, marginTop: Spacing.four, paddingVertical: 14,
    borderRadius: 14, backgroundColor: '#FFF1F0',
  },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#FF3B30' },

  // Place search (Guidami)
  placeSelectedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, marginBottom: 10 },
  placeSelectedName: { fontSize: 15, fontWeight: '600' },
  placeSelectedCoords: { fontSize: 11, marginTop: 1 },
  placeSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtn: {
    backgroundColor: '#007AFF', borderRadius: 10,
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
  },
  searchResults: { marginTop: 8, borderRadius: 10, overflow: 'hidden' },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  searchResultName: { fontSize: 14, fontWeight: '600' },
  searchResultAddr: { fontSize: 12, marginTop: 1 },

  // Day grid (visual calendar)
  dayGrid: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },

  // Day card
  dayCard: {
    height: 200,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  dayCardCamera: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 7,
  },
  dayCardContent: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  dayCardN: {
    color: 'white',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  dayCardDate: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  dayCardTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  dayCardZone: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    paddingHorizontal: 28,
    textAlign: 'center',
  },
  dayCardEventBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayCardEventBadgeText: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Day detail sheet
  sheetContainer: { flex: 1 },
  sheetStrip: { height: 36, justifyContent: 'center', alignItems: 'center' },
  sheetDragHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  sheetStripLabel: { display: 'none' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 14,
  },
  sheetCloseBtn: { padding: 2 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSubtitle: { fontSize: 13, marginTop: 1 },
  sheetEditBtn: {
    backgroundColor: 'rgba(0,122,255,0.12)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventEditCircle: {
    backgroundColor: 'rgba(0,122,255,0.10)',
    borderRadius: 11,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Time picker button
  timePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  timePickerBtnText: { fontSize: 22, fontWeight: '600', letterSpacing: 0.5 },
  pickerDoneRow: { alignItems: 'flex-end', paddingHorizontal: 4, paddingTop: 8 },
  pickerDoneText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },

  sheetBody: { padding: Spacing.three, gap: Spacing.two },
  sheetZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.one },
  sheetZone: { fontSize: 13 },

  // Calendar view toggle
  calToggleRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    marginBottom: Spacing.two,
  },
  calToggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  calToggleBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  calToggleBtnText: { fontSize: 13, fontWeight: '600' },

  // Calendar hour grid
  calHourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: HOUR_HEIGHT,
  },
  calHourLabel: {
    width: 44,
    fontSize: 10,
    fontWeight: '500',
    paddingTop: 2,
    textAlign: 'right',
    paddingRight: 8,
  },
  calHourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginTop: 8,
  },

  // Calendar event block
  calBlock: {
    position: 'absolute',
    left: 48,
    right: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  calBlockName: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  calBlockTime: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  calResizeHandle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calResizeBar: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },

  // Current time indicator
  calNowLine: {
    position: 'absolute',
    left: 4,
    right: 0,
    height: 2,
    backgroundColor: '#FF3B30',
  },
  calNowDot: {
    position: 'absolute',
    left: 0,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
});
