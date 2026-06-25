import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { Coordinates, EventWithDistance } from '@/types/event';
import { Colors } from '@/constants/Colors';

type EventMapProps = {
  userCoords: Coordinates;
  events: EventWithDistance[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

const DELTA = 0.08;

export function EventMap({
  userCoords,
  events,
  selectedEventId,
  onSelectEvent,
}: EventMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const region: Region = {
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
      latitudeDelta: DELTA,
      longitudeDelta: DELTA,
    };

    mapRef.current.animateToRegion(region, 600);
  }, [userCoords.latitude, userCoords.longitude]);

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={{
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: DELTA,
        longitudeDelta: DELTA,
      }}
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
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFill,
  },
});
