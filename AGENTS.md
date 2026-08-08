# AGENTS.md — Istruzioni per agenti AI

Linee guida operative per Claude Code (e altri agenti) che lavorano su questo repo.

## Orientamento rapido

App iOS nativa per viaggi di famiglia. React Native + Expo Router. Dati locali su device via `expo-file-system`. Nessun backend esterno.

**Leggi sempre `CLAUDE.md` prima di iniziare qualsiasi modifica** — contiene le regole critiche e i gotcha tecnici che hanno richiesto debugging in passato.

## Come esplorare il codice

```
src/app/                     — schermate (Expo Router file-based)
src/app/trip/[id]/           — 5 tab del dettaglio viaggio
src/types/trip.ts            — interfacce TypeScript dello schema dati
src/repository/              — TripRepository (unico accesso allo storage)
src/hooks/use-theme.ts       — colori light/dark
src/constants/theme.ts       — Spacing, FontSize, Colors
assets/london-2026.json      — viaggio di esempio bundled
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

## Pattern fondamentali

### Aggiungere una nuova schermata tab

1. Crea `src/app/trip/[id]/nome-sezione.tsx`
2. Usa `useGlobalSearchParams<{ id: string }>()` (non Local)
3. Usa `navigation.setOptions({ headerTitle: trip.meta.name })` (non title)
4. Aggiorna `src/app/trip/[id]/_layout.tsx` con il nuovo `<Tabs.Screen>`

### Aggiungere un campo al data model

1. Aggiorna l'interfaccia in `src/types/trip.ts`
2. Aggiorna `TripRepository.createEmptyTrip()` con il valore di default
3. Aggiorna viewer e (quando implementato) editor inline della sezione pertinente

### Modificare lo storage

Non toccare mai `expo-file-system` direttamente nelle componenti. Modifica solo `src/repository/TripRepository.ts`. La UI chiama sempre i metodi del singleton `tripRepository`.

### Aggiungere una dipendenza Expo

```bash
npx expo install nome-pacchetto
# Se è un modulo nativo (contiene codice Swift/ObjC):
npx expo start --clear
```

Usare sempre `expo install` (non `npm install`) per i pacchetti Expo-compatibili — gestisce automaticamente la versione corretta per SDK 57.

## Testing

```bash
cd /Users/francescobarzano/claude/iOS-TravelApp
npx expo start
# QR code → Expo Go su iPhone (test su device reale senza Developer Account)
# Tasto 'i' → simulatore iOS (richiede Xcode installato)

# TypeScript check
./node_modules/.bin/tsc --noEmit -p tsconfig.json
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

### SÌ fare
- Passare sempre per `tripRepository` per leggere/scrivere dati
- Usare `useGlobalSearchParams` in tutti i tab screen
- Usare `headerTitle` (non `title`) in `navigation.setOptions`
- Fare `npx expo start --clear` dopo installazione di moduli nativi
- Aggiornare `src/types/trip.ts` quando si aggiunge un campo al modello
- Aggiornare `CLAUDE.md` se si scoprono nuovi gotcha tecnici

## Contesto progetto

Riscrittura nativa iOS della PWA `~/claude/TravelApp`. Lo schema JSON dei viaggi è identico — i file `trip.json` esistenti sono importabili direttamente nell'app. Il backend GitHub + Vercel della PWA non viene usato: i dati vivono sul device.
