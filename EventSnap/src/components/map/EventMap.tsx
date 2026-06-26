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
  tilesTimedOut: boolean;
  provider: string;
  runtime: string;
  apiKeyConfigured: boolean;
  hint: string;
};

const DELTA = 0.08;
const TILES_TIMEOUT_MS = 8000;

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

function getSetupHint(tilesTimedOut: boolean): string {
  if (Platform.OS === 'web') {
    return 'Carte non supportée sur web.';
  }
  if (isExpoGo && Platform.OS === 'android') {
    if (tilesTimedOut) {
      return 'Expo Go Android ne charge plus les tuiles Google (SDK 55+). Lancez : npx expo run:android';
    }
    return 'Expo Go Android : ta clé .env est ignorée. Si tuiles bloquées → build natif requis.';
  }
  if (isExpoGo) {
    return 'Expo Go iOS : Apple Maps devrait fonctionner sans clé.';
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
      {debug.tilesTimedOut && (
        <Text style={styles.debugWarning}>Timeout tuiles ({TILES_TIMEOUT_MS / 1000}s)</Text>
      )}
      <Text style={styles.debugLine}>
        Clé API (.env) : {debug.apiKeyConfigured ? 'présente' : 'absente'}
      </Text>
      <Text style={styles.debugHint}>{debug.hint}</Text>
    </View>
  );
}

function MapTilesErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerTitle}>Carte indisponible dans Expo Go</Text>
      <Text style={styles.errorBannerText}>{message}</Text>
      <Text style={styles.errorBannerCmd}>npx expo run:android</Text>
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
  const [tilesTimedOut, setTilesTimedOut] = useState(false);

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

  useEffect(() => {
    if (mapLoaded) return;

    const timer = setTimeout(() => {
      if (!mapLoaded) {
        setTilesTimedOut(true);
        if (__DEV__) {
          console.warn(
            '[EventMap] Timeout tuiles —',
            isExpoGo && Platform.OS === 'android'
              ? 'Expo Go Android ne supporte plus Google Maps. Utilisez npx expo run:android'
              : 'Vérifiez la clé API Google et Maps SDK for Android',
          );
        }
      }
    }, TILES_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [mapLoaded, mapReady]);

  if (Platform.OS === 'web') {
    return null;
  }

  const debug: MapDebugState = {
    layout,
    mapReady,
    mapLoaded,
    tilesTimedOut,
    provider: Platform.OS === 'android' ? 'Google (Android)' : 'Apple Maps (iOS)',
    runtime: getRuntimeLabel(),
    apiKeyConfigured: Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
    hint: getSetupHint(tilesTimedOut),
  };

  const showExpoGoAndroidError =
    tilesTimedOut && isExpoGo && Platform.OS === 'android' && mapReady && !mapLoaded;

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
            console.log('[EventMap] onMapReady', { runtime: getRuntimeLabel() });
          }
        }}
        onMapLoaded={() => {
          setMapLoaded(true);
          setTilesTimedOut(false);
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

      {!mapLoaded && !showExpoGoAndroidError && (
        <View style={styles.loadingHint} pointerEvents="none">
          <Text style={styles.loadingHintText}>
            {mapReady ? 'Chargement des tuiles…' : 'Initialisation de la carte…'}
          </Text>
        </View>
      )}

      {showExpoGoAndroidError && (
        <MapTilesErrorBanner message="Depuis Expo SDK 55, Google Maps ne charge plus les tuiles dans Expo Go sur Android. Ta clé API ne peut être utilisée qu'avec un build natif (dev client)." />
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
  errorBanner: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 248, 231, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 6,
    gap: 10,
  },
  errorBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#335C58',
    textAlign: 'center',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBannerCmd: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.coral,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
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
  debugWarning: {
    color: '#FF8A65',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  debugHint: {
    color: '#A0E8E3',
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
});
