import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import QRScannerModal from '../../components/QRScannerModal';

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

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterTab = 'current' | 'hosted' | 'invited' | 'past';

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  location_label: string | null;
  latitude: number;
  longitude: number;
  event_date: string;
  expires_at: string;
  host_id: string;
  created_at: string;
};

type EventWithMeta = EventRow & {
  role: string;
  member_count: number;
  is_live: boolean;
};

type Invitation = {
  id: string;
  created_at: string;
  inviter: { username: string } | null;
  event: EventRow | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  host: COLORS.teal,
  admin: '#7B5EA7',
  photographer: '#E08A3C',
  participant: COLORS.muted,
};

const FILTER_LABELS: Record<FilterTab, string> = {
  current: 'Actuels',
  hosted: 'Créés',
  invited: 'Invitations',
  past: 'Passés',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTtl(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)}j restants`;
  if (h >= 1) return `${h}h ${m}m restants`;
  return `${m}m restants`;
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active: boolean;
  count?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
          <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function EventCard({ event, onPress }: { event: EventWithMeta; onPress: () => void }) {
  const isExpired = new Date(event.expires_at) <= new Date();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Live badge */}
      {event.is_live && (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{event.name}</Text>
        <View style={[styles.rolePill, { backgroundColor: (ROLE_COLORS[event.role] ?? COLORS.muted) + '22' }]}>
          <Text style={[styles.rolePillText, { color: ROLE_COLORS[event.role] ?? COLORS.muted }]}>
            {event.role.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.cardMetaRow}>
          <Feather name="calendar" size={13} color={COLORS.muted} />
          <Text style={styles.cardMetaText}>{formatDate(event.event_date)}</Text>
        </View>

        {event.location_label ? (
          <View style={styles.cardMetaRow}>
            <Feather name="map-pin" size={13} color={COLORS.muted} />
            <Text style={styles.cardMetaText} numberOfLines={1}>{event.location_label}</Text>
          </View>
        ) : null}

        <View style={styles.cardMetaRow}>
          <Feather name="users" size={13} color={COLORS.muted} />
          <Text style={styles.cardMetaText}>{event.member_count} participant{event.member_count > 1 ? 's' : ''}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {!isExpired && (
          <View style={styles.ttlPill}>
            <Feather name="clock" size={11} color={COLORS.tealLight} />
            <Text style={styles.ttlPillText}>{formatTtl(event.expires_at)}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.viewButton} onPress={onPress}>
          <Text style={styles.viewButtonText}>
            {event.role === 'host' ? 'Gérer' : 'Voir'}
          </Text>
          <Feather name="arrow-right" size={13} color={COLORS.teal} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function InvitationCard({
  invitation,
  onAccept,
  onDecline,
}: {
  invitation: Invitation;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const event = invitation.event;
  if (!event) return null;

  return (
    <View style={[styles.card, styles.invitationCard]}>
      <View style={styles.invitationHeader}>
        <View style={styles.invitationIcon}>
          <Ionicons name="mail-open-outline" size={18} color={COLORS.coral} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.invitationFrom}>
            Invitation de <Text style={styles.invitationFromBold}>{invitation.inviter?.username ?? 'quelqu\'un'}</Text>
          </Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{event.name}</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.cardMetaRow}>
          <Feather name="calendar" size={13} color={COLORS.muted} />
          <Text style={styles.cardMetaText}>{formatDate(event.event_date)}</Text>
        </View>
        {event.location_label && (
          <View style={styles.cardMetaRow}>
            <Feather name="map-pin" size={13} color={COLORS.muted} />
            <Text style={styles.cardMetaText} numberOfLines={1}>{event.location_label}</Text>
          </View>
        )}
      </View>

      <View style={styles.invitationActions}>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
          <Feather name="x" size={15} color={COLORS.coral} />
          <Text style={styles.declineButtonText}>Décliner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Feather name="check" size={15} color={COLORS.white} />
          <Text style={styles.acceptButtonText}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({ filter }: { filter: FilterTab }) {
  const router = useRouter();
  const configs = {
    current: {
      icon: 'calendar' as const,
      title: 'Aucun événement en cours',
      sub: 'Rejoins un événement ou crées-en un !',
      cta: 'Créer un événement',
      action: () => router.push('/(tabs)/create' as any),
    },
    hosted: {
      icon: 'star' as const,
      title: 'Tu n\'héberges aucun événement',
      sub: 'Lance ta première sortie en appuyant sur le bouton +.',
      cta: 'Créer un événement',
      action: () => router.push('/(tabs)/create' as any),
    },
    invited: {
      icon: 'mail' as const,
      title: 'Aucune invitation',
      sub: 'Tu n\'as pas d\'invitation en attente.',
      cta: 'Explorer les événements',
      action: () => {},
    },
    past: {
      icon: 'archive' as const,
      title: 'Aucun événement passé',
      sub: 'Tes sorties passées apparaîtront ici.',
      cta: null,
      action: () => {},
    },
  };
  const { icon, title, sub, cta, action } = configs[filter];

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Feather name={icon} size={28} color={COLORS.teal} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
      {cta && (
        <TouchableOpacity style={styles.emptyCta} onPress={action}>
          <Text style={styles.emptyCtaText}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function EventsScreen() {
  const router = useRouter();
  const [showScanModal, setShowScanModal] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('current');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentEvents, setCurrentEvents] = useState<EventWithMeta[]>([]);
  const [hostedEvents, setHostedEvents] = useState<EventWithMeta[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithMeta[]>([]);

  const loadData = useCallback(async () => {
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    const [membershipsRes, invitationsRes] = await Promise.all([
      supabase
        .from('members')
        .select(`
          role,
          events (
            id, name, description, location_label,
            latitude, longitude,
            event_date, expires_at, host_id, created_at
          )
        `)
        .eq('user_id', uid),

      supabase
        .from('event_invitations')
        .select(`
          id, created_at,
          inviter:profiles!inviter_id (username),
          event:events (
            id, name, description, location_label,
            event_date, expires_at, host_id
          )
        `)
        .eq('invitee_id', uid)
        .eq('status', 'pending'),
    ]);

    if (membershipsRes.error) {
      setError(membershipsRes.error.message);
    } else {
      const validMemberships = (membershipsRes.data ?? []).filter((m) => m.events);

      // Récupère les compteurs de membres pour chaque event
      const eventIds = validMemberships.map((m) => (m.events as unknown as EventRow).id);
      let countMap: Record<string, number> = {};

      if (eventIds.length > 0) {
        const { data: allMembers } = await supabase
          .from('members')
          .select('event_id')
          .in('event_id', eventIds);

        (allMembers ?? []).forEach((m) => {
          countMap[m.event_id] = (countMap[m.event_id] ?? 0) + 1;
        });
      }

      const now = new Date();
      const withMeta: EventWithMeta[] = validMemberships.map((m) => {
        const ev = m.events as unknown as EventRow;
        const expiresAt = new Date(ev.expires_at);
        const eventDate = new Date(ev.event_date);
        return {
          ...ev,
          role: m.role,
          member_count: countMap[ev.id] ?? 1,
          is_live: eventDate <= now && expiresAt > now,
        };
      });

      const active = withMeta.filter((e) => new Date(e.expires_at) > now);
      const past = withMeta.filter((e) => new Date(e.expires_at) <= now);

      const sortAsc = (a: EventWithMeta, b: EventWithMeta) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      const sortDesc = (a: EventWithMeta, b: EventWithMeta) =>
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime();

      setCurrentEvents([...active].sort(sortAsc));
      setHostedEvents([...active.filter((e) => e.role === 'host')].sort(sortAsc));
      setPastEvents([...past].sort(sortDesc));
    }

    if (!invitationsRes.error) {
      setInvitations(invitationsRes.data as unknown as Invitation[]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Recharge à chaque fois qu'on revient sur cet onglet
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  async function handleAccept(invitationId: string) {
    const { error } = await supabase.rpc('accept_event_invitation', {
      p_invitation_id: invitationId,
    });
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      await loadData();
      setFilter('current');
    }
  }

  async function handleDecline(invitationId: string) {
    Alert.alert('Décliner', 'Es-tu sûr de vouloir décliner cette invitation ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Décliner',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('decline_event_invitation', {
            p_invitation_id: invitationId,
          });
          if (error) {
            Alert.alert('Erreur', error.message);
          } else {
            await loadData();
          }
        },
      },
    ]);
  }

  const liveEvents = currentEvents.filter((e) => e.is_live);

  const dataForFilter = {
    current: currentEvents,
    hosted: hostedEvents,
    invited: [], // géré séparément
    past: pastEvents,
  };

  const counts = {
    current: currentEvents.length,
    hosted: hostedEvents.length,
    invited: invitations.length,
    past: pastEvents.length,
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={COLORS.teal} size="large" />
          <Text style={styles.loadingText}>Chargement des événements…</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <Feather name="alert-circle" size={36} color={COLORS.coral} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadData().finally(() => setLoading(false)); }}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            EventSnap <Text style={{ fontWeight: '400', fontSize: 24 }}>Events</Text>
          </Text>
          <TouchableOpacity 
            style={styles.scanButton} 
            onPress={() => setShowScanModal(true)}
          >
            <Ionicons name="qr-code-outline" size={18} color={COLORS.teal} />
          </TouchableOpacity>
        </View>

        {/* ── Filter chips ── */}
        <View style={styles.chipsRow}>
          {(Object.keys(FILTER_LABELS) as FilterTab[]).map((tab) => (
            <FilterChip
              key={tab}
              label={FILTER_LABELS[tab]}
              active={filter === tab}
              count={counts[tab]}
              onPress={() => setFilter(tab)}
            />
          ))}
        </View>

        {/* ── Liste ── */}
        {filter === 'invited' ? (
          <FlatList
            data={invitations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.teal]} tintColor={COLORS.teal} />}
            ListEmptyComponent={<EmptyState filter="invited" />}
            renderItem={({ item }) => (
              <InvitationCard
                invitation={item}
                onAccept={() => handleAccept(item.id)}
                onDecline={() => handleDecline(item.id)}
              />
            )}
          />
        ) : (
          <FlatList
            data={dataForFilter[filter]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.teal]} tintColor={COLORS.teal} />}
            ListEmptyComponent={<EmptyState filter={filter} />}
            ListHeaderComponent={
              filter === 'current' && liveEvents.length > 0 ? (
                <View style={styles.sectionHeader}>
                  <View style={styles.liveDot} />
                  <Text style={styles.sectionHeaderText}>Live Now</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{liveEvents.length} actif{liveEvents.length > 1 ? 's' : ''}</Text>
                  </View>
                </View>
              ) : filter === 'hosted' && hostedEvents.length > 0 ? (
                <View style={styles.sectionHeader}>
                  <Feather name="star" size={14} color={COLORS.teal} />
                  <Text style={styles.sectionHeaderText}>Tes sorties hébergées</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <EventCard
                event={item}
                onPress={() => router.push(`/event/${item.id}` as any)}
              />
            )}
          />
        )}
        <QRScannerModal
          visible={showScanModal}
          onClose={() => setShowScanModal(false)}
          onJoined={(eventId) => {
            setShowScanModal(false);
            loadData(); // recharge la liste pour inclure le nouvel event
            router.push(`/event/${eventId}` as any);
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { 
    flex: 1, 
    marginTop: Platform.OS === 'ios' ? 12 : 36, 
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.muted, fontSize: 14, fontWeight: '500' },
  errorText: { color: COLORS.coral, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { marginTop: 8, backgroundColor: COLORS.teal, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: COLORS.white, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.teal,
    letterSpacing: -0.5,
  },
  scanButton: {
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },

  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E8E5DC',
    backgroundColor: COLORS.white,
    gap: 5,
  },
  chipActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  chipTextActive: { color: COLORS.white },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.muted },
  chipBadgeTextActive: { color: COLORS.white },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
    flexGrow: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.teal,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: COLORS.coral + '22',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.coral },

  // ── Event Card Harmonisée (DA Coins à 20, ombres légères) ──
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.coral,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.coral,
    letterSpacing: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  rolePill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rolePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  cardMeta: { gap: 6, marginBottom: 12 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { fontSize: 13, color: COLORS.muted, flex: 1, fontWeight: '500' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 2,
  },
  ttlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5F0ED',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ttlPillText: { fontSize: 11, fontWeight: '700', color: COLORS.teal },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.teal },

  // ── Invitation Card ──
  invitationCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.coral,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  invitationIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.coral + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitationFrom: { fontSize: 12, color: COLORS.muted, marginBottom: 2, fontWeight: '500' },
  invitationFromBold: { fontWeight: '700', color: COLORS.dark },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FCEBEA',
    borderRadius: 10,
    paddingVertical: 9,
  },
  declineButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.coral },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.teal,
    borderRadius: 10,
    paddingVertical: 9,
  },
  acceptButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  // ── Empty State ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E5F0ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, textAlign: 'center' },
  emptySub: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18, fontWeight: '500' },
  emptyCta: {
    marginTop: 8,
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  emptyCtaText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});