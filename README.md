# iOS-TravelApp

App iOS nativa per la pianificazione e gestione di viaggi di famiglia. Costruita con React Native + Expo.

**Zero backend. Zero account richiesti.** I dati vivono sul tuo iPhone, con iCloud Backup automatico.

---

## Come funziona

```
Lista viaggi → Seleziona viaggio → 5 sezioni
                                   ├── Giorni      (itinerario giorno per giorno)
                                   ├── Mappa       (Google My Maps interattiva)
                                   ├── Metro       (mappa metro scrollabile)
                                   ├── Info        (cambio · voli · supermercati · pratiche · altro)
                                   └── Biglietti   (PDF biglietti, viewer inline)
```

Per collaborare con qualcuno: **Esporta viaggio** → AirDrop/WhatsApp → l'altro importa nell'app → aggiunge modifiche → te lo rimanda → reimporti.

---

## Setup sviluppo

### Prerequisiti

- Node.js 18+
- **Expo Go** installato sull'iPhone dall'App Store (gratuito, nessun Developer Account)
- Xcode (opzionale, solo per simulatore iOS)

### Installa e avvia

```bash
cd iOS-TravelApp
npm install
npx expo start
```

Scansiona il QR code con la fotocamera iPhone → l'app si apre in Expo Go.

> Dopo l'installazione di moduli nativi (es. `react-native-webview`) usare sempre `npx expo start --clear`.

---

## Sezioni dell'app

| Sezione | Funzionalità |
|---|---|
| **Giorni** | Day card con timeline eventi, badge, bottone "Guidami" → Apple Maps |
| **Mappa** | Google My Maps embed interattivo con tutti i luoghi del viaggio |
| **Metro** | Mappa metro a schermo intero, scrollabile a destra/sinistra, pinch-to-zoom |
| **Info › Cambio** | Convertitore valute interattivo con importi rapidi |
| **Info › Voli** | Card andata/ritorno con tracciamento in tempo reale e checklist pre-partenza |
| **Info › Supermercati** | Card con logo, orari, indirizzo, pulsante Guidami |
| **Info › Info pratiche** | Griglia informazioni pratiche (corrente, fuso orario, ecc.) |
| **Info › Altro** | Trasporti locali (es. Oyster) + checklist prenotazioni |
| **Biglietti** | Collega PDF da Files app, apri inline senza uscire dall'app |

---

## Stack tecnico

| Componente | Scelta |
|---|---|
| Framework | React Native + Expo 57 (React 19, RN 0.86) |
| Navigazione | Expo Router file-based |
| Storage | `expo-file-system` (locale) + iCloud Backup automatico |
| Mappe / SVG | `react-native-webview` (WKWebView) |
| PDF viewer | `react-native-webview` (WKWebView renderizza PDF nativamente su iOS) |
| PDF import | `expo-document-picker` (Files app picker nativo) |
| Icone | `expo-symbols` (SF Symbols iOS) |
| Tipi | TypeScript strict |

---

## Schema dati

I viaggi sono salvati come file JSON sul device. Lo schema è compatibile con quello della PWA web (`~/claude/TravelApp`) — i `trip.json` esistenti sono importabili direttamente. Un viaggio di esempio (London 2026) è incluso in `assets/london-2026.json`.

---

## Git workflow

```bash
git add src/ assets/ app.json package.json package-lock.json
git commit -m "descrizione"
git push  # → github.com/frabarz17/iOS-TravelApp
```

---

*Progetto personale — Francesco Barzanò*
