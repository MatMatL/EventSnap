import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapHeader } from '@/components/map/MapHeader';
import { MapSearchBar } from '@/components/map/MapSearchBar';
import { EventMap } from '@/components/map/EventMap';
import { NearbyEventsSheet } from '@/components/map/NearbyEventsSheet';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAccessibleEvents } from '@/hooks/useAccessibleEvents';
import { enrichWithDistance, filterEvents } from '@/lib/geo';
import { Colors } from '@/constants/Colors';

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
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <MapHeader />
        <MapSearchBar value={searchQuery} onChangeText={setSearchQuery} />
      </SafeAreaView>

      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' && !isLoading && !fetchError && (
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
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
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
      </View>

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
        <NearbyEventsSheet
          events={filteredEvents}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.background,
    zIndex: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 248, 231, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 15,
    color: '#335C58',
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#335C58',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#8A9A98',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF3E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD9C2',
  },
  permissionText: {
    flex: 1,
    fontSize: 12,
    color: '#8A5A3C',
    lineHeight: 16,
  },
  permissionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.coral,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#E8F6F5',
  },
  webFallbackText: {
    fontSize: 15,
    color: '#335C58',
    textAlign: 'center',
    lineHeight: 22,
  },
});
