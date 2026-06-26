import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useProfile } from '@/hooks/useProfile';
import { Colors } from '@/constants/Colors';

export function MapHeader() {
  const router = useRouter();
  const { profile } = useProfile();

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : '?';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={() => router.push('/(tabs)/profile')}
        accessibilityLabel="Profil"
      >
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.logo}>EventSnap</Text>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push('/(tabs)/profile')}
        accessibilityLabel="Paramètres"
      >
        <Ionicons name="settings-outline" size={22} color="#335C58" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  avatarButton: {
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F6F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0EBE9',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#335C58',
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#335C58',
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E5DC',
  },
});
