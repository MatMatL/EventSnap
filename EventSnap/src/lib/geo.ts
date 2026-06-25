import type { Coordinates, Event, EventWithDistance } from '@/types/event';

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(
  from: Coordinates,
  to: Coordinates,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} M`;
  }
  return `${km.toFixed(1)} KM`;
}

export function enrichWithDistance(
  events: Event[],
  userCoords: Coordinates,
): EventWithDistance[] {
  return events
    .map((event) => ({
      ...event,
      distanceKm: haversineDistance(userCoords, {
        latitude: event.latitude,
        longitude: event.longitude,
      }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function filterEvents(
  events: EventWithDistance[],
  query: string,
): EventWithDistance[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return events;

  return events.filter(
    (event) =>
      event.name.toLowerCase().includes(normalized) ||
      event.location_label?.toLowerCase().includes(normalized),
  );
}
