# CLAUDE.md — iOS-TravelApp

Istruzioni per Claude Code. Leggere prima di qualsiasi modifica.

## Cos'è questo progetto

App iOS nativa per la pianificazione e gestione di viaggi di famiglia. Costruita con React Native + Expo (Expo Router). Nessun backend esterno: i dati vivono localmente sul device in `expo-file-system`, con iCloud Backup automatico.

L'app sostituisce la PWA TravelApp (in `~/claude/TravelApp`) con un'esperienza nativa iOS: editing inline in ogni sezione, nessun admin separato, export/import JSON per collaborare con altri.

## Stato implementazione

| Fase | Descrizione | Stato |
|---|---|---|
| 0 | Setup progetto Expo + struttura cartelle | ✅ Completata |
| 1 | Data model TypeScript + TripRepository | ✅ Completata |
| 2 | Lista viaggi + home screen con cover photo e cities | ✅ Completata |
| 3 | Viewer itinerario (giorni + eventi + Guidami geolocalizzato) | ✅ Completata |
| 4 | Viewer mappa + metro + info (5 sottosezioni) + biglietti + PDF | ✅ Completata |
| 5a | Editing itinerario (day cards, event edit modal, trip edit modal) | ✅ Completata |
| 5c | Vista calendario giornaliero con drag & resize + date/time picker | ✅ Completata |
| 5b | Editing inline Info, Mappa, Metro | ⏳ Da fare |
| 6 | Export/Import JSON (collaborazione) | ⏳ Da fare |
| 7 | Polish iOS + offline + app icon | ⏳ Da fare |

## Stack tecnico

| Componente | Tecnologia | Note |
|---|---|---|
| Framework | React Native + Expo 57 | React 19.2.3, RN 0.86.2 |
| Navigazione | Expo Router (file-based) | Struttura in `src/app/` |
| State | useState + props | No Redux, no Context globale |
| Storage | `expo-file-system/legacy` | Subpath `/legacy` obbligatorio su SDK 57 |
| Path constants | `import { Paths } from 'expo-file-system'` | `Paths.document.uri`, `Paths.cache.uri` |
| Geocoding | Nominatim (OpenStreetMap) | `User-Agent: iOS-TravelApp/1.0` obbligatorio |
| PDF viewer | `react-native-webview` | WKWebView su iOS renderizza PDF nativo |
| Mappe / SVG | `react-native-webview` | WebView per Google My Maps embed e mappa metro SVG |
| PDF import | `expo-document-picker` | Picker nativo Files app |
| PDF share | `expo-sharing` | Share sheet iOS |
| Foto | `expo-image-picker` | Cover photo viaggio + cover photo giorno |
| Icone | `expo-symbols` | SF Symbols iOS-native |
| Gesture drag | `react-native-gesture-handler ~2.32.0` | Richiede `GestureHandlerRootView` in `_layout.tsx` |
| Animazioni | `react-native-reanimated 4.5.1` | `useSharedValue` + `useAnimatedStyle` per calendario |
| Date/time picker | `@react-native-community/datetimepicker` | Spinner nativo iOS; richiede `--clear` dopo install |
| Tipi | TypeScript strict | Interfacce in `src/types/trip.ts` |

## Struttura file

```
iOS-TravelApp/
├── src/
│   ├── app/
│   │   ├── _layout.tsx             ← Root Stack + ThemeProvider + SplashScreen
│   │   ├── index.tsx               ← Lista viaggi, TripCard, TripEditModal, FAB +
│   │   └── trip/[id]/
│   │       ├── _layout.tsx         ← 5 tab: Giorni · Mappa · Metro · Info · Biglietti
│   │       ├── itinerario.tsx      ← Day cards (visual calendar), DayDetailSheet,
│   │       │                          EventEditModal, DayHeaderEditModal
│   │       ├── mappa.tsx           ← WebView Google My Maps embed (mid=...)
│   │       ├── metro.tsx           ← WebView SVG h:100vh scrollabile a dx/sx
│   │       ├── info.tsx            ← 5 pill: Cambio · Voli · Supermercati · Info · Altro
│   │       └── biglietti.tsx       ← Import PDF da Files, viewer inline WebView modal
│   ├── repository/
│   │   └── TripRepository.ts       ← Singleton: CRUD JSON, cover photo, day cover, PDF tickets
│   ├── types/
│   │   └── trip.ts                 ← Interfacce TypeScript (schema identico alla PWA)
│   ├── hooks/
│   │   └── use-theme.ts            ← Colori light/dark da useColorScheme
│   └── constants/
│       └── theme.ts                ← Colors, Spacing, FontSize
├── assets/
│   ├── london-2026.json            ← Viaggio di esempio bundled
│   └── images/rich/                ← Immagini hero home + empty state
└── app.json
```

## Architettura itinerario (itinerario.tsx)

### Flusso di navigazione
```
ItinerarioScreen
└── ScrollView di DayCard (visual calendar — una card per giorno, full-width)
    └── tap → setSelectedDayIdx(i)
              → DayDetailSheet (pageSheet modal)
                  ├── Header: xmark | Giorno N · data | edit day
                  ├── ScrollView eventi (EventRow / OptionsGroup)
                  └── [modali figli — DENTRO la sheet per stacking corretto]
                      ├── EventEditModal
                      └── DayHeaderEditModal
```

### Regola critica: modal stacking
I modal figli (`EventEditModal`, `DayHeaderEditModal`) DEVONO essere renderizzati **dentro** il JSX di `DayDetailSheet`. Un `Modal` RN non può apparire sopra un altro `Modal` a meno che non sia nel suo subtree. Se li sposti fuori, i bottoni edit smettono di funzionare.

### Tipo evento: isBooked vs type booked
`'booked'` esiste nell'`EventType` solo per backward compat con dati legacy (london-2026.json). Non usarlo per nuovi eventi.

```typescript
// Nuovo pattern: visit o meal + flag isBooked
{ type: 'visit', isBooked: true, ticketPath: 'tickets/event-123.pdf' }

// Legacy (ancora supportato in rendering):
{ type: 'booked' }  // → trattato come visit + isBooked: true
```

Quando si apre `EventEditModal` con `type: 'booked'`, viene normalizzato automaticamente:
```typescript
function normalizeEventDraft(ev: TripEvent): TripEvent {
  if (ev.type === 'booked') return { ...ev, type: 'visit', isBooked: true };
  return ev;
}
```

### Ticket sincronizzati automaticamente
Quando un evento ha `isBooked: true` e l'utente carica un PDF, `handleSaveEvent` aggiorna automaticamente `trip.tickets[]` — nessun intervento manuale.

### Cover photo
- **Viaggio**: `trips/{id}/cover.jpg` — via `TripRepository.getCoverPhotoUri`
- **Giorno**: `trips/{id}/day-covers/day-{n}.jpg` — via `TripRepository.getDayCoverPhotoUri`

## Architettura vista calendario (itinerario.tsx)

**Toggle Lista | Calendario** dentro `DayDetailSheet`. In modalità Calendario la ScrollView esterna è sostituita da `DayCalendarView` con la propria ScrollView interna.

**Componenti:**
- `DayCalendarView` — ScrollView verticale 24h (`HOUR_HEIGHT = 64px/ora`), `scrollEnabled={!isDragging}` durante drag
- `CalendarEventBlock` — blocco animato per evento; due gesture: `movePan` (sposta) e `resizePan` (ridimensiona handle inferiore)
- `CurrentTimeIndicator` — linea rossa con pallino, aggiornata ogni 60s

**Helper functions (module-level):**
- `timeToPx(time)` — HH:MM → pixel dall'inizio della griglia
- `pxToTime(px)` — pixel → HH:MM con snap a 15 min
- `defaultBlockHeight(event)` — altezza blocco: da `timeTo` se presente, altrimenti 45 min default

**Logica onMove:** calcola `durationPx = timeToPx(timeTo) - timeToPx(time)` e sposta sia `time` che `timeTo` dello stesso delta → durata mantenuta. Controlla overlap con tutti gli altri eventi prima di salvare.

**Logica onResize:** modifica solo `timeTo`. Controlla overlap e minimo 15 min.

**Gesture e thread:** tutti i `Gesture.Pan()` usano `.runOnJS(true)` — indispensabile. Senza di esso le callback girano sul UI thread e crashano chiamando setter React (vedi gotcha 10).

---

## Regole critiche — NON SBAGLIARE

### 1. useGlobalSearchParams nei tab screen

Tutti i file in `trip/[id]/` devono usare `useGlobalSearchParams`, **mai** `useLocalSearchParams`. I tab screen figli non vedono i parametri del segmento padre dinamico `[id]` con `useLocalSearchParams` — restituisce `undefined`.

```typescript
// ✅ Corretto
const { id } = useGlobalSearchParams<{ id: string }>();

// ❌ Sbagliato — id sarà undefined nei tab screen
const { id } = useLocalSearchParams<{ id: string }>();
```

### 2. headerTitle nei tab screen (non title)

In `navigation.setOptions()` dentro i tab screen usare `headerTitle`, **mai** `title`. `title` sovrascrive anche la label del tab bar.

```typescript
navigation.setOptions({ headerTitle: trip.meta.name }); // ✅
navigation.setOptions({ title: trip.meta.name });       // ❌
```

### 3. expo-file-system: subpath /legacy + Paths

```typescript
import * as FileSystem from 'expo-file-system/legacy';  // ✅ operazioni
import { Paths } from 'expo-file-system';                // ✅ path constants
// FileSystem.documentDirectory → undefined su SDK 57    // ❌
```

### 4. JSON assets: path relativo, non alias @/

```typescript
import londonData from '../../assets/london-2026.json'; // ✅
import londonData from '@/assets/london-2026.json';     // ❌ Metro non lo risolve
```

### 5. Moduli nativi: rebuild obbligatorio

```bash
npx expo start --clear  # dopo expo install di qualsiasi modulo nativo
```

### 6. Nominatim: User-Agent obbligatorio

```typescript
fetch(url, { headers: { 'User-Agent': 'iOS-TravelApp/1.0' } })
// Senza User-Agent la API restituisce 403
```

### 7. StyleSheet.absoluteFill (non absoluteFillObject)

```typescript
style={StyleSheet.absoluteFill}     // ✅ esiste in questa versione RN
style={StyleSheet.absoluteFillObject} // ❌ non esiste, crasha
```

### 8. Nessun backend esterno

Nessuna chiamata a GitHub API, Vercel, o altri servizi per i dati. L'unica API esterna ammessa è Frankfurter (tassi di cambio) e Nominatim (geocoding).

### 9. TripRepository è l'unico accesso allo storage

La UI non chiama mai `expo-file-system` direttamente. Tutto passa per `tripRepository`.

### 10. Gesture Handler: .runOnJS(true) obbligatorio

I `Gesture.Pan()` usati nella vista calendario devono avere `.runOnJS(true)`. Senza di esso le callback `onBegin`/`onEnd` girano sul **UI thread** e chiamando setter React (es. `setIsDragging(true)`) causano un crash immediato al primo touch.

```typescript
const pan = Gesture.Pan()
  .runOnJS(true)   // ← obbligatorio
  .activeOffsetY([-6, 6])
  .onBegin(() => { onDragStart(); })  // sicuro: JS thread
  .onEnd((e) => { onMove(idx, newTime); });
```

### 11. GestureHandlerRootView in _layout.tsx

`react-native-gesture-handler` richiede `GestureHandlerRootView` come wrapper radice per funzionare dentro le `Modal` di React Native. Già presente in `src/app/_layout.tsx`. Non rimuoverlo.

### 12. DateTimePicker: --clear dopo install

`@react-native-community/datetimepicker` è un modulo nativo. Dopo `npx expo install @react-native-community/datetimepicker` serve sempre `npx expo start --clear`.

## Schema dati — campi rilevanti per l'editing

### TripEvent (aggiornato)

```typescript
interface TripEvent {
  type: 'visit' | 'meal' | 'logistics' | 'booked'; // 'booked' = legacy
  isBooked?: boolean;   // true = visita/pasto con prenotazione
  ticketPath?: string;  // path relativo PDF, es. "tickets/event-123.pdf"
  placeGuide?: string;  // nome luogo per Guidami
  placeLat?: number;    // coordinate precise da Nominatim
  placeLon?: number;
  // ... altri campi
}
```

### TripMeta (aggiornato)

```typescript
interface TripMeta {
  cities?: string[];  // città visitate, mostrate nella card home
  // ... altri campi
}
```

### TripSummary (per la home)

```typescript
interface TripSummary {
  cities: string[];   // sempre array ([] se non impostato)
  // ... altri campi
}
```

## Architettura navigazione

```
Stack (root)
└── Tabs (trip/[id]/_layout.tsx)
    ├── itinerario   → "Giorni"
    ├── mappa        → "Mappa"    (WebView Google My Maps)
    ├── metro        → "Metro"    (WebView SVG)
    ├── info         → "Info"     (pill nav interna: Cambio/Voli/Supermercati/Info/Altro)
    └── biglietti    → "Biglietti" (import PDF + modal viewer)
```

Il tab layout ha un `headerLeft` con pulsante `← chevron.left` per tornare alla lista viaggi.

## Testing

```bash
cd /Users/francescobarzano/claude/iOS-TravelApp
npx expo start          # QR code → Expo Go su iPhone
npx expo start --clear  # dopo installazione di moduli nativi

# TypeScript check
npx tsc --noEmit
```

## Git

```bash
git add src/ assets/ app.json package.json package-lock.json
git commit -m "descrizione"
git push  # repo: github.com/frabarz17/iOS-TravelApp
```

## Riferimenti

- PWA originale (schema dati + logica business): `~/claude/TravelApp/`
- Dati viaggio di esempio: `~/claude/TravelApp/trips/london-2026/trip.json`
- Schema dati TypeScript: `src/types/trip.ts`
