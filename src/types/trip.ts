// ─── Valute ───────────────────────────────────────────────────────────────────

export interface CurrencyInfo {
  code: string;   // "GBP"
  flag: string;   // "🇬🇧"
  label: string;  // "Sterline"
}

export interface Currency {
  local: CurrencyInfo;
  home: CurrencyInfo;
  fallbackRate: number;
  quickAmounts: number[];
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export interface TripTheme {
  primary: string; // hex
  accent: string;
  gold: string;
}

export interface Travelers {
  adults: number;
  children: number[]; // età
}

export interface TripMeta {
  id: string;
  name: string;
  subtitle: string;
  destination: string;
  country: string;
  flag: string;
  startDate: string; // "2026-07-29"
  endDate: string;
  travelers: Travelers;
  theme: TripTheme;
  currency: Currency;
  language: string;
  cities?: string[];
}

// ─── Hotel ────────────────────────────────────────────────────────────────────

export interface Landmark {
  name: string;
  distanceMin: number;
}

export interface Hotel {
  name: string;
  address: string;
  zone: string;
  landmarks: Landmark[];
}

// ─── Voli ─────────────────────────────────────────────────────────────────────

export type BadgeStyle = 'blue' | 'gold' | 'red' | 'muted';

export interface FlightChecklistItem {
  badge: string;
  badgeStyle: BadgeStyle;
  text: string;
}

export interface FlightEndpoint {
  iata: string;
  terminal: string;
  time: string;
}

export interface FlightLeg {
  flightNumber: string;
  airline: string;
  date: string;
  from: FlightEndpoint;
  to: FlightEndpoint;
  duration: string;
  trackingUrl: string;
  checklist: FlightChecklistItem[];
  checklistTitle: string;
  note?: string;
}

export interface Flights {
  outbound: FlightLeg;
  return: FlightLeg;
}

// ─── Mappa ────────────────────────────────────────────────────────────────────

export interface TripMap {
  googleMyMapsId: string;
  metroMapUrl: string;
}

// ─── Info pratiche ────────────────────────────────────────────────────────────

export interface PracticalInfoItem {
  label: string;
  value: string;
  sub: string;
}

export interface PracticalInfo {
  items: PracticalInfoItem[];
}

// ─── Supermercati ─────────────────────────────────────────────────────────────

export type TagStyle = 'red' | 'blue' | 'muted';

export interface Market {
  name: string;
  logoLetter: string;
  logoColor: string;
  address: string;
  tag: string;
  tagStyle: TagStyle;
  description: string;
  hours: string;
  osmEmbedUrl: string;
  mapsDirectionsUrl: string;
}

// ─── Oyster / Trasporti locali ────────────────────────────────────────────────

export interface Oyster {
  body: string[];
  points: string[];
  tip: string;
}

// ─── Checklist prenotazioni ───────────────────────────────────────────────────

export interface BookingChecklistItem {
  name: string;
  done: boolean;
  url: string | null;
  note: string;
}

// ─── Giorni & Eventi ──────────────────────────────────────────────────────────

export type EventType = 'visit' | 'booked' | 'meal' | 'logistics';

export interface TripEvent {
  time: string;
  timeTo?: string;
  name: string;
  type: EventType;
  description: string;
  tip?: string;
  alert?: string;
  placeGuide?: string;
  placeLat?: number;
  placeLon?: number;
  showBookingBadge?: boolean;
  isOptional?: boolean;
  isBooked?: boolean;      // true = visita/pasto con prenotazione
  ticketPath?: string;     // path relativo PDF, es. "tickets/event-xyz.pdf"
}

export type BadgeColor = 'default' | 'red' | 'blue' | 'gold';

export interface DayBadge {
  text: string;
  color: BadgeColor;
}

export interface TransportSummary {
  label: string;
  detail: string;
}

export type DayStyle = 'default' | 'special' | 'gold' | 'last';

export interface TripDay {
  n: number;
  date: string;       // "2026-07-29"
  dateLabel: string;  // "29 LUG"
  title: string;
  subtitle: string;
  style: DayStyle;
  zone: string;
  transportSummary: TransportSummary[];
  badges: DayBadge[];
  events: TripEvent[];
  notesTitle?: string;
  notes?: string[];
  dayDescription?: string;
  transportTip?: string;
}

// ─── Biglietti ────────────────────────────────────────────────────────────────

export interface Ticket {
  name: string;
  dayN: number;
  dayLabel: string;
  pdfPath: string; // relativo alla cartella del viaggio, es. "tickets/nome.pdf"
  isVip: boolean;
}

// ─── Trip (radice) ────────────────────────────────────────────────────────────

export interface Trip {
  meta: TripMeta;
  hotel: Hotel;
  flights: Flights;
  map: TripMap;
  practicalInfo: PracticalInfo;
  markets: Market[];
  oyster: Oyster;
  bookingChecklist: BookingChecklistItem[];
  days: TripDay[];
  tickets: Ticket[];
  budget?: { estimate: string; note: string }; // campo opzionale legacy
}

// ─── Indice viaggi (lista home) ───────────────────────────────────────────────

export interface TripSummary {
  id: string;
  name: string;
  subtitle: string;
  destination: string;
  country: string;
  flag: string;
  startDate: string;
  endDate: string;
  theme: TripTheme;
  cities: string[];
}
