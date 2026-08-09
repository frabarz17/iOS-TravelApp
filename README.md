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

## Funzionalità implementate

### Home — Lista viaggi
- Card viaggio con foto cover personalizzabile, nome, città visitate e date
- Bottone matita (cerchio traslucido) su ogni card → modal di editing completo
- Modal viaggio: nome, sottotitolo, date, città (ricerca Nominatim), foto cover
- FAB `+` per creare nuovo viaggio
- Caricamento viaggio di esempio (London 2026)

### Giorni & Itinerario
- **Visual calendar**: ogni giorno è una card full-width con foto di sfondo personalizzabile e gradiente
- Tap sulla card → **DayDetailSheet** con timeline eventi del giorno
- **Tipi evento**: Visita · Pasto · Spostamento (con striscia colorata laterale)
- **Prenotato**: toggle su Visita e Pasto — attiva upload PDF biglietto, sincronizzato automaticamente nella sezione Biglietti
- **Guidami**: ricerca luogo via Nominatim → coordinate precise → Apple Maps `maps://?ll=lat,lon`
- Editing completo: crea/modifica/elimina eventi, modifica intestazione giorno
- Supporto eventi alternativi (stesso orario, utente sceglie)

### Mappa
- Google My Maps embed interattivo (WebView)

### Metro
- Immagine/SVG mappa metro a schermo intero, scrollabile, pinch-to-zoom

### Info
- **Cambio valuta**: convertitore interattivo con importi rapidi e tasso di cambio live (Frankfurter)
- **Voli**: card andata/ritorno con tracciamento e checklist pre-partenza
- **Supermercati**: card con logo, orari, indirizzo, Guidami
- **Info pratiche**: griglia informazioni (corrente, lingua, fuso, emergenze…)
- **Altro**: trasporti locali (Oyster card, ecc.) + checklist prenotazioni

### Biglietti
- Import PDF da Files app
- Viewer PDF inline (WebView WKWebView, rendering nativo iOS)
- Biglietti collegati agli eventi prenotati (aggiunti automaticamente)

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

### TypeScript check

```bash
npx tsc --noEmit
```

---

## Stack tecnico

| Componente | Scelta |
|---|---|
| Framework | React Native + Expo 57 (React 19, RN 0.86) |
| Navigazione | Expo Router file-based |
| Storage | `expo-file-system` (locale) + iCloud Backup automatico |
| Geocoding | Nominatim (OpenStreetMap) |
| Mappe / SVG | `react-native-webview` (WKWebView) |
| PDF viewer | `react-native-webview` (WKWebView renderizza PDF nativamente su iOS) |
| PDF import | `expo-document-picker` (Files app picker nativo) |
| Foto cover | `expo-image-picker` |
| Icone | `expo-symbols` (SF Symbols iOS) |
| Tipi | TypeScript strict |

---

## Schema dati

I viaggi sono salvati come file JSON sul device. Lo schema è compatibile con quello della PWA web (`~/claude/TravelApp`) — i `trip.json` esistenti sono importabili direttamente. Un viaggio di esempio (London 2026) è incluso in `assets/london-2026.json`.

### Struttura storage on-device

```
Documents/
└── trips/
    └── {tripId}/
        ├── trip.json          ← dati viaggio completi
        ├── cover.jpg          ← foto cover viaggio (opzionale)
        ├── day-covers/
        │   └── day-{n}.jpg    ← foto cover giorno (opzionale)
        └── tickets/
            ├── biglietto.pdf  ← PDF biglietti importati
            └── event-*.pdf    ← PDF biglietti collegati ad eventi
```

---

## Git workflow

```bash
git add src/ assets/ app.json package.json package-lock.json
git commit -m "descrizione"
git push  # → github.com/frabarz17/iOS-TravelApp
```

---

*Progetto personale — Francesco Barzanò*
