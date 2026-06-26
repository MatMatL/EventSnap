import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import type { EventPhoto } from '@/types/photo';
import { groupReactions } from '@/lib/eventPhotos';

const GRID_PADDING = 16;
const GRID_GAP = 10;
const NUM_COLUMNS = 2;

const TILE_SIZE =
  (Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

type EventPhotoGridProps = {
  photos: EventPhoto[];
  isSelectionMode: boolean;
  selectedPhotoIds: string[];
  onPhotoPress: (photo: EventPhoto, index: number) => void;
  onPhotoLongPress: (photoId: string) => void;
};

export default function EventPhotoGrid({
  photos,
  isSelectionMode,
  selectedPhotoIds,
  onPhotoPress,
  onPhotoLongPress,
}: EventPhotoGridProps) {
  return (
    <View style={styles.grid}>
      {photos.map((photo, index) => {
        const isSelected = selectedPhotoIds.includes(photo.id);
        const reactionCounts = groupReactions(photo.reactions);
        const reactionEmojis = Object.keys(reactionCounts).join('');

        return (
          <TouchableOpacity
            key={photo.id}
            activeOpacity={0.85}
            onPress={() => onPhotoPress(photo, index)}
            onLongPress={() => {
              if (!isSelectionMode) {
                onPhotoLongPress(photo.id);
              }
            }}
            style={[styles.tile, isSelected && styles.tileSelected]}
          >
            <Image
              source={{ uri: photo.photo_url }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />

            {isSelectionMode && (
              <View style={styles.selectionOverlay}>
                <Feather
                  name={isSelected ? 'check-circle' : 'circle'}
                  size={24}
                  color={isSelected ? COLORS.tealLight : 'rgba(255,255,255,0.85)'}
                />
              </View>
            )}

            {!isSelectionMode && reactionEmojis ? (
              <View style={styles.reactionBadge}>
                <Text style={styles.reactionText}>{reactionEmojis}</Text>
              </View>
            ) : null}

            {!isSelectionMode && photo.author ? (
              <View style={styles.authorBadge}>
                <Text style={styles.authorText} numberOfLines={1}>
                  @{photo.author.username}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function showReactionPicker(
  photoId: string,
  existingEmoji: string | null,
  onSelect: (photoId: string, emoji: string, replace: boolean) => void
) {
  const replace = !!existingEmoji;

  if (existingEmoji) {
    Alert.alert(
      'Réaction existante',
      `Tu as déjà réagi avec ${existingEmoji}. Veux-tu la changer ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, changer',
          onPress: () => openReactionAlert(photoId, replace, onSelect),
        },
      ]
    );
    return;
  }

  openReactionAlert(photoId, replace, onSelect);
}

function openReactionAlert(
  photoId: string,
  replace: boolean,
  onSelect: (photoId: string, emoji: string, replace: boolean) => void
) {
  Alert.alert('Ajouter une réaction', 'Choisis un emoji', [
    { text: '❤️', onPress: () => onSelect(photoId, '❤️', replace) },
    { text: '🔥', onPress: () => onSelect(photoId, '🔥', replace) },
    { text: '😂', onPress: () => onSelect(photoId, '😂', replace) },
    { text: '🙌', onPress: () => onSelect(photoId, '🙌', replace) },
    { text: 'Annuler', style: 'cancel' },
  ]);
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 120,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.inputBg,
  },
  tileSelected: {
    borderWidth: 3,
    borderColor: COLORS.tealLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reactionText: {
    fontSize: 11,
  },
  authorBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  authorText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
