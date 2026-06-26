import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Coordinates, EventWithDistance } from '@/types/event';

type EventWebMapProps = {
  userCoords: Coordinates;
  events: EventWithDistance[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

function escapeJs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
}

function buildMapHtml(
  userCoords: Coordinates,
  events: EventWithDistance[],
  selectedEventId: string | null,
): string {
  const markers = events
    .map((event) => {
      const selected = event.id === selectedEventId;
      return `
        L.marker([${event.latitude}, ${event.longitude}], {
          title: '${escapeJs(event.name)}',
        })
          .addTo(map)
          .bindPopup('<b>${escapeJs(event.name)}</b>')
          .on('click', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id: '${event.id}' }));
          });
        ${selected ? `map.setView([${event.latitude}, ${event.longitude}], 14);` : ''}
      `;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const map = L.map('map', { zoomControl: true }).setView(
        [${userCoords.latitude}, ${userCoords.longitude}],
        13
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      L.circleMarker([${userCoords.latitude}, ${userCoords.longitude}], {
        radius: 8,
        color: '#335C58',
        fillColor: '#2BA8A2',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map).bindPopup('Vous');
      ${markers}
    </script>
  </body>
</html>
  `.trim();
}

export function EventWebMap({
  userCoords,
  events,
  selectedEventId,
  onSelectEvent,
}: EventWebMapProps) {
  const html = useMemo(
    () => buildMapHtml(userCoords, events, selectedEventId),
    [userCoords, events, selectedEventId],
  );

  return (
    <WebView
      style={styles.map}
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'select' && data.id) {
            onSelectEvent(data.id);
          }
        } catch {
          // ignore malformed messages
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
  },
});
