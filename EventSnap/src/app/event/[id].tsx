import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import QRCode from 'react-native-qrcode-svg';
import QRScannerModal from '../../components/QRScannerModal';

const COLORS = {
  bgLight: '#E3EAE5',
  bgCream: '#F5F3EB',
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

type Photo = {
  id: string;
  photo_url: string;
  user_id: string;
  created_at: string;
  storage_path: string;
  reactions?: string[];
};

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TimeRemaining({ expiresAt }: { expiresAt?: string }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!expiresAt) return;
    function compute() {
      const diff = new Date(expiresAt!).getTime() - Date.now();
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

  if (!expiresAt) return null;
  const expired = new Date(expiresAt) <= new Date();
  return (
    <View style={[styles.ttlBadge, expired && styles.ttlBadgeExpired]}>
      <Feather name="clock" size={11} color={expired ? COLORS.coral : COLORS.tealLight} />
      <Text style={[styles.ttlBadgeText, expired && styles.ttlBadgeTextExpired]}>{label}</Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showScanModal, setShowScanModal] = useState(false);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadEventData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);

      const [eventRes, membersRes, photosRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase
          .from('members')
          .select('id, user_id, role, joined_at, profiles(username, avatar_url)')
          .eq('event_id', id)
          .order('joined_at', { ascending: true }),
        supabase
          .from('photos')
          .select('*')
          .eq('event_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (eventRes.error) throw eventRes.error;
      setEvent(eventRes.data);

      if (!membersRes.error) {
        setMembers(membersRes.data as unknown as Member[]);
      }

      if (!photosRes.error && photosRes.data) {
        const photosWithUrls = await Promise.all(
          photosRes.data.map(async (p: any) => {
            const { data: signedData } = await supabase.storage
              .from('event-photos')
              .createSignedUrl(p.storage_path, 3600); // valide 1h

            return {
              ...p,
              photo_url: signedData?.signedUrl ?? '',
              reactions: p.reactions || ['❤️', '🔥'].slice(0, Math.floor(Math.random() * 3)),
            };
          })
        );
        setPhotos(photosWithUrls);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la caméra est nécessaire.");
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });

      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri || (result as any).uri;
        if (uri) uploadPhoto(uri);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  }

  async function handlePickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });

      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri || (result as any).uri;
        if (uri) uploadPhoto(uri);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  }

  async function uploadPhoto(uri: string) {
    if (!currentUserId || !id) return;
    setUploading(true);

    try {
      const ext = (uri.substring(uri.lastIndexOf('.') + 1) || 'jpeg').toLowerCase();

      // Structure attendue par la policy storage : {event_id}/{user_id}/{filename}
      const fileName = `${id}/${currentUserId}/${Date.now()}.${ext}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);
      const fileSizeBytes = arrayBuffer.byteLength;

      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, arrayBuffer, { contentType });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('photos').insert({
        event_id: id,
        user_id: currentUserId,
        storage_path: fileName,
        file_size_bytes: fileSizeBytes,
      });

      if (dbError) throw dbError;

      const otherMembers = members.filter((m) => m.user_id !== currentUserId);
      const notifications = otherMembers.map((m) => ({
        user_id: m.user_id,
        event_id: id,
        message: `Nouvelle photo live dans le groupe "${event?.name || 'Événement'}" !`,
        type: 'new_photo',
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      await loadEventData();
      Alert.alert('Parfait !', 'Photo ajoutée à la timeline.');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setUploading(false);
    }
  }

  function handlePhotoLongPress(photoId: string) {
    Alert.alert('Ajouter une réaction', 'Choisissez un emoji pour réagir en direct', [
      { text: '❤️ Love', onPress: () => addLocalReaction(photoId, '❤️') },
      { text: '🔥 Fire', onPress: () => addLocalReaction(photoId, '🔥') },
      { text: '😂 Haha', onPress: () => addLocalReaction(photoId, '😂') },
      { text: '🙌 Bravo', onPress: () => addLocalReaction(photoId, '🙌') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function addLocalReaction(photoId: string, emoji: string) {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === photoId) {
          return { ...p, reactions: [...(p.reactions || []), emoji] };
        }
        return p;
      })
    );
  }

  function handleAddFriend() {
    if (!searchQuery.trim()) return;
    Alert.alert('Invitation', `Une demande d'accès a été envoyée à "${searchQuery}".`);
    setSearchQuery('');
    setShowSearch(false);
  }

  const isHost = event?.host_id === currentUserId;

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.bgLight, COLORS.bgCream]} style={styles.centered}>
        <ActivityIndicator color={COLORS.teal} size="large" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgLight, COLORS.bgCream]} style={styles.container}>
      {/* Header — padding top renforcé pour ne jamais être coupé par la status bar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={18} color={COLORS.teal} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {event ? event.name : 'Chargement...'}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowQRModal(!showQRModal)}
            style={[styles.iconButton, showQRModal && styles.activeIconBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="qr-code-outline" size={18} color={showQRModal ? COLORS.white : COLORS.teal} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowScanModal(true)}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="camera" size={18} color={COLORS.teal} />
          </TouchableOpacity>

          {isHost && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>HOST</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Modal QR Code intégré */}
        {showQRModal && (
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>Partager la Room Live</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Feather name="x" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.qrSubtitle}>Scannez ce code pour rejoindre instantanément et uploader vos photos.</Text>

            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={`myapp://event/join?id=${event?.id}`}
                size={140}
                color={COLORS.teal}
                backgroundColor={COLORS.white}
              />
            </View>
            <Text style={styles.qrCodeId}>
              ID: {event ? event.id.substring(0, 8).toUpperCase() : '------'}
            </Text>
          </View>
        )}

        {/* Détails Principaux */}
        <View style={styles.transparentCard}>
          <View style={styles.mainTitleRow}>
            <Text style={styles.eventName}>{event ? event.name : 'Événement'}</Text>
            <TimeRemaining expiresAt={event?.expires_at} />
          </View>

          {event && event.description ? <Text style={styles.description}>{event.description}</Text> : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={13} color={COLORS.tealLight} />
              <Text style={styles.metaText}>{formatDate(event?.event_date)}</Text>
            </View>
            {event && event.location_label ? (
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={13} color={COLORS.tealLight} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {event.location_label}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Section Participants */}
        <View style={styles.transparentCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <Feather name="users" size={14} color={COLORS.teal} />
              <Text style={styles.sectionTitle}>Membres connectés</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{members.length}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.addFriendBtn} onPress={() => setShowSearch(!showSearch)}>
              <Feather name={showSearch ? 'minus' : 'plus'} size={16} color={COLORS.white} />
              <Text style={styles.addFriendBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {showSearch && (
            <View style={styles.searchWrapper}>
              <TextInput
                placeholder="Rechercher un pseudo ou ami..."
                placeholderTextColor={COLORS.muted}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleAddFriend}
              />
              <TouchableOpacity style={styles.searchSubmitBtn} onPress={handleAddFriend}>
                <Feather name="search" size={14} color={COLORS.teal} />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersHorizontalScroll}>
            {members.map((m) => (
              <View key={m.id} style={styles.memberAvatarWrapper}>
                <View style={[styles.avatarCircle, m.role === 'host' && styles.hostAvatarBorder]}>
                  <Text style={styles.avatarLetter}>{(m.profiles?.username ?? '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.memberMiniName} numberOfLines={1}>
                  {m.profiles?.username ?? 'User'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Section Flux Galerie */}
        <View style={styles.transparentCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <Feather name="camera" size={14} color={COLORS.teal} />
              <Text style={styles.sectionTitle}>Flux Photos Live</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{photos.length}</Text>
              </View>
            </View>
          </View>

          {photos.length === 0 ? (
            <View style={styles.galleryEmpty}>
              <Ionicons name="images-outline" size={32} color="#C4D1CC" />
              <Text style={styles.galleryEmptyText}>Aucun cliché live pour l'instant.</Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.8}
                  onLongPress={() => handlePhotoLongPress(p.id)}
                  style={styles.photoContainer}
                >
                  <Image source={{ uri: p.photo_url }} style={styles.photoItemCompact} />

                  {p.reactions && p.reactions.length > 0 && (
                    <View style={styles.reactionBadgeRow}>
                      <Text style={styles.reactionBadgeText}>{p.reactions.join('')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={handlePickImage} disabled={uploading}>
              <Feather name="image" size={16} color={COLORS.teal} />
              <Text style={[styles.actionBtnText, { color: COLORS.teal }]}>Album</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleTakePhoto} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Feather name="aperture" size={16} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Capturer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>💡 Reste appuyé longuement sur une photo pour y ajouter une réaction emoji.</Text>
        </View>
      </ScrollView>

      <QRScannerModal
        visible={showScanModal}
        onClose={() => setShowScanModal(false)}
        onJoined={(eventId) => {
          setShowScanModal(false);
          if (eventId === id) {
            loadEventData();
          } else {
            router.push(`/event/${eventId}`);
          }
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconButton: { backgroundColor: COLORS.white, padding: 9, borderRadius: 12, elevation: 1 },
  activeIconBtn: { backgroundColor: COLORS.teal },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.teal, textAlign: 'center', marginHorizontal: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hostBadge: { backgroundColor: COLORS.coral, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  hostBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  transparentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: 12,
  },
  qrCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1.5, borderColor: COLORS.tealLight },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qrTitle: { fontSize: 14, fontWeight: '800', color: COLORS.teal },
  qrSubtitle: { fontSize: 12, color: '#666', lineHeight: 16 },
  qrCodeWrapper: { alignSelf: 'center', padding: 12, backgroundColor: COLORS.white, borderRadius: 14 },
  qrCodeId: {
    alignSelf: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mainTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  eventName: { flex: 1, fontSize: 19, fontWeight: '800', color: COLORS.dark },
  description: { fontSize: 13, color: '#444', lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, fontWeight: '600', color: COLORS.teal },
  ttlBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.white, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8 },
  ttlBadgeExpired: { backgroundColor: '#FCEBEA' },
  ttlBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.tealLight },
  ttlBadgeTextExpired: { color: COLORS.coral },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: 0.4 },
  countBadge: { backgroundColor: 'rgba(51, 92, 88, 0.1)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.teal },
  addFriendBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.teal, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
  addFriendBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  searchWrapper: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  searchInput: { flex: 1, height: 38, paddingHorizontal: 12, fontSize: 13, color: COLORS.dark },
  searchSubmitBtn: { width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.inputBg },
  membersHorizontalScroll: { gap: 14, paddingVertical: 4 },
  memberAvatarWrapper: { alignItems: 'center', width: 52, gap: 4 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hostAvatarBorder: { borderColor: COLORS.coral, borderWidth: 2 },
  avatarLetter: { fontSize: 14, fontWeight: '800', color: COLORS.teal },
  memberMiniName: { fontSize: 10, fontWeight: '600', color: COLORS.dark, textAlign: 'center' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 },
  photoContainer: { position: 'relative' },
  photoItemCompact: { width: 90, height: 90, borderRadius: 14, backgroundColor: COLORS.inputBg },
  reactionBadgeRow: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },
  reactionBadgeText: { fontSize: 10 },
  galleryEmpty: { alignItems: 'center', paddingVertical: 20, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 14 },
  galleryEmptyText: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 12, gap: 6 },
  actionBtnPrimary: { backgroundColor: COLORS.coral },
  actionBtnOutline: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.teal },
  actionBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  hintText: { fontSize: 10, color: COLORS.muted, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});