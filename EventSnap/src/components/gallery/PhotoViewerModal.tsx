import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, REACTION_EMOJIS } from '@/constants/Colors';
import type { EventPhoto } from '@/types/photo';
import { formatPhotoDate, groupReactions, downloadPhotosToDevice } from '@/lib/eventPhotos';
import ZoomableImage from './ZoomableImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.72;

type PhotoViewerModalProps = {
  visible: boolean;
  photos: EventPhoto[];
  initialIndex: number;
  currentUserId: string | null;
  onClose: () => void;
  onReact: (photoId: string, emoji: string) => Promise<void>;
  onReactionUpdated?: () => void;
};

export default function PhotoViewerModal({
  visible,
  photos,
  initialIndex,
  currentUserId,
  onClose,
  onReact,
  onReactionUpdated,
}: PhotoViewerModalProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<EventPhoto>>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reacting, setReacting] = useState(false);

  const currentPhoto = photos[currentIndex];

  const handleClose = useCallback(() => {
    setScrollEnabled(true);
    onClose();
  }, [onClose]);

  const handleDownloadCurrent = async () => {
    if (!currentPhoto || Platform.OS === 'web') return;
    setDownloading(true);
    try {
      const count = await downloadPhotosToDevice([currentPhoto]);
      if (count > 0) {
        Alert.alert('Succès', 'Photo sauvegardée dans ta galerie.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setDownloading(false);
    }
  };

  const handleReact = async (emoji: string) => {
    if (!currentPhoto || !currentUserId || reacting) return;
    setReacting(true);
    try {
      await onReact(currentPhoto.id, emoji);
      onReactionUpdated?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setReacting(false);
    }
  };

  if (!visible || photos.length === 0) return null;

  const reactionCounts = groupReactions(currentPhoto?.reactions ?? []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.topBtn} onPress={handleClose}>
            <Feather name="x" size={22} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>

          {Platform.OS !== 'web' ? (
            <TouchableOpacity
              style={styles.topBtn}
              onPress={handleDownloadCurrent}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Feather name="download" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.topBtnPlaceholder} />
          )}
        </View>

        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          scrollEnabled={scrollEnabled}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
            setScrollEnabled(true);
          }}
          renderItem={({ item, index }) => (
            <View style={styles.slide}>
              <ZoomableImage
                uri={item.photo_url}
                width={SCREEN_WIDTH}
                height={IMAGE_HEIGHT}
                resetKey={index === currentIndex ? currentIndex : -1}
                onZoomChange={(zoomed) => {
                  if (index === currentIndex) {
                    setScrollEnabled(!zoomed);
                  }
                }}
              />
            </View>
          )}
        />

        {currentPhoto && (
          <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.metaRow}>
              <Text style={styles.authorText}>
                @{currentPhoto.author?.username ?? 'utilisateur'}
              </Text>
              <Text style={styles.dateText}>{formatPhotoDate(currentPhoto.created_at)}</Text>
            </View>

            {Object.keys(reactionCounts).length > 0 && (
              <View style={styles.reactionsSummary}>
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <Text key={emoji} style={styles.reactionSummaryText}>
                    {emoji} {count}
                  </Text>
                ))}
              </View>
            )}

            {currentUserId && (
              <View style={styles.reactionBar}>
                {REACTION_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionBtn}
                    onPress={() => handleReact(emoji)}
                    disabled={reacting}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  counterPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  dateText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  reactionsSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reactionSummaryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  reactionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 22,
  },
});
