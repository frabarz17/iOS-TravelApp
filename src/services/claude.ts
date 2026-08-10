import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import { Trip } from '@/types/trip';
import { tripRepository } from '@/repository/TripRepository';

const SETTINGS_PATH = `${Paths.document.uri}ai_settings.json`;
const GEMINI_MODEL = 'gemini-flash-latest';

// ─── API key storage ──────────────────────────────────────────────────────────

export async function getApiKey(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_PATH);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(SETTINGS_PATH);
    return JSON.parse(raw).aiApiKey ?? null;
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  let existing: Record<string, unknown> = {};
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_PATH);
    if (info.exists) {
      existing = JSON.parse(await FileSystem.readAsStringAsync(SETTINGS_PATH));
    }
  } catch { /* file corrotto — sovrascriviamo */ }
  await FileSystem.writeAsStringAsync(
    SETTINGS_PATH,
    JSON.stringify({ ...existing, aiApiKey: key }),
  );
}

// ─── Trip generation ──────────────────────────────────────────────────────────

export interface TripGenParams {
  destination: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  adults: number;
  children: string[];  // fasce d'età, es. ['3-6 anni', '7-12 anni']
  tripType: string;
  interests: string;
  notes: string;
  // Logistica opzionale
  arrivalAirport?: string;   // es. "NRT - Tokyo Narita"
  arrivalTime?: string;      // es. "14:30"
  hotel?: string;            // es. "Park Hyatt Tokyo, Shinjuku"
  departureAirport?: string; // es. "NRT - Tokyo Narita"
  departureTime?: string;    // es. "10:00"
  apiKey: string;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

const SYSTEM_PROMPT = `Sei un esperto pianificatore di viaggi. Il tuo compito è generare un itinerario completo in formato JSON per un'app iOS di viaggi.

REGOLE IMPORTANTI:
- Scrivi TUTTO in italiano (nomi attività, descrizioni, suggerimenti, zone, subtitle dei giorni, ecc.)
- Genera eventi per giorno con orari realistici (primo evento ≥ 09:00, ultimo ≤ 23:00): 4-6 eventi per viaggi ≤7 giorni, 3-5 per 8-14 giorni, 3-4 per viaggi più lunghi (descrizioni più brevi per contenere le dimensioni)
- Ogni evento deve avere una descrizione dettagliata e utile (2-4 frasi), non un semplice titolo
- Imposta theme.primary e theme.accent con colori HEX contestuali alla destinazione
- Imposta currency con la valuta corretta del paese (GBP per UK, JPY per Giappone, USD per USA, ecc.)
- Imposta meta.flag con la corretta emoji bandiera del paese
- Imposta meta.cities con l'array delle città principali dell'itinerario
- Imposta meta.country con il nome del paese in italiano
- Usa day.style: "last" sull'ultimo giorno, "special" su giorni con esperienze particolari o memorabili
- Il campo dateLabel deve essere nel formato "29 LUG" (giorno + 3 lettere mese in italiano maiuscolo)
- Il campo transportSummary descrive i trasporti del giorno (es. [{label: "Metro", detail: "Linea A → Colosseo"}])
- I badges dei giorni devono essere informativi (es. [{text: "Prenotazione richiesta", color: "red"}])
- Per il tipo evento usa: "visit" per visite/musei/attrazioni, "meal" per pasti, "logistics" per trasporti/check-in/spostamenti
- Il campo placeGuide deve contenere il nome del luogo da cercare su Google Maps per la navigazione
- I campi voli, hotel, map, markets, oyster, bookingChecklist, tickets rimangono vuoti/vuoti array come indicato
- Se viene fornito l'orario di atterraggio del volo di andata: il primo giorno inizia DOPO l'atterraggio, considera il tempo per bagagli e trasferimento in hotel (almeno 1.5-2h), se l'atterraggio è oltre le 17:00 pianifica solo check-in + cena vicino all'hotel
- Se viene fornito l'albergo/zona di alloggio: considera la sua posizione nei percorsi giornalieri per minimizzare i trasferimenti
- Se viene fornito l'orario del volo di ritorno: l'ultimo giorno deve concludersi con tempo sufficiente per raggiungere l'aeroporto (almeno 3h prima del volo), pianifica solo attività mattutine/nel tragitto
- Se ci sono bambini, adatta l'itinerario: 0-2 anni → evita file lunghe, prevedi spazi per cambio/allattamento, pause frequenti; 3-6 anni → attività brevi e interattive, parchi giochi, musei con laboratori; 7-12 anni → bilanciare cultura e attività divertenti (zoo, parchi, esperienze hands-on); 13-17 anni → coinvolgi con tecnologia, street food, esperienze urban

SCHEMA JSON DA PRODURRE (rispetta esattamente tutti i campi):
{
  "meta": {
    "id": "PLACEHOLDER_ID",
    "name": "Nome viaggio evocativo",
    "subtitle": "Sottotitolo breve",
    "destination": "Città principale",
    "country": "Nome paese in italiano",
    "flag": "🏳️",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "travelers": { "adults": 2, "children": [] },
    "theme": { "primary": "#HEXCOLOR", "accent": "#HEXCOLOR", "gold": "#C5A028" },
    "currency": {
      "local": { "code": "EUR", "flag": "🇪🇺", "label": "Euro" },
      "home": { "code": "EUR", "flag": "🇪🇺", "label": "Euro" },
      "fallbackRate": 1,
      "quickAmounts": [5, 10, 20, 50]
    },
    "language": "it",
    "cities": ["Città1", "Città2"]
  },
  "hotel": { "name": "", "address": "", "zone": "", "landmarks": [] },
  "flights": {
    "outbound": { "flightNumber": "", "airline": "", "date": "", "from": { "iata": "", "terminal": "", "time": "" }, "to": { "iata": "", "terminal": "", "time": "" }, "duration": "", "trackingUrl": "", "checklist": [], "checklistTitle": "" },
    "return": { "flightNumber": "", "airline": "", "date": "", "from": { "iata": "", "terminal": "", "time": "" }, "to": { "iata": "", "terminal": "", "time": "" }, "duration": "", "trackingUrl": "", "checklist": [], "checklistTitle": "" }
  },
  "map": { "googleMyMapsId": "", "metroMapUrl": "" },
  "practicalInfo": {
    "items": [
      { "label": "Lingua", "value": "...", "sub": "..." },
      { "label": "Valuta", "value": "...", "sub": "..." },
      { "label": "Fuso orario", "value": "...", "sub": "..." },
      { "label": "Emergenze", "value": "112", "sub": "Numero emergenze" }
    ]
  },
  "markets": [],
  "oyster": { "body": [], "points": [], "tip": "" },
  "bookingChecklist": [],
  "days": [
    {
      "n": 1,
      "date": "YYYY-MM-DD",
      "dateLabel": "01 GEN",
      "title": "Titolo giorno",
      "subtitle": "Sottotitolo giorno",
      "style": "default",
      "zone": "Quartiere o zona",
      "transportSummary": [{ "label": "Mezzo", "detail": "Dettaglio" }],
      "badges": [{ "text": "Testo badge", "color": "blue" }],
      "events": [
        {
          "time": "09:30",
          "timeTo": "11:00",
          "name": "Nome attività",
          "type": "visit",
          "description": "Descrizione dettagliata dell'attività in italiano.",
          "tip": "Suggerimento pratico opzionale",
          "placeGuide": "Nome luogo per Google Maps"
        }
      ]
    }
  ],
  "tickets": []
}

Rispondi SOLO con il JSON dentro un blocco \`\`\`json ... \`\`\`, senza nessun testo prima o dopo.`;

function repairTruncatedJson(json: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if ((ch === '}' || ch === ']') && stack[stack.length - 1] === ch) stack.pop();
  }
  return json + stack.reverse().join('');
}

function extractJson(text: string): string | null {
  // ```json ... ```
  let m = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (m) return m[1].trim();
  // ``` ... ``` senza specifica linguaggio
  m = text.match(/```\s*([\s\S]*?)\s*```/);
  if (m && m[1].trim().startsWith('{')) return m[1].trim();
  // JSON grezzo: dalla prima { all'ultima }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return null;
}

const REFINE_SYSTEM_PROMPT = `Sei un esperto pianificatore di viaggi. Ricevi un itinerario completo in formato JSON e una richiesta di modifica dall'utente.

Applica le modifiche richieste e restituisci l'itinerario COMPLETO aggiornato in formato JSON.

REGOLE CRITICHE:
- Mantieni TUTTI i campi e le strutture esistenti che non riguardano la modifica richiesta
- Applica SOLO le modifiche specificamente richieste dall'utente
- Scrivi tutto in italiano (nomi attività, descrizioni, tips)
- Il campo meta.id deve rimanere INVARIATO
- Non alterare voli, hotel, map, markets, oyster, bookingChecklist, tickets a meno che non sia esplicitamente richiesto
- Rispondi SOLO con il JSON dentro un blocco \`\`\`json ... \`\`\`, senza nessun testo prima o dopo`;

export async function refineTrip(params: {
  trip: Trip;
  instructions: string;
  apiKey: string;
}): Promise<Trip> {
  const userPrompt = `Itinerario attuale:\n\`\`\`json\n${JSON.stringify(params.trip)}\n\`\`\`\n\nModifiche richieste:\n${params.instructions}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${params.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: REFINE_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 32768, temperature: 0.5 },
    }),
  });

  if (response.status === 403) throw new Error('API key non valida.');
  if (response.status === 429) throw new Error('Troppe richieste ravvicinate. Aspetta 60 secondi e riprova.');
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Errore API (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allParts: any[] = data.candidates?.[0]?.content?.parts ?? [];
  const textParts = allParts.filter(p => !p.thought && typeof p.text === 'string');
  const text: string = textParts.find((p: { text: string }) => p.text.includes('```'))?.text
    ?? textParts[0]?.text ?? '';

  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error('Risposta non valida: JSON non trovato. Riprova.');

  let refined: Trip;
  try {
    refined = JSON.parse(jsonStr) as Trip;
  } catch {
    try {
      refined = JSON.parse(repairTruncatedJson(jsonStr)) as Trip;
    } catch (e) {
      throw new Error(`JSON non riparabile. Parser: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Garantisci che l'id non sia cambiato
  return { ...refined, meta: { ...refined.meta, id: params.trip.meta.id } };
}

export async function generateTrip(params: TripGenParams): Promise<Trip> {
  const nDays = daysBetween(params.startDate, params.endDate);

  let childrenStr = '';
  if (params.children.length > 0) {
    const n = params.children.length;
    childrenStr = `, ${n} bambin${n > 1 ? 'i' : 'o'} (${params.children.join(', ')})`;
  }

  const logistics: string[] = [];
  if (params.arrivalAirport || params.arrivalTime)
    logistics.push(`Volo andata: arrivo a ${params.arrivalAirport || 'destinazione'} alle ${params.arrivalTime || '?'}`);
  if (params.hotel)
    logistics.push(`Alloggio: ${params.hotel}`);
  if (params.departureAirport || params.departureTime)
    logistics.push(`Volo ritorno: partenza da ${params.departureAirport || 'aeroporto'} alle ${params.departureTime || '?'}`);

  const userPrompt = `Crea un itinerario completo per:
- Destinazione: ${params.destination}
- Dal ${params.startDate} al ${params.endDate} (${nDays} giorn${nDays === 1 ? 'o' : 'i'})
- Viaggiatori: ${params.adults} adult${params.adults === 1 ? 'o' : 'i'}${childrenStr}
- Tipo di viaggio: ${params.tripType}
- Interessi e attività desiderate: ${params.interests || 'nessuna preferenza specifica'}
${logistics.length > 0 ? logistics.map(l => `- ${l}`).join('\n') : ''}
${params.notes ? `- Note aggiuntive: ${params.notes}` : ''}

Genera tutti i ${nDays} giorn${nDays === 1 ? 'o' : 'i'}.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${params.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 32768, temperature: 0.7 },
    }),
  });

  if (response.status === 403) {
    throw new Error('API key non valida. Verifica la chiave su aistudio.google.com e riprova.');
  }
  if (response.status === 429) {
    throw new Error('Troppe richieste ravvicinate. Aspetta 60 secondi e riprova.');
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Errore API (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allParts: any[] = data.candidates?.[0]?.content?.parts ?? [];
  // Salta le parti di thinking (thought: true) — presenti nei modelli Gemini 2.5+
  const textParts = allParts.filter(p => !p.thought && typeof p.text === 'string');
  const text: string = textParts.find((p: { text: string }) => p.text.includes('```'))?.text
    ?? textParts[0]?.text
    ?? '';

  const jsonStr = extractJson(text);
  if (!jsonStr) {
    throw new Error('Risposta non valida: JSON non trovato. Riprova.');
  }

  let generated: Trip;
  try {
    generated = JSON.parse(jsonStr) as Trip;
  } catch {
    try {
      generated = JSON.parse(repairTruncatedJson(jsonStr)) as Trip;
    } catch (e) {
      const tail = jsonStr.slice(-80);
      throw new Error(`JSON non riparabile. Fine: ...${tail}\nParser: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Merge con createEmpty per garantire tutti i campi obbligatori
  const id = `trip-${Date.now()}`;
  const base = tripRepository.createEmpty(id);
  const trip: Trip = {
    ...base,
    ...generated,
    meta: { ...base.meta, ...generated.meta, id },
    hotel: generated.hotel ?? base.hotel,
    flights: base.flights,
    map: base.map,
    markets: base.markets,
    oyster: base.oyster,
    bookingChecklist: base.bookingChecklist,
    tickets: base.tickets,
    practicalInfo: generated.practicalInfo ?? base.practicalInfo,
    days: generated.days ?? [],
  };

  return trip;
}
