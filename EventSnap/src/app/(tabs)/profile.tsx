import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* En-tête Profil */}
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://i.pravatar.cc/150?u=alex' }} 
            style={styles.avatar} 
          />
          <Text style={styles.name}>Alex Rivera</Text>
          <Text style={styles.username}>@arivera_lens</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>124</Text>
            <Text style={styles.statLabel}>EVENTS</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>4.2k</Text>
            <Text style={styles.statLabel}>SNAPS</Text>
          </View>
        </View>

        {/* Carte Stockage */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}><Feather name="cloud" size={16} /> Cloud Storage</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>Free Plan</Text></View>
          </View>
          <View style={styles.progressBar}><View style={styles.progressFill} /></View>
          <Text style={styles.storageText}>500MB used / 2GB Limit</Text>
        </View>

        {/* Boutons d'action */}
        <TouchableOpacity style={styles.upgradeButton}>
          <Feather name="zap" size={18} color="#FFF" />
          <Text style={styles.upgradeText}> UPGRADE TO PREMIUM</Text>
        </TouchableOpacity>

        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="options-outline" size={20} color="#335C58" />
            <Text style={styles.menuText}>Preferences</Text>
            <Feather name="chevron-right" size={20} color="#A0A0A0" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={20} color="#335C58" />
            <Text style={styles.menuText}>Notifications</Text>
            <Feather name="chevron-right" size={20} color="#A0A0A0" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { marginTop: 20 }]}>
            <Feather name="log-out" size={20} color="#D9534F" />
            <Text style={[styles.menuText, { color: '#D9534F' }]}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EB' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, borderWidth: 3, borderColor: '#FFFFFF' },
  name: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  username: { fontSize: 14, color: '#666', fontFamily: 'Courier' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  statBox: { alignItems: 'center', marginHorizontal: 20 },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#335C58' },
  statLabel: { fontSize: 10, color: '#888', fontWeight: '700' },
  divider: { width: 1, height: 30, backgroundColor: '#E8E5DC' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontWeight: '700', color: '#333' },
  badge: { backgroundColor: '#E5F0ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, color: '#335C58', fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: '#F4F2EB', borderRadius: 4, marginBottom: 8 },
  progressFill: { width: '25%', height: '100%', backgroundColor: '#335C58', borderRadius: 4 },
  storageText: { fontSize: 11, color: '#666' },
  upgradeButton: { backgroundColor: '#D68971', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 20 },
  upgradeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginLeft: 8 },
  menuList: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuText: { flex: 1, marginLeft: 16, fontSize: 15, fontWeight: '600', color: '#333' }
});