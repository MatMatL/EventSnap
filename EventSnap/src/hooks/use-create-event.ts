import { useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export type TtlOption = {
  label: string;
  hours: number;
};

export const TTL_OPTIONS: TtlOption[] = [
  { label: '24 heures', hours: 24 },
  { label: '48 heures', hours: 48 },
  { label: '7 jours', hours: 168 },
];

export type CreateEventForm = {
  name: string;
  description: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  eventDate: Date;
  ttlHours: number;
};

const DEFAULT_FORM: CreateEventForm = {
  name: '',
  description: '',
  locationLabel: '',
  latitude: null,
  longitude: null,
  eventDate: new Date(Date.now() + 60 * 60 * 1000),
  ttlHours: 24,
};

export function useCreateEvent() {
  const [form, setForm] = useState<CreateEventForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CreateEventForm>(key: K, value: CreateEventForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function detectLocation() {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission de localisation refusée. Veuillez activer la géolocalisation dans les paramètres.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const label = place
        ? [place.name, place.street, place.city, place.country].filter(Boolean).join(', ')
        : `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;

      setForm((prev) => ({
        ...prev,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        locationLabel: label,
      }));
    } catch {
      setError('Impossible de récupérer la position. Réessayez.');
    } finally {
      setLocating(false);
    }
  }

  async function submit(): Promise<string | null> {
    setError(null);

    if (!form.name.trim()) {
      setError('Le nom de l\'événement est obligatoire.');
      return null;
    }
    if (form.latitude === null || form.longitude === null) {
      setError('Veuillez détecter votre position avant de continuer.');
      return null;
    }

    const expiresAt = new Date(form.eventDate.getTime() + form.ttlHours * 60 * 60 * 1000);

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Vous devez être connecté pour créer un événement.');
        return null;
      }

      const { data, error: insertError } = await supabase
        .from('events')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          latitude: form.latitude,
          longitude: form.longitude,
          location_label: form.locationLabel.trim() || null,
          event_date: form.eventDate.toISOString(),
          expires_at: expiresAt.toISOString(),
          host_id: user.id,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      setForm(DEFAULT_FORM);
      return data.id as string;
    } catch {
      setError('Une erreur inattendue est survenue.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { form, updateField, detectLocation, submit, loading, locating, error };
}
