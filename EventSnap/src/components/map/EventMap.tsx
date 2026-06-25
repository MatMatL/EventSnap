import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
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
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !layoutReady) return;

    const region: Region = {
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
      latitudeDelta: DELTA,
      longitudeDelta: DELTA,
    };

    mapRef.current.animateToRegion(region, 600);
  }, [userCoords.latitude, userCoords.longitude, layoutReady]);

  if (Platform.OS === 'web') {
    return null;
  }

  const initialRegion: Region = {
    latitude: userCoords.latitude,
    longitude: userCoords.longitude,
    latitudeDelta: DELTA,
    longitudeDelta: DELTA,
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayoutReady(width > 0 && height > 0);
      }}
    >
      {layoutReady && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          loadingEnabled
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  map: {
    flex: 1,
    width: '100%',
  },
});
