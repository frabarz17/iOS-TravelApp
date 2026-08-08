# CLAUDE.md — iOS-TravelApp

Istruzioni per Claude Code. Leggere prima di qualsiasi modifica.

## Cos'è questo progetto

App iOS nativa per la pianificazione e gestione di viaggi di famiglia. Costruita con React Native + Expo (Expo Router). Nessun backend esterno: i dati vivono localmente sul device in `expo-file-system`, con iCloud Backup automatico.

L'app sostituisce la PWA TravelApp (in `~/claude/TravelApp`) con un'esperienza nativa iOS: editing inline in ogni sezione, nessun admin separato, export/import JSON per collaborare con altri.

## Stato implementazione

| Fase | Descrizione | Stato |
|---|---|---|
| 0 | Setup progetto Expo + struttura cartelle | ✅ Completata |
| 1 | Data model TypeScript + TripRepository | ⏳ Da fare |
| 2 | Lista viaggi + creazione nuovo viaggio | ⏳ Da fare |
| 3 | Viewer itinerario (giorni + eventi) | ⏳ Da fare |
| 4 | Viewer mappa + metro + biglietti + info | ⏳ Da fare |
| 5 | Editing inline per ogni sezione | ⏳ Da fare |
| 6 | Export/Import JSON (collaborazione) | ⏳ Da fare |
| 7 | Polish iOS + offline + PDF caching | ⏳ Da fare |

## Stack tecnico

| Componente | Tecnologia | Note |
|---|---|---|
| Framework | React Native + Expo 57 | React 19, RN 0.86 |
| Navigazione | Expo Router (file-based) | Struttura in `src/app/` |
| State | React Context + useState | No Redux |
| Storage | `expo-file-system` | JSON locali in Documents |
| Maps | `react-native-maps` | MapKit iOS nativo |
| PDF | `expo-file-system` + `expo-sharing` | Apertura nativa |
| Valute | fetch Frankfurter API | Fallback offline su rate locale |
| Import/Export | `expo-document-picker` + `expo-sharing` | Per collaborazione |
| Tipi | TypeScript strict | Interfacce in `src/types/` |

## Struttura file (target)

```
iOS-TravelApp/
├── src/
│   ├── app/                        ← Expo Router pages
│   │   ├── _layout.tsx             ← Root layout
│   │   ├── index.tsx               ← Lista viaggi (home)
│   │   └── trip/
│   │       ├── [id]/
│   │       │   ├── _layout.tsx     ← Tab layout per il viaggio
│   │       │   ├── itinerario.tsx  ← Giorni + eventi (viewer + edit)
│   │       │   ├── mappa.tsx       ← Google My Maps embed + edit
│   │       │   ├── metro.tsx       ← Immagine metro scrollabile + edit
│   │       │   ├── info.tsx        ← Voli, valute, supermercati, pratiche
│   │       │   └── biglietti.tsx   ← PDF biglietti + upload/edit
│   ├── components/                 ← Componenti riusabili
│   │   ├── trip/                   ← Componenti specifici per trip
│   │   └── ui/                     ← Componenti UI generici
│   ├── types/
│   │   └── trip.ts                 ← Interfacce TypeScript (schema dati)
│   ├── repository/
│   │   └── TripRepository.ts       ← Astrazione storage (locale oggi, cloud domani)
│   ├── constants/
│   │   └── theme.ts                ← Colori/font di default
│   └── hooks/                      ← Custom hooks
├── assets/                         ← Immagini, icone
├── app.json                        ← Config Expo
├── package.json
└── CLAUDE.md
```

## Schema dati (trip.json)

Lo schema è ereditato dalla PWA TravelApp — i JSON esistenti sono importabili direttamente. Le interfacce TypeScript stanno in `src/types/trip.ts`.

Sezioni principali: `meta`, `hotel`, `flights`, `map`, `practicalInfo`, `markets`, `oyster`, `bookingChecklist`, `days[]`, `tickets[]`.

Vedi `~/claude/TravelApp/trips/london-2026/trip.json` come esempio di riferimento completo.

## Architettura dati: TripRepository

**Regola fondamentale:** la UI non tocca mai `expo-file-system` direttamente. Passa sempre per `TripRepository`. Questo permette di cambiare il backend di storage (locale → iCloud Drive → GitHub) senza toccare i componenti.

```typescript
// Uso corretto
const repo = useTripRepository();
await repo.saveTrip(trip);

// MAI direttamente
await FileSystem.writeAsStringAsync(...); // ← non farlo nelle componenti
```

## Navigazione: pattern Expo Router

- **Lista viaggi**: `src/app/index.tsx`
- **Dettaglio viaggio**: `src/app/trip/[id]/_layout.tsx` con tab bottom bar
- **Ogni sezione**: file separato in `src/app/trip/[id]/`
- **Modali editing**: usare `expo-router` modal presentation

## Editing inline: pattern

Ogni schermata ha due modalità — viewer e editor — gestite con un flag locale:

```typescript
const [isEditing, setIsEditing] = useState(false);
// Header right: tasto "Modifica" / "Fine"
// In viewer: componenti di sola lettura
// In editor: TextInput, DatePicker, ecc.
```

Il salvataggio avviene al tap "Fine" (non live): chiama `tripRepository.saveTrip(updatedTrip)`.

## Regole critiche

### 1. Nessun backend esterno
L'app è completamente autonoma. Non chiamare GitHub API, Vercel, o altri servizi esterni per i dati del viaggio. L'unica API esterna ammessa per i dati è Frankfurter (tassi di cambio valuta).

### 2. TripRepository è l'unico accesso allo storage
Vedi sezione "Architettura dati" sopra.

### 3. TypeScript strict
Tutti i file sono `.tsx`/`.ts`. Nessun `any` implicito. Le interfacce del trip stanno in `src/types/trip.ts` e devono essere aggiornate se si aggiunge un campo.

### 4. Safe area
Usare sempre `useSafeAreaInsets()` o `<SafeAreaView>` per gestire notch e Dynamic Island. Non hardcodare padding/margin top.

### 5. Expo SDK 57
Usare solo package compatibili con Expo SDK 57. Verificare su https://docs.expo.dev/versions/v57.0.0/ prima di aggiungere dipendenze.

## Testing

```bash
cd /Users/francescobarzano/claude/iOS-TravelApp
npx expo start
# Scansiona il QR code con Expo Go (iPhone) per vedere l'app sul device
# oppure premi 'i' per aprire nel simulatore iOS (richiede Xcode)
```

## Git

```bash
git add src/ assets/ app.json package.json
git commit -m "descrizione"
git push  # repo: github.com/frabarz17/iOS-TravelApp
```

## Riferimenti

- PWA originale (schema dati + logica business): `~/claude/TravelApp/`
- Dati viaggio di esempio: `~/claude/TravelApp/trips/london-2026/trip.json`
- Piano architetturale: `~/.claude/plans/vorrei-valutare-con-te-playful-dusk.md`
- Expo SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/
