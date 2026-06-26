import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { Coordinates, EventWithDistance } from '@/types/event';
import { Colors } from '@/constants/Colors';
import { EventWebMap } from './EventWebMap';

type EventMapProps = {
  userCoords: Coordinates;
  events: EventWithDistance[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

const DELTA = 0.08;

/**
 * Android + Expo Go : Google Maps natif ne charge plus les tuiles (SDK 55+).
 * On utilise OpenStreetMap via WebView — compatible Expo Go, sans build natif.
 * iOS : Apple Maps natif via react-native-maps (fonctionne dans Expo Go).
 */
export function EventMap(props: EventMapProps) {
  if (Platform.OS === 'web') {
    return null;
  }

  if (Platform.OS === 'android') {
    return <EventWebMap {...props} />;
  }

  return <EventNativeMap {...props} />;
}

function EventNativeMap({
  userCoords,
  events,
  selectedEventId,
  onSelectEvent,
}: EventMapProps) {
  const mapRef = useRef<MapView>(null);

  const initialRegion: Region = {
    latitude: userCoords.latitude,
    longitude: userCoords.longitude,
    latitudeDelta: DELTA,
    longitudeDelta: DELTA,
  };

  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: DELTA,
        longitudeDelta: DELTA,
      },
      600,
    );
  }, [userCoords.latitude, userCoords.longitude]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {events.map((event) => {
          const isSelected = event.id === selectedEventId;

          return (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              title={event.name}
              description={event.location_label ?? undefined}
              pinColor={isSelected ? Colors.coral : Colors.primary}
              onPress={() => onSelectEvent(event.id)}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
