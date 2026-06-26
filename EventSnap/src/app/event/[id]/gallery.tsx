import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import {
  fetchEventPhotos,
  downloadPhotosToDevice,
  getUserReaction,
  toggleReaction,
} from '@/lib/eventPhotos';
import type { EventPhoto } from '@/types/photo';
import EventPhotoGrid, { showReactionPicker } from '@/components/gallery/EventPhotoGrid';
import PhotoViewerModal from '@/components/gallery/PhotoViewerModal';

export default function EventGalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [eventName, setEventName] = useState('');
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadGallery = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);

      const [eventRes, photosData] = await Promise.all([
        supabase.from('events').select('name').eq('id', id).single(),
        fetchEventPhotos(id),
      ]);

      if (eventRes.error) throw eventRes.error;
      setEventName(eventRes.data.name);
      setPhotos(photosData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const toggleSelection = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((pid) => pid !== photoId) : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    if (selectedPhotoIds.length === photos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(photos.map((p) => p.id));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedPhotoIds([]);
  };

  const runDownload = async (items: EventPhoto[]) => {
    if (items.length === 0) return;

    setIsDownloading(true);
    try {
      const count = await downloadPhotosToDevice(items);
      if (count > 0) {
        Alert.alert(
          'Succès',
          `${count} photo${count > 1 ? 's' : ''} sauvegardée${count > 1 ? 's' : ''} dans ta galerie (album EventSnap).`
        );
        exitSelectionMode();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSelected = () => {
    const selected = photos.filter((p) => selectedPhotoIds.includes(p.id));
    runDownload(selected);
  };

  const handleDownloadAll = () => {
    Alert.alert(
      'Télécharger tout',
      `Sauvegarder les ${photos.length} photos dans ta galerie ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Télécharger', onPress: () => runDownload(photos) },
      ]
    );
  };

  const handlePhotoLongPress = async (photoId: string) => {
    if (!currentUserId) return;
    try {
      const existing = await getUserReaction(photoId, currentUserId);
      showReactionPicker(photoId, existing, async (pid, emoji, replace) => {
        if (replace) {
          await supabase.from('reactions').delete().eq('photo_id', pid).eq('user_id', currentUserId);
        }
        await toggleReaction(pid, currentUserId, emoji);
        await loadGallery();
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    }
  };

  const handleViewerReact = async (photoId: string, emoji: string) => {
    if (!currentUserId) return;
    await toggleReaction(photoId, currentUserId, emoji);
    await loadGallery();
  };

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.bgLight, COLORS.bgCream]} style={styles.centered}>
        <ActivityIndicator color={COLORS.teal} size="large" />
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={[COLORS.bgLight, COLORS.bgCream]} style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadGallery}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgLight, COLORS.bgCream]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={18} color={COLORS.teal} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Galerie
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {eventName} · {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {photos.length > 0 && (
          <TouchableOpacity
            style={[styles.iconButton, isSelectionMode && styles.iconButtonActive]}
            onPress={() => {
              if (isSelectionMode) {
                exitSelectionMode();
              } else {
                setIsSelectionMode(true);
              }
            }}
          >
            <Feather
              name={isSelectionMode ? 'x' : 'check-square'}
              size={18}
              color={isSelectionMode ? COLORS.white : COLORS.teal}
            />
          </TouchableOpacity>
        )}
      </View>

      {photos.length > 0 && (
        <View style={styles.toolbar}>
          {isSelectionMode ? (
            <TouchableOpacity style={styles.toolbarBtn} onPress={selectAllPhotos}>
              <Feather
                name={selectedPhotoIds.length === photos.length ? 'minus-square' : 'check-square'}
                size={15}
                color={COLORS.teal}
              />
              <Text style={styles.toolbarBtnText}>
                {selectedPhotoIds.length === photos.length
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[styles.toolbarBtn, styles.downloadAllBtn]}
                  onPress={handleDownloadAll}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Feather name="download" size={15} color={COLORS.white} />
                      <Text style={styles.downloadAllText}>Tout télécharger</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <Text style={styles.hintText}>Appui long = réaction · Tap = agrandir</Text>
            </>
          )}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {photos.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="image" size={40} color="#C4D1CC" />
            <Text style={styles.emptyTitle}>Aucune photo</Text>
            <Text style={styles.emptyText}>
              Les clichés partagés pendant l'événement apparaîtront ici.
            </Text>
          </View>
        ) : (
          <EventPhotoGrid
            photos={photos}
            isSelectionMode={isSelectionMode}
            selectedPhotoIds={selectedPhotoIds}
            onPhotoPress={(photo, index) => {
              if (isSelectionMode) {
                toggleSelection(photo.id);
              } else {
                setViewerIndex(index);
              }
            }}
            onPhotoLongPress={handlePhotoLongPress}
          />
        )}
      </ScrollView>

      {isSelectionMode && selectedPhotoIds.length > 0 && Platform.OS !== 'web' && (
        <View style={[styles.floatingBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.floatingText}>
            {selectedPhotoIds.length} sélectionnée{selectedPhotoIds.length > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={styles.floatingDownloadBtn}
            onPress={handleDownloadSelected}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Feather name="download" size={16} color={COLORS.white} />
                <Text style={styles.floatingDownloadText}>Télécharger</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <PhotoViewerModal
        visible={viewerIndex !== null}
        photos={photos}
        initialIndex={viewerIndex ?? 0}
        currentUserId={currentUserId}
        onClose={() => setViewerIndex(null)}
        onReact={handleViewerReact}
        onReactionUpdated={loadGallery}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  iconButton: {
    backgroundColor: COLORS.white,
    padding: 9,
    borderRadius: 12,
    elevation: 1,
  },
  iconButtonActive: {
    backgroundColor: COLORS.teal,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.teal,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.teal,
  },
  downloadAllBtn: {
    backgroundColor: COLORS.teal,
  },
  downloadAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  hintText: {
    flex: 1,
    fontSize: 10,
    color: COLORS.muted,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.teal,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.coral,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  floatingText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  floatingDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.coral,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  floatingDownloadText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
