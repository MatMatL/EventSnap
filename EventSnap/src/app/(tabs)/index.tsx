import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MapHeader } from '@/components/map/MapHeader';
import { MapSearchBar } from '@/components/map/MapSearchBar';
import { EventMap } from '@/components/map/EventMap';
import { NearbyEventsSheet } from '@/components/map/NearbyEventsSheet';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAccessibleEvents } from '@/hooks/useAccessibleEvents';
import { enrichWithDistance, filterEvents } from '@/lib/geo';

const COLORS = {
  bgGradientStart: '#E5F0ED',
  bgGradientEnd: '#F5F3EB',
  teal: '#335C58',
  tealLight: '#2BA8A2',
  yellow: '#FFD23F',
  coral: '#EF6C4A',
  white: '#FFFFFF',
  border: '#E8E5DC',
  inputBg: '#F4F2EB',
  muted: '#888888',
  dark: '#1A1A1A',
};

export default function MapScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const {
    coords,
    loading: locationLoading,
    error: locationError,
    permissionDenied,
    retry: retryLocation,
  } = useUserLocation();

  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useAccessibleEvents();

  const isLoading = locationLoading || eventsLoading;
  const fetchError = eventsError;

  const eventsWithDistance = useMemo(
    () => enrichWithDistance(events, coords),
    [events, coords],
  );

  const filteredEvents = useMemo(
    () => filterEvents(eventsWithDistance, searchQuery),
    [eventsWithDistance, searchQuery],
  );

  const handleRetry = () => {
    retryLocation();
    refetchEvents();
  };

  return (
    <View style={styles.container}>
      {/* Container du haut gérant la hauteur de l'encoche / caméra */}
      <View style={styles.safeTop}>
        <MapHeader />
        <MapSearchBar value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' && (
          <EventMap
            userCoords={coords}
            events={filteredEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />
        )}

        {Platform.OS === 'web' && !isLoading && !fetchError && (
          <View style={styles.webFallback}>
            <Text style={styles.webFallbackText}>
              La carte est disponible sur iOS et Android via Expo Go.
            </Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator size="large" color={COLORS.teal} />
            <Text style={styles.overlayText}>Chargement de la carte…</Text>
          </View>
        )}

        {!isLoading && fetchError && (
          <View style={styles.overlay}>
            <Text style={styles.errorTitle}>Impossible de charger les sorties</Text>
            <Text style={styles.errorMessage}>{fetchError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {permissionDenied && !locationLoading && (
          <View style={styles.permissionBanner}>
            <Text style={styles.permissionText}>
              {locationError ?? 'Localisation désactivée — position par défaut affichée.'}
            </Text>
            <TouchableOpacity onPress={retryLocation}>
              <Text style={styles.permissionAction}>Autoriser</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !fetchError && (
          <View style={styles.sheetOverlay}>
            <NearbyEventsSheet
              events={filteredEvents}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5F0ED', // Couleur de départ du fond global
  },
  safeTop: {
    backgroundColor: '#E5F0ED',
    zIndex: 2,
    // Même règle de hauteur millimétrée que pour events et create :
    paddingTop: Platform.OS === 'ios' ? 12 : 36, 
    paddingBottom: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(245, 243, 235, 0.92)', // Correspond à ton fond crème de DA
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 2,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.teal,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.teal,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.teal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  permissionBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 240,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF0EC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFCDC0',
    zIndex: 3,
  },
  permissionText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.coral,
    lineHeight: 16,
    fontWeight: '500',
  },
  permissionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.teal,
  },
  sheetOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#E5F0ED',
  },
  webFallbackText: {
    fontSize: 15,
    color: COLORS.teal,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});