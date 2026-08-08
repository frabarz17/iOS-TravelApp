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
| 2 | Lista viaggi + caricamento viaggio esempio (London 2026) | ✅ Completata |
| 3 | Viewer itinerario (giorni + eventi + Guidami) | ✅ Completata |
| 4 | Viewer mappa + metro + info (5 sottosezioni) + biglietti + PDF | ✅ Completata |
| 5 | Editing inline per ogni sezione | ⏳ Da fare |
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
| PDF viewer | `react-native-webview` | WKWebView su iOS renderizza PDF nativo |
| Mappe / SVG | `react-native-webview` | WebView per Google My Maps embed e mappa metro SVG |
| PDF import | `expo-document-picker` | Picker nativo Files app |
| PDF share | `expo-sharing` | Share sheet iOS |
| Icone | `expo-symbols` | SF Symbols iOS-native |
| Tipi | TypeScript strict | Interfacce in `src/types/trip.ts` |

## Struttura file

```
iOS-TravelApp/
├── src/
│   ├── app/
│   │   ├── _layout.tsx             ← Root Stack + ThemeProvider + SplashScreen
│   │   ├── index.tsx               ← Lista viaggi, FAB +, footer importa London 2026
│   │   └── trip/[id]/
│   │       ├── _layout.tsx         ← 5 tab: Giorni · Mappa · Metro · Info · Biglietti
│   │       ├── itinerario.tsx      ← Tab bar giorni, day card, timeline eventi, Guidami
│   │       ├── mappa.tsx           ← WebView Google My Maps embed (mid=...)
│   │       ├── metro.tsx           ← WebView SVG h:100vh scrollabile a dx/sx
│   │       ├── info.tsx            ← 5 pill: Cambio · Voli · Supermercati · Info · Altro
│   │       └── biglietti.tsx       ← Import PDF da Files, viewer inline WebView modal
│   ├── repository/
│   │   └── TripRepository.ts       ← Singleton: CRUD JSON + getTicketUri
│   ├── types/
│   │   └── trip.ts                 ← Interfacce TypeScript (schema identico alla PWA)
│   ├── hooks/
│   │   └── use-theme.ts            ← Colori light/dark da useColorScheme
│   └── constants/
│       └── theme.ts                ← Colors, Spacing, FontSize
├── assets/
│   └── london-2026.json            ← Viaggio di esempio bundled (importato in index.tsx)
└── app.json
```

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

In `navigation.setOptions()` dentro i tab screen usare `headerTitle`, **mai** `title`. `title` sovrascrive anche la label del tab bar (renderebbe tutti i tab "Londra 2026" invece di "Giorni", "Mappa", ecc.).

```typescript
// ✅ Aggiorna solo l'header
navigation.setOptions({ headerTitle: trip.meta.name });

// ❌ Sovrascrive anche la label del tab bar
navigation.setOptions({ title: trip.meta.name });
```

### 3. expo-file-system: subpath /legacy + Paths

Su Expo SDK 57 `documentDirectory` e `cacheDirectory` non sono più esportati dal modulo principale.

```typescript
// ✅ Operazioni su file
import * as FileSystem from 'expo-file-system/legacy';

// ✅ Path constants
import { Paths } from 'expo-file-system';
const TRIPS_DIR = `${Paths.document.uri}trips/`;
const tempPath = `${Paths.cache.uri}export.json`;

// ❌ Non funziona su SDK 57
import * as FileSystem from 'expo-file-system';
FileSystem.documentDirectory // → undefined
```

### 4. JSON assets: path relativo, non alias @/

Metro bundler non risolve l'alias `@/assets/` per i file JSON.

```typescript
// ✅ Path relativo da src/app/index.tsx
import londonData from '../../assets/london-2026.json';

// ❌ Metro non lo risolve
import londonData from '@/assets/london-2026.json';
```

### 5. Moduli nativi: rebuild obbligatorio

`react-native-webview` e `expo-document-picker` sono moduli nativi. Dopo l'installazione:

```bash
npx expo start --clear
```

Senza `--clear` Expo Go non carica i nuovi moduli nativi.

### 6. Nessun backend esterno

L'app è completamente autonoma. Non chiamare GitHub API, Vercel, o altri servizi per i dati del viaggio. L'unica API esterna ammessa è Frankfurter (tassi di cambio).

### 7. TripRepository è l'unico accesso allo storage

La UI non chiama mai `expo-file-system` direttamente. Tutto passa per `tripRepository`.

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

Il tab layout ha un `headerLeft` con pulsante `← chevron.left` per tornare alla lista viaggi (lo swipe back non funziona con i Tabs che assorbono i gesti orizzontali).

## Editing inline (Fase 5 — da implementare)

Pattern da seguire per ogni schermata:

```typescript
const [isEditing, setIsEditing] = useState(false);
// Header right: "Modifica" → setIsEditing(true) / "Fine" → salva + setIsEditing(false)
// Viewer: componenti di sola lettura
// Editor: TextInput, DatePicker, sheet modal per form complesse
// Salvataggio: tripRepository.saveTrip(updatedTrip) al tap "Fine"
```

## Testing

```bash
cd /Users/francescobarzano/claude/iOS-TravelApp
npx expo start          # QR code → Expo Go su iPhone
npx expo start --clear  # dopo installazione di moduli nativi

# TypeScript check
./node_modules/.bin/tsc --noEmit -p tsconfig.json
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
