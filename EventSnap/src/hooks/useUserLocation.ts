import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_COORDINATES, type Coordinates } from '@/types/event';

type UseUserLocationResult = {
  coords: Coordinates;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  retry: () => void;
};

export function useUserLocation(): UseUserLocationResult {
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermissionDenied(true);
        setCoords(DEFAULT_COORDINATES);
        setError('Autorisez la localisation pour voir les sorties à proximité.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setError('Impossible d\'obtenir votre position.');
      setCoords(DEFAULT_COORDINATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { coords, loading, error, permissionDenied, retry };
}
