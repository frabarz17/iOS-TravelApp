# AGENTS.md — Istruzioni per agenti AI

Linee guida operative per Claude Code (e altri agenti) che lavorano su questo repo.

## Orientamento rapido

App iOS nativa per viaggi di famiglia. React Native + Expo Router. Dati locali su device via `expo-file-system`. Nessun backend esterno.

**Leggi sempre `CLAUDE.md` prima di iniziare qualsiasi modifica** — contiene le regole critiche e l'architettura.

## Come esplorare il codice

```
src/app/          — schermate (Expo Router file-based)
src/components/   — componenti riusabili
src/types/trip.ts — interfacce TypeScript dello schema dati
src/repository/   — TripRepository (unico accesso allo storage)
src/hooks/        — custom hooks
src/constants/    — tema colori/font
```

Per capire lo schema dati, leggi `src/types/trip.ts` e il JSON di esempio in `~/claude/TravelApp/trips/london-2026/trip.json`.

## Pattern fondamentali

### Aggiungere una nuova schermata

1. Crea il file in `src/app/trip/[id]/nuova-sezione.tsx`
2. Aggiorna `src/app/trip/[id]/_layout.tsx` aggiungendo il tab
3. Segui il pattern viewer/editor con `useState(false)` per `isEditing`

### Aggiungere un campo al data model

1. Aggiorna l'interfaccia in `src/types/trip.ts`
2. Aggiorna `TripRepository.createEmptyTrip()` con il valore di default
3. Aggiungi il campo nel viewer (schermata pertinente)
4. Aggiungi il campo nell'editor inline

### Modificare lo storage

**Non toccare mai `expo-file-system` direttamente nelle componenti.** Modifica solo `src/repository/TripRepository.ts`. La UI chiama sempre i metodi del repository.

### Aggiungere una dipendenza Expo

```bash
npx expo install nome-pacchetto
```

Usare sempre `expo install` (non `npm install`) per i pacchetti Expo-compatibili — gestisce automaticamente la versione corretta per SDK 57.

## Testing locale

```bash
cd /Users/francescobarzano/claude/iOS-TravelApp
npx expo start
# QR code → Expo Go su iPhone (test su device reale senza Developer Account)
# Tasto 'i' → simulatore iOS (richiede Xcode installato)
```

## Regole operative

### NON fare
- Non chiamare API GitHub, Vercel, o altri backend per i dati del viaggio
- Non usare `expo-file-system` direttamente nelle componenti UI
- Non aggiungere `any` in TypeScript — definire sempre le interfacce
- Non hardcodare padding top/bottom — usare sempre `useSafeAreaInsets()`
- Non installare pacchetti con `npm install` (usare `expo install`)
- Non creare un "admin separato" — l'editing è sempre inline nella sezione

### SÌ fare
- Passare sempre per `TripRepository` per leggere/scrivere dati
- Seguire il pattern `isEditing` / `setIsEditing` per le schermate editabili
- Testare su Expo Go (device fisico) oltre che sul simulatore
- Aggiornare `src/types/trip.ts` quando si aggiunge un campo al modello
- Aggiornare `CLAUDE.md` se si aggiungono nuovi pattern architetturali

## Contesto progetto

Questo progetto è la riscrittura nativa iOS della PWA `~/claude/TravelApp`. Lo schema JSON dei viaggi è identico — i file `trip.json` esistenti sono importabili direttamente. Il backend GitHub + Vercel della PWA non viene più usato: i dati vivono sul device.

Piano architetturale completo: `~/.claude/plans/vorrei-valutare-con-te-playful-dusk.md`
