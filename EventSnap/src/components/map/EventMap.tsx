import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { Coordinates, EventWithDistance } from '@/types/event';
import { Colors } from '@/constants/Colors';

type EventMapProps = {
  userCoords: Coordinates;
  events: EventWithDistance[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

type MapLayout = {
  width: number;
  height: number;
};

type MapDebugState = {
  layout: MapLayout | null;
  mapReady: boolean;
  mapLoaded: boolean;
  provider: string;
  runtime: string;
  apiKeyConfigured: boolean;
  hint: string;
};

const DELTA = 0.08;

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
  Constants.appOwnership === 'expo';

function getRuntimeLabel(): string {
  switch (Constants.executionEnvironment) {
    case ExecutionEnvironment.StoreClient:
      return isExpoGo ? 'Expo Go' : 'Dev client';
    case ExecutionEnvironment.Standalone:
      return 'Build standalone';
    case ExecutionEnvironment.Bare:
      return 'Bare workflow';
    default:
      return String(Constants.executionEnvironment ?? 'inconnu');
  }
}

function getSetupHint(): string {
  if (Platform.OS === 'web') {
    return 'Carte non supportée sur web.';
  }
  if (isExpoGo) {
    return 'Expo Go : la clé .env est ignorée. Écran noir = layout ou Expo Go obsolète.';
  }
  if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return 'Clé API absente — ajoutez EXPO_PUBLIC_GOOGLE_MAPS_API_KEY au .env.';
  }
  return 'Build natif : npx expo prebuild --clean puis npx expo run:android.';
}

function MapDebugPanel({ debug }: { debug: MapDebugState }) {
  if (!__DEV__) return null;

  return (
    <View style={styles.debugPanel} pointerEvents="none">
      <Text style={styles.debugTitle}>DEBUG CARTE</Text>
      <Text style={styles.debugLine}>Runtime : {debug.runtime}</Text>
      <Text style={styles.debugLine}>Provider : {debug.provider}</Text>
      <Text style={styles.debugLine}>
        Layout : {debug.layout ? `${Math.round(debug.layout.width)}×${Math.round(debug.layout.height)}` : '—'}
      </Text>
      <Text style={styles.debugLine}>Map ready : {debug.mapReady ? 'oui' : 'non'}</Text>
      <Text style={styles.debugLine}>Tiles loaded : {debug.mapLoaded ? 'oui' : 'non'}</Text>
      <Text style={styles.debugLine}>
        Clé API (.env) : {debug.apiKeyConfigured ? 'présente' : 'absente'}
      </Text>
      <Text style={styles.debugHint}>{debug.hint}</Text>
    </View>
  );
}

export function EventMap({
  userCoords,
  events,
  selectedEventId,
  onSelectEvent,
}: EventMapProps) {
  const mapRef = useRef<MapView>(null);
  const [layout, setLayout] = useState<MapLayout | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

  const initialRegion: Region = {
    latitude: userCoords.latitude,
    longitude: userCoords.longitude,
    latitudeDelta: DELTA,
    longitudeDelta: DELTA,
  };

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    mapRef.current.animateToRegion(
      {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: DELTA,
        longitudeDelta: DELTA,
      },
      600,
    );
  }, [userCoords.latitude, userCoords.longitude, mapReady]);

  if (Platform.OS === 'web') {
    return null;
  }

  const debug: MapDebugState = {
    layout,
    mapReady,
    mapLoaded,
    provider: Platform.OS === 'android' ? 'Google (Android)' : 'Apple Maps (iOS)',
    runtime: getRuntimeLabel(),
    apiKeyConfigured: Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
    hint: getSetupHint(),
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setLayout({ width, height });
        }
      }}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={provider}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        loadingEnabled
        onMapReady={() => {
          setMapReady(true);
          if (__DEV__) {
            console.log('[EventMap] onMapReady', { layout, runtime: debug.runtime });
          }
        }}
        onMapLoaded={() => {
          setMapLoaded(true);
          if (__DEV__) {
            console.log('[EventMap] onMapLoaded — tuiles chargées');
          }
        }}
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

      {!mapLoaded && (
        <View style={styles.loadingHint} pointerEvents="none">
          <Text style={styles.loadingHintText}>
            {mapReady ? 'Chargement des tuiles…' : 'Initialisation de la carte…'}
          </Text>
        </View>
      )}

      <MapDebugPanel debug={debug} />
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
  loadingHint: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 5,
  },
  loadingHintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  debugPanel: {
    position: 'absolute',
    top: 48,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    borderRadius: 10,
    padding: 10,
    zIndex: 10,
    gap: 2,
  },
  debugTitle: {
    color: '#FFD23F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  debugLine: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  debugHint: {
    color: '#A0E8E3',
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
});
