import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type MapSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
};

export function MapSearchBar({ value, onChangeText }: MapSearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#8A9A98" />
        <TextInput
          style={styles.input}
          placeholder="Search events or locations..."
          placeholderTextColor="#A0A0A0"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <TouchableOpacity
        style={styles.filterButton}
        disabled
        accessibilityLabel="Filtres (bientôt disponible)"
      >
        <Ionicons name="options-outline" size={20} color="#B0B8B6" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF8E7',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8E5DC',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#335C58',
    padding: 0,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    opacity: 0.6,
  },
});
