export type Event = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  location_label: string | null;
  event_date: string;
  expires_at: string;
  host_id: string;
};

export type EventWithDistance = Event & {
  distanceKm: number;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const DEFAULT_COORDINATES: Coordinates = {
  latitude: 48.8566,
  longitude: 2.3522,
};
