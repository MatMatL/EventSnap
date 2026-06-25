import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

const COLORS = {
  cream: '#FFF8E7',
  teal: '#335C58',
  tealLight: '#2BA8A2',
  yellow: '#FFD23F',
  coral: '#EF6C4A',
  white: '#FFFFFF',
  border: '#E8E5DC',
  inputBg: '#F4F2EB',
  muted: '#A0A0A0',
  dark: '#1A1A1A',
};

type EventDetail = {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  location_label: string | null;
  event_date: string;
  expires_at: string;
  host_id: string;
  created_at: string;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function compute() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('Expiré');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (h >= 24) {
        const d = Math.floor(h / 24);
        setLabel(`${d}j ${h % 24}h restants`);
      } else {
        setLabel(`${h}h ${m}m restants`);
      }
    }
    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expired = new Date(expiresAt) <= new Date();
  return (
    <View style={[styles.ttlBadge, expired && styles.ttlBadgeExpired]}>
      <Feather name="clock" size={12} color={expired ? COLORS.coral : COLORS.tealLight} />
      <Text style={[styles.ttlBadgeText, expired && styles.ttlBadgeTextExpired]}>{label}</Text>
    </View>
  );
}

const ROLE_COLORS: Record<string, string> = {
  host: COLORS.teal,
  admin: '#7B5EA7',
  photographer: '#E08A3C',
  participant: COLORS.muted,
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id ?? null);

    const [eventRes, membersRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase
        .from('members')
        .select('id, user_id, role, joined_at, profiles(username, avatar_url)')
        .eq('event_id', id)
        .order('joined_at', { ascending: true }),
    ]);

    if (eventRes.error) {
      setError(eventRes.error.message);
    } else {
      setEvent(eventRes.data);
    }

    if (!membersRes.error) {
      setMembers(membersRes.data as unknown as Member[]);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const isHost = event?.host_id === currentUserId;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={COLORS.teal} size="large" />
        <Text style={styles.loadingText}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.centered}>
        <Feather name="alert-circle" size={40} color={COLORS.coral} />
        <Text style={styles.errorTitle}>Événement introuvable</Text>
        <Text style={styles.errorSub}>{error ?? 'Cet événement n\'existe pas ou vous n\'y avez pas accès.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <LinearGradient colors={['#E3EAE5', COLORS.cream]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={COLORS.teal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.name}</Text>
        {isHost && (
          <View style={styles.hostBadge}>
            <Text style={styles.hostBadgeText}>HOST</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Bandeau sécurité */}
        <View style={styles.rlsBanner}>
          <Feather name="shield" size={14} color={COLORS.tealLight} />
          <Text style={styles.rlsBannerText}>RLS SECURITY · PARTICIPANTS ONLY</Text>
        </View>

        {/* TTL */}
        <TimeRemaining expiresAt={event.expires_at} />

        {/* Infos principales */}
        <View style={styles.card}>
          <Text style={styles.eventName}>{event.name}</Text>

          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : (
            <Text style={styles.descriptionEmpty}>Aucune description.</Text>
          )}

          <View style={styles.infoRow}>
            <Feather name="calendar" size={15} color={COLORS.tealLight} />
            <Text style={styles.infoText}>{formatDate(event.event_date)}</Text>
          </View>

          {(event.location_label || event.latitude) && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={15} color={COLORS.tealLight} />
              <Text style={styles.infoText}>
                {event.location_label ?? `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Feather name="clock" size={15} color={COLORS.muted} />
            <Text style={[styles.infoText, { color: COLORS.muted }]}>
              Expire le {formatDate(event.expires_at)}
            </Text>
          </View>
        </View>

        {/* Participants */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Feather name="users" size={15} color={COLORS.teal} />
            <Text style={styles.sectionTitle}>Participants</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{members.length}</Text>
            </View>
          </View>

          {members.length === 0 ? (
            <Text style={styles.emptyText}>Aucun participant pour l'instant.</Text>
          ) : (
            members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarLetter}>
                    {(m.profiles?.username ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.profiles?.username ?? 'Utilisateur'}</Text>
                  <Text style={styles.memberJoined}>
                    Rejoint le {new Date(m.joined_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[m.role] ?? COLORS.muted) + '22' }]}>
                  <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[m.role] ?? COLORS.muted }]}>
                    {m.role.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Galerie (placeholder) */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Feather name="image" size={15} color={COLORS.teal} />
            <Text style={styles.sectionTitle}>Galerie live</Text>
          </View>
          <View style={styles.galleryEmpty}>
            <Feather name="camera" size={32} color={COLORS.border} />
            <Text style={styles.galleryEmptyText}>Aucune photo pour l'instant.</Text>
            <Text style={styles.galleryEmptySubText}>Sois le premier à uploader !</Text>
          </View>
          <TouchableOpacity style={styles.uploadButton}>
            <Feather name="upload" size={18} color={COLORS.white} />
            <Text style={styles.uploadButtonText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: COLORS.cream },
  loadingText: { color: COLORS.muted, fontSize: 14, marginTop: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, textAlign: 'center' },
  errorSub: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  retryButton: { marginTop: 8, backgroundColor: COLORS.teal, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { color: COLORS.white, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backButton: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.white },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.teal },
  hostBadge: { backgroundColor: COLORS.teal, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  hostBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  rlsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F6',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  rlsBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tealLight,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },

  ttlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EAF7F6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'center',
  },
  ttlBadgeExpired: { backgroundColor: '#FFF0EC' },
  ttlBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.tealLight },
  ttlBadgeTextExpired: { color: COLORS.coral },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },

  eventName: { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  description: { fontSize: 14, color: '#555', lineHeight: 20 },
  descriptionEmpty: { fontSize: 14, color: COLORS.muted, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, fontSize: 14, color: COLORS.dark, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.teal, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', textTransform: 'uppercase', letterSpacing: 0.8 },
  countBadge: { backgroundColor: COLORS.inputBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.teal },

  emptyText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 8 },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.inputBg, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: COLORS.teal },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  memberJoined: { fontSize: 11, color: COLORS.muted },
  roleBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  roleBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  galleryEmpty: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  galleryEmptyText: { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  galleryEmptySubText: { fontSize: 12, color: COLORS.border },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealLight,
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  uploadButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
