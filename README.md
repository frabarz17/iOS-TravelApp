# iOS-TravelApp

App iOS nativa per la pianificazione e gestione di viaggi di famiglia. Costruita con React Native + Expo.

**Zero backend. Zero account richiesti.** I dati vivono sul tuo iPhone, con iCloud Backup automatico.

---

## Come funziona

```
Lista viaggi → Seleziona viaggio → Sezioni (Itinerario · Mappa · Metro · Info · Biglietti)
                                         ↕ editing inline in ogni sezione
```

Ogni sezione è sia viewer che editor: tap "Modifica" per editare il contenuto direttamente nella schermata, senza admin separato.

Per collaborare con qualcuno: **Esporta viaggio** → AirDrop/WhatsApp → l'altro importa nell'app, aggiunge le sue modifiche → te lo rimanda → reimporti.

---

## Setup sviluppo

### 1. Prerequisiti

- Node.js 18+
- **Expo Go** installato sull'iPhone dall'App Store (gratuito)

### 2. Installa dipendenze

```bash
cd iOS-TravelApp
npm install
```

### 3. Avvia

```bash
npx expo start
```

Scansiona il QR code con la fotocamera iPhone (o direttamente da Expo Go) → l'app si apre sul tuo telefono.

---

## Struttura app

| Sezione | Contenuto |
|---|---|
| **Itinerario** | Day card con timeline eventi, bottone "Guidami" per navigazione |
| **Mappa** | Google My Maps embed interattivo |
| **Metro** | Immagine mappa metro scrollabile |
| **Info** | Voli + checklist · Convertitore valute · Supermercati · Info pratiche |
| **Biglietti** | Card PDF biglietti, visualizzazione nativa |

---

## Stack tecnico

| Componente | Scelta |
|---|---|
| Framework | React Native + Expo 57 |
| Navigazione | Expo Router (file-based) |
| Storage | `expo-file-system` (locale) + iCloud Backup automatico |
| Maps | `react-native-maps` (MapKit iOS) |
| Valute | Frankfurter API (fallback offline) |
| Tipi | TypeScript strict |

---

## Schema dati

I viaggi sono salvati come file JSON sul device. Lo schema è compatibile con quello della PWA web (`~/claude/TravelApp`) — i trip.json esistenti sono importabili direttamente.

---

## Git workflow

```bash
git add src/ assets/ app.json
git commit -m "descrizione"
git push  # → github.com/frabarz17/iOS-TravelApp
```

---

*Progetto personale — Francesco Barzanò*
