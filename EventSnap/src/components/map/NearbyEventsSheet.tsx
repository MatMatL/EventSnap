import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { EventWithDistance } from '@/types/event';
import { formatDistance } from '@/lib/geo';
import { Colors } from '@/constants/Colors';

type NearbyEventsSheetProps = {
  events: EventWithDistance[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

function formatEventDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NearbyEventsSheet({
  events,
  selectedEventId,
  onSelectEvent,
}: NearbyEventsSheetProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const highlighted =
    events.find((e) => e.id === selectedEventId) ?? events[0] ?? null;

  const handleOpenEvent = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  if (events.length === 0) {
    return (
      <View style={styles.sheet}>
        <Text style={styles.title}>Nearby Events</Text>
        <Text style={styles.emptyText}>
          Aucune sortie accessible pour le moment.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.sheet, expanded && styles.sheetExpanded]}>
      <View style={styles.sheetHeader}>
        <View>
          <Text style={styles.title}>Nearby Events</Text>
          {highlighted && (
            <Text style={styles.subtitle}>
              {(highlighted.location_label ?? highlighted.name).toUpperCase()} —{' '}
              {formatDistance(highlighted.distanceKm)} AWAY
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
          <Text style={styles.viewAll}>
            {expanded ? 'Réduire' : 'View All'}
          </Text>
        </TouchableOpacity>
      </View>

      {!expanded && highlighted && (
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={() => handleOpenEvent(highlighted.id)}
          activeOpacity={0.85}
        >
          <View style={styles.featuredIcon}>
            <Ionicons name="location" size={20} color={Colors.primary} />
          </View>
          <View style={styles.featuredContent}>
            <Text style={styles.eventName}>{highlighted.name}</Text>
            <Text style={styles.eventMeta}>
              {formatEventDate(highlighted.event_date)} ·{' '}
              {formatDistance(highlighted.distanceKm)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8A9A98" />
        </TouchableOpacity>
      )}

      {expanded && (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {events.map((event) => {
            const isSelected = event.id === selectedEventId;

            return (
              <TouchableOpacity
                key={event.id}
                style={[styles.listItem, isSelected && styles.listItemSelected]}
                onPress={() => {
                  onSelectEvent(event.id);
                  handleOpenEvent(event.id);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.featuredIcon}>
                  <Ionicons name="calendar" size={18} color={Colors.primary} />
                </View>
                <View style={styles.featuredContent}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventMeta}>
                    {event.location_label ?? 'Lieu non renseigné'} ·{' '}
                    {formatDistance(event.distanceKm)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#E8E5DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 220,
  },
  sheetExpanded: {
    maxHeight: 360,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#335C58',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#8A9A98',
    letterSpacing: 0.5,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FBFA',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8F6F5',
  },
  featuredIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F6F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredContent: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#335C58',
  },
  eventMeta: {
    marginTop: 2,
    fontSize: 13,
    color: '#8A9A98',
  },
  list: {
    maxHeight: 280,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE4',
  },
  listItemSelected: {
    backgroundColor: '#F8FBFA',
    borderRadius: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8A9A98',
    lineHeight: 20,
  },
});
