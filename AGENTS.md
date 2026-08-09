# AGENTS.md — Istruzioni per agenti AI

Linee guida operative per Claude Code (e altri agenti) che lavorano su questo repo.

## Orientamento rapido

App iOS nativa per viaggi di famiglia. React Native + Expo Router. Dati locali su device via `expo-file-system`. Nessun backend esterno.

**Leggi sempre `CLAUDE.md` prima di iniziare qualsiasi modifica** — contiene le regole critiche e i gotcha tecnici che hanno richiesto debugging in passato.

## Come esplorare il codice

```
src/app/                     — schermate (Expo Router file-based)
src/app/index.tsx            — home: lista viaggi, TripCard, TripEditModal
src/app/trip/[id]/           — 5 tab del dettaglio viaggio
src/app/trip/[id]/itinerario.tsx — day cards, sheet, event edit, Guidami
src/types/trip.ts            — interfacce TypeScript dello schema dati
src/repository/              — TripRepository (unico accesso allo storage)
src/hooks/use-theme.ts       — colori light/dark
src/constants/theme.ts       — Spacing, FontSize, Colors
assets/london-2026.json      — viaggio di esempio bundled
assets/images/rich/          — immagini hero home + empty state
```

Per capire lo schema dati, leggi `src/types/trip.ts` e `assets/london-2026.json`.

## Gotcha critici (imparati a caro prezzo)

| Problema | Causa | Fix |
|---|---|---|
| `id` undefined nei tab screen | `useLocalSearchParams` non vede il segmento padre `[id]` | Usare `useGlobalSearchParams` in tutti i file dentro `trip/[id]/` |
| Tab labels diventano tutti il nome del viaggio | `navigation.setOptions({ title: ... })` sovrascrive anche la tab label | Usare `headerTitle` invece di `title` |
| `documentDirectory` undefined | SDK 57 ha spostato i path constants | `import { Paths } from 'expo-file-system'` per i path; `expo-file-system/legacy` per le operazioni |
| Metro non risolve `@/assets/london-2026.json` | L'alias `@/` non funziona per JSON in Metro | Usare path relativo `../../assets/london-2026.json` |
| App crasha dopo `expo install react-native-webview` | Modulo nativo non caricato senza rebuild | Sempre `npx expo start --clear` dopo moduli nativi |
| SF Symbol crasha silenziosamente | Nome symbol inesistente sul device | Testare i symbol names su device reale, non solo simulatore |
| Nominatim restituisce 403 | User-Agent mancante | `headers: { 'User-Agent': 'iOS-TravelApp/1.0' }` obbligatorio |
| `StyleSheet.absoluteFillObject` crasha | Non esiste in questa versione di RN | Usare `StyleSheet.absoluteFill` |
| Event edit modal non si apre | Modal figlio renderizzato fuori dalla parent Modal | I modal figli vanno DENTRO il subtree JSX della parent Modal |
| Placeholder testo grande clippato in alto | TextInput con fontSize > 20 ha bisogno di paddingTop extra | `paddingTop` ≥ `fontSize * 0.5` per evitare clipping ascender |
| Calendario crasha al primo touch | `Gesture.Pan()` senza `.runOnJS(true)` → callback su UI thread → crash su setter React | Aggiungere `.runOnJS(true)` a ogni `Gesture.Pan()` che chiama funzioni JS |
| Gesture non funzionano dentro Modal | `GestureHandlerRootView` assente nel layout radice | Avvolgere `_layout.tsx` con `GestureHandlerRootView` (già in `src/app/_layout.tsx`) |

## Architettura editing itinerario

Il pattern dei modal nested è critico — non rompere l'ordine:

```
DayDetailSheet (Modal pageSheet)
├── Toggle Lista | Calendario
├── [Lista] EventList + Aggiungi
├── [Calendario] DayCalendarView
│   ├── Griglia 24h (HOUR_HEIGHT = 64px/ora)
│   ├── CalendarEventBlock × N (Gesture.Pan move + resize)
│   └── CurrentTimeIndicator (linea rossa ora corrente)
└── EventEditModal (Modal pageSheet) ← DENTRO DayDetailSheet
    └── DayHeaderEditModal (Modal pageSheet) ← DENTRO DayDetailSheet
```

Mai spostare `EventEditModal` o `DayHeaderEditModal` fuori dal JSX di `DayDetailSheet`. I Modal React Native non possono apparire sopra altri Modal se non sono nel loro subtree.

### Logica calendario

- `onMove(idx, newTime)` in `DayDetailSheet`: calcola durata originale e sposta anche `timeTo` dello stesso delta; controlla overlap prima di salvare
- `onResize(idx, newTimeTo)`: solo `timeTo`, controlla overlap e minimo 15 min
- Blocco snaps back automaticamente a `ty = 0` con `withSpring` in `onEnd`; se il save non avviene (overlap), rimane alla posizione originale

## Tipo evento: isBooked vs booked

`'booked'` come EventType è **legacy** — esiste solo per london-2026.json. Nuovi eventi usano il flag:

```typescript
// ✅ Nuovo pattern
{ type: 'visit', isBooked: true, ticketPath: 'tickets/event-123.pdf' }

// 'booked' legacy — leggibile ma non scrivibile dalla UI
{ type: 'booked' }
```

`normalizeEventDraft()` in itinerario.tsx converte `booked` → `visit + isBooked: true` all'apertura della modal di editing.

## Pattern fondamentali

### Aggiungere una nuova schermata tab

1. Crea `src/app/trip/[id]/nome-sezione.tsx`
2. Usa `useGlobalSearchParams<{ id: string }>()` (non Local)
3. Usa `navigation.setOptions({ headerTitle: trip.meta.name })` (non title)
4. Aggiorna `src/app/trip/[id]/_layout.tsx` con il nuovo `<Tabs.Screen>`

### Aggiungere un campo al data model

1. Aggiorna l'interfaccia in `src/types/trip.ts`
2. Se il campo è in `TripMeta`, aggiorna anche `TripRepository.createEmpty()` con il valore di default
3. Se il campo è in `TripSummary`, aggiorna `getAllTripSummaries()` nel repository
4. Aggiorna viewer e editor della sezione pertinente

### Aggiungere copertine / media

```typescript
// Trip cover photo
tripRepository.getCoverPhotoUri(tripId)           // URI
tripRepository.saveCoverPhoto(tripId, sourceUri)  // salva da ImagePicker

// Day cover photo
tripRepository.getDayCoverPhotoUri(tripId, dayN)
tripRepository.saveDayCoverPhoto(tripId, dayN, sourceUri)
```

### Modificare lo storage

Non toccare mai `expo-file-system` direttamente nelle componenti. Modifica solo `src/repository/TripRepository.ts`. La UI chiama sempre i metodi del singleton `tripRepository`.

### Aggiungere una dipendenza Expo

```bash
npx expo install nome-pacchetto
# Se è un modulo nativo (contiene codice Swift/ObjC):
npx expo start --clear
```

Usare sempre `expo install` (non `npm install`) per i pacchetti Expo-compatibili.

## Testing

```bash
cd /Users/francescobarzano/claude/iOS-TravelApp
npx expo start
# QR code → Expo Go su iPhone (test su device reale senza Developer Account)
# Tasto 'i' → simulatore iOS (richiede Xcode installato)

# TypeScript check
npx tsc --noEmit
```

## Regole operative

### NON fare
- Non usare `useLocalSearchParams` nei file dentro `trip/[id]/` — usare `useGlobalSearchParams`
- Non usare `navigation.setOptions({ title: ... })` nei tab screen — usare `headerTitle`
- Non chiamare `expo-file-system` direttamente nelle componenti — passare per `TripRepository`
- Non importare JSON con l'alias `@/assets/` — usare path relativo
- Non aggiungere `any` in TypeScript — definire sempre le interfacce
- Non hardcodare padding top/bottom — usare sempre `useSafeAreaInsets()`
- Non installare pacchetti con `npm install` — usare `expo install`
- Non creare un "admin separato" — l'editing è sempre inline nella sezione
- Non usare `StyleSheet.absoluteFillObject` — usare `StyleSheet.absoluteFill`
- Non rendere EventEditModal fuori dal subtree di DayDetailSheet

### SÌ fare
- Passare sempre per `tripRepository` per leggere/scrivere dati
- Usare `useGlobalSearchParams` in tutti i tab screen
- Usare `headerTitle` (non `title`) in `navigation.setOptions`
- Fare `npx expo start --clear` dopo installazione di moduli nativi
- Aggiornare `src/types/trip.ts` quando si aggiunge un campo al modello
- Aggiornare `CLAUDE.md` e `AGENTS.md` se si scoprono nuovi gotcha tecnici
- Verificare zero errori con `npx tsc --noEmit` prima di ogni commit

## Contesto progetto

Riscrittura nativa iOS della PWA `~/claude/TravelApp`. Lo schema JSON dei viaggi è identico — i file `trip.json` esistenti sono importabili direttamente nell'app. Il backend GitHub + Vercel della PWA non viene usato: i dati vivono sul device.
