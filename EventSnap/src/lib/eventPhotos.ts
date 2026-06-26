import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { supabase } from './supabase';
import type { EventPhoto } from '@/types/photo';

export async function fetchEventPhotos(eventId: string): Promise<EventPhoto[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*, profiles(username, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return Promise.all(
    data.map(async (row: Record<string, unknown>) => {
      const storagePath = row.storage_path as string;
      const { data: signedData } = await supabase.storage
        .from('event-photos')
        .createSignedUrl(storagePath, 3600);

      const { data: reactionsData } = await supabase
        .from('reactions')
        .select('emoji')
        .eq('photo_id', row.id as string);

      const profile = row.profiles as { username: string; avatar_url: string | null } | null;

      return {
        id: row.id as string,
        event_id: row.event_id as string,
        user_id: row.user_id as string,
        storage_path: storagePath,
        created_at: row.created_at as string,
        photo_url: signedData?.signedUrl ?? '',
        reactions: reactionsData?.map((r) => r.emoji) ?? [],
        author: profile
          ? { username: profile.username, avatar_url: profile.avatar_url }
          : undefined,
      };
    })
  );
}

export function groupReactions(reactions: string[]): Record<string, number> {
  return reactions.reduce<Record<string, number>>((acc, emoji) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});
}

export function formatPhotoDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  if (status === 'granted') return true;

  Alert.alert(
    'Permission requise',
    "Autorise l'accès à ta galerie pour sauvegarder les photos sur ton téléphone."
  );
  return false;
}

export async function downloadPhotosToDevice(
  photos: Pick<EventPhoto, 'photo_url' | 'storage_path'>[]
): Promise<number> {
  if (photos.length === 0) return 0;

  if (Platform.OS === 'web') {
    Alert.alert(
      'Non supporté',
      'Le téléchargement est disponible uniquement sur iOS et Android.'
    );
    return 0;
  }

  const allowed = await requestMediaLibraryPermission();
  if (!allowed) return 0;

  let album = await MediaLibrary.getAlbumAsync('EventSnap').catch(() => null);

  let downloadedCount = 0;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const ext = photo.storage_path.split('.').pop()?.toLowerCase() || 'jpg';
    const tempUri = `${FileSystem.cacheDirectory}eventsnap_${Date.now()}_${i}.${ext}`;

    const { uri } = await FileSystem.downloadAsync(photo.photo_url, tempUri);
    const asset = await MediaLibrary.createAssetAsync(uri);

    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      album = await MediaLibrary.createAlbumAsync('EventSnap', asset, false);
    }

    downloadedCount++;
  }

  return downloadedCount;
}

export async function getUserReaction(
  photoId: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('reactions')
    .select('emoji')
    .eq('photo_id', photoId)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.emoji ?? null;
}

export async function toggleReaction(
  photoId: string,
  userId: string,
  emoji: string
): Promise<void> {
  const existing = await getUserReaction(photoId, userId);

  if (existing === emoji) {
    await supabase.from('reactions').delete().eq('photo_id', photoId).eq('user_id', userId);
    return;
  }

  if (existing) {
    await supabase.from('reactions').delete().eq('photo_id', photoId).eq('user_id', userId);
  }

  const { error } = await supabase.from('reactions').insert({
    photo_id: photoId,
    user_id: userId,
    emoji,
  });

  if (error) throw error;
}
