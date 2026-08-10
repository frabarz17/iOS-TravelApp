import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Trip, TripSummary } from '../types/trip';

const TRIPS_DIR = `${Paths.document.uri}trips/`;

class TripRepository {
  // ─── Init ──────────────────────────────────────────────────────────────────

  private async ensureTripsDir(): Promise<void> {
    const info = await FileSystem.getInfoAsync(TRIPS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(TRIPS_DIR, { intermediates: true });
    }
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  async getAllTrips(): Promise<Trip[]> {
    await this.ensureTripsDir();
    const entries = await FileSystem.readDirectoryAsync(TRIPS_DIR);
    const trips: Trip[] = [];

    for (const entry of entries) {
      const tripPath = `${TRIPS_DIR}${entry}/trip.json`;
      const info = await FileSystem.getInfoAsync(tripPath);
      if (!info.exists) continue;
      try {
        const raw = await FileSystem.readAsStringAsync(tripPath);
        trips.push(JSON.parse(raw));
      } catch {
        // file corrotto — saltiamo
      }
    }

    return trips.sort((a, b) => a.meta.startDate.localeCompare(b.meta.startDate));
  }

  async getAllTripSummaries(): Promise<TripSummary[]> {
    const trips = await this.getAllTrips();
    return trips.map(({ meta }) => ({
      id: meta.id,
      name: meta.name,
      subtitle: meta.subtitle,
      destination: meta.destination,
      country: meta.country,
      flag: meta.flag,
      startDate: meta.startDate,
      endDate: meta.endDate,
      theme: meta.theme,
      cities: meta.cities ?? [],
    }));
  }

  async getTrip(id: string): Promise<Trip | null> {
    const path = `${TRIPS_DIR}${id}/trip.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw);
  }

  // ─── Write ─────────────────────────────────────────────────────────────────

  async saveTrip(trip: Trip): Promise<void> {
    const dir = `${TRIPS_DIR}${trip.meta.id}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.writeAsStringAsync(
      `${dir}trip.json`,
      JSON.stringify(trip, null, 2)
    );
  }

  async deleteTrip(id: string): Promise<void> {
    const dir = `${TRIPS_DIR}${id}/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    }
  }

  // ─── Export / Import (Scenario 3 — collaborazione) ─────────────────────────

  async exportTrip(trip: Trip): Promise<void> {
    const tempPath = `${Paths.cache.uri}${trip.meta.id}.json`;
    await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(trip, null, 2));
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(tempPath, {
        mimeType: 'application/json',
        dialogTitle: `Esporta: ${trip.meta.name}`,
      });
    }
  }

  async importTrip(): Promise<Trip | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const trip: Trip = JSON.parse(raw);
    await this.saveTrip(trip);
    return trip;
  }

  // ─── Cover photo ───────────────────────────────────────────────────────────

  getCoverPhotoUri(tripId: string): string {
    return `${TRIPS_DIR}${tripId}/cover.jpg`;
  }

  async saveCoverPhoto(tripId: string, sourceUri: string): Promise<void> {
    const dir = `${TRIPS_DIR}${tripId}/`;
    const destUri = `${dir}cover.jpg`;
    if (sourceUri === destUri) return;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  }

  // ─── Day cover photo ───────────────────────────────────────────────────────

  getDayCoverPhotoUri(tripId: string, dayN: number): string {
    return `${TRIPS_DIR}${tripId}/day-covers/day-${dayN}.jpg`;
  }

  async saveDayCoverPhoto(tripId: string, dayN: number, sourceUri: string): Promise<void> {
    const dir = `${TRIPS_DIR}${tripId}/day-covers/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.copyAsync({ from: sourceUri, to: `${dir}day-${dayN}.jpg` });
  }

  // ─── Ticket PDF ────────────────────────────────────────────────────────────

  async saveTicketPdf(tripId: string, filename: string, base64: string): Promise<string> {
    const dir = `${TRIPS_DIR}${tripId}/tickets/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const path = `${dir}${filename}`;
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `tickets/${filename}`;
  }

  getTicketUri(tripId: string, pdfPath: string): string {
    return `${TRIPS_DIR}${tripId}/${pdfPath}`;
  }

  // ─── Nuovo viaggio vuoto ───────────────────────────────────────────────────

  createEmpty(id: string): Trip {
    const emptyLeg = () => ({
      flightNumber: '',
      airline: '',
      date: '',
      from: { iata: '', terminal: '', time: '' },
      to: { iata: '', terminal: '', time: '' },
      duration: '',
      trackingUrl: '',
      checklist: [],
      checklistTitle: '',
    });

    return {
      meta: {
        id,
        name: 'Nuovo Viaggio',
        subtitle: 'Il Nostro Viaggio',
        destination: '',
        country: '',
        flag: '✈️',
        startDate: '',
        endDate: '',
        travelers: { adults: 2, children: [] },
        theme: { primary: '#007AFF', accent: '#FF3B30', gold: '#FF9500' },
        currency: {
          local: { code: 'EUR', flag: '🇪🇺', label: 'Euro' },
          home: { code: 'EUR', flag: '🇪🇺', label: 'Euro' },
          fallbackRate: 1,
          quickAmounts: [5, 10, 20, 50],
        },
        language: 'it',
      },
      hotel: { name: '', address: '', zone: '', landmarks: [] },
      flights: { outbound: emptyLeg(), return: emptyLeg() },
      map: { googleMyMapsId: '', metroMapUrl: '' },
      practicalInfo: { items: [] },
      markets: [],
      oyster: { body: [], points: [], tip: '' },
      bookingChecklist: [],
      days: [],
      tickets: [],
    };
  }
}

// Singleton — la UI usa sempre questa istanza
export const tripRepository = new TripRepository();
