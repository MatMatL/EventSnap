import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, TextInput, Dimensions, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [eventCount, setEventCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);
      setUsername(profileData.username || '');

      const { count: events } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('host_id', user.id);
      setEventCount(events || 0);

      const { count: photos } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setPhotoCount(photos || 0);

    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar() {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    setUploading(true);
    const img = result.assets[0];
    
    const response = await fetch(img.uri);
    const blob = await response.blob()
    
    const filePath = `${profile.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { 
        contentType: img.mimeType || 'image/jpeg', 
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    Alert.alert('Succès', 'Votre photo de profil a été mise à jour !');
    fetchProfileData();
  } catch (error: any) {
    Alert.alert('Erreur d\'upload', error.message);
  } finally {
    setUploading(false);
  }
}

  async function saveProfileUpdate() {
    if (!username.trim()) {
      Alert.alert('Erreur', 'Le pseudo ne peut pas être vide.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('profiles').update({ username: username.trim() }).eq('id', profile.id);
      if (error) throw error;
      setEditing(false);
      fetchProfileData();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !profile) {
    return (
      <LinearGradient colors={['#E3EAE5', '#F5F3EB']} style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#335C58" />
      </LinearGradient>
    );
  }

  const storageUsedBytes = profile?.storage_used_bytes || 0;
  const storageLimitBytes = 2 * 1024 * 1024 * 1024;
  const storageUsedMB = (storageUsedBytes / (1024 * 1024)).toFixed(1);
  const storageLimitMB = (storageLimitBytes / (1024 * 1024)).toFixed(0);
  const storagePercentage = Math.min((storageUsedBytes / storageLimitBytes) * 100, 100);

  return (
    <LinearGradient colors={['#E3EAE5', '#F5F3EB']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
                  <View style={styles.topBar}>
                    <Text style={styles.topLogo}>EventSnap <Text style={{fontWeight: '400', fontSize: 20}}>Profile</Text></Text>
                    <TouchableOpacity style={styles.iconButton}>
                      <Ionicons name="refresh-outline" size={20} color="#335C58" />
                    </TouchableOpacity>
                  </View>

          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={uploadAvatar} disabled={uploading}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Feather name="user" size={40} color="#335C58" />
                </View>
              )}
              {uploading ? (
                <View style={styles.avatarLoading}><ActivityIndicator color="#FFF" /></View>
              ) : (
                <View style={styles.editPencilBadge}>
                  <Feather name="edit-2" size={12} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>

            {editing ? (
              <View style={styles.editInputRow}>
                <TextInput style={styles.usernameInput} value={username} onChangeText={setUsername} autoCapitalize="none" />
                <TouchableOpacity style={styles.saveActionBtn} onPress={saveProfileUpdate}>
                  <Feather name="check" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.nameRow} onPress={() => setEditing(true)}>
                <Text style={styles.profileName}>{profile?.username || 'Anonyme'}</Text>
                <Feather name="edit-3" size={14} color="#666" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
            <Text style={styles.profileHandle}>@{profile?.username?.toLowerCase() || 'user'}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{eventCount}</Text>
              <Text style={styles.statLbl}>TOTAL EVENTS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{photoCount}</Text>
              <Text style={styles.statLbl}>SHARED SNAPS</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleGroup}>
                <Feather name="cloud" size={18} color="#335C58" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitleText}>Cloud Storage</Text>
              </View>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{profile?.plan || 'Free Plan'}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={[styles.progressBarFill, { width: `${storagePercentage}%` }]} />
            </View>
            <View style={styles.storageLabelRow}>
              <Text style={styles.storageMetrics}>{storageUsedMB} MB used</Text>
              <Text style={styles.storageMetrics}>{storageLimitMB} MB Limit</Text>
            </View>
            <Text style={styles.storageTip}>{(100 - storagePercentage).toFixed(0)}% storage remaining for your snaps.</Text>
          </View>

          <TouchableOpacity style={styles.upgradeBtn}>
            <Feather name="zap" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.upgradeBtnText}>UPGRADE TO PREMIUM</Text>
          </TouchableOpacity>

          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="options-outline" size={20} color="#335C58" />
              <Text style={styles.menuItemText}>Preferences</Text>
              <Feather name="chevron-right" size={16} color="#A0A0A0" />
            </TouchableOpacity>
            
            <View style={styles.menuLineDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="notifications-outline" size={20} color="#335C58" />
              <Text style={styles.menuItemText}>Notifications</Text>
              <Feather name="chevron-right" size={16} color="#A0A0A0" />
            </TouchableOpacity>

            <View style={styles.menuLineDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => supabase.auth.signOut()}>
              <Feather name="log-out" size={20} color="#D9534F" />
              <Text style={[styles.menuItemText, { color: '#D9534F' }]}>Logout</Text>
              <Feather name="chevron-right" size={16} color="#D9534F" />
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: { 
      flex: 1, 
      marginTop: Platform.OS === 'ios' ? 12 : 36, 
    },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  topLogo: { fontSize: 24, fontWeight: '800', color: '#335C58' },
  settingsButton: { backgroundColor: '#FFFFFF', padding: 8, borderRadius: 10, elevation: 1, boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, position: 'relative', elevation: 4, boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFF' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8E5DC', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  avatarLoading: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  editPencilBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#EF6C4A', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#335C58' },
  profileHandle: { fontSize: 13, fontFamily: 'Courier', color: '#666', marginTop: 2 },
  editInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  usernameInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8E5DC', borderRadius: 8, paddingHorizontal: 12, height: 36, width: 160, fontSize: 15, fontWeight: '600', color: '#333' },
  saveActionBtn: { backgroundColor: '#335C58', marginLeft: 8, height: 36, width: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, paddingVertical: 12, marginBottom: 24 },
  statBox: { alignItems: 'center', width: '40%' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#335C58' },
  statLbl: { fontSize: 10, fontWeight: '700', color: '#777', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: '#D1DBD7' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: '0px 4px 10px rgba(0,0,0,0.04)', elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitleGroup: { flexDirection: 'row', alignItems: 'center' },
  cardTitleText: { fontSize: 15, fontWeight: '700', color: '#333' },
  planBadge: { backgroundColor: '#E5F0ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  planBadgeText: { fontSize: 11, color: '#335C58', fontWeight: '700' },
  progressContainer: { height: 8, backgroundColor: '#F4F2EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#335C58' },
  storageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  storageMetrics: { fontSize: 12, fontWeight: '600', color: '#666' },
  storageTip: { fontSize: 11, fontStyle: 'italic', color: '#888' },
  upgradeBtn: { backgroundColor: '#EF6C4A', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 50, borderRadius: 25, marginBottom: 24, boxShadow: '0px 4px 6px rgba(239,108,74,0.2)', elevation: 3 },
  upgradeBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  menuCard: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 8, boxShadow: '0px 4px 10px rgba(0,0,0,0.04)', elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  menuItemText: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: '600', color: '#333' },
  menuLineDivider: { height: 1, backgroundColor: '#F4F2EB', marginHorizontal: 20 },
  iconButton: { backgroundColor: '#FFFFFF', padding: 8, borderRadius: 12, elevation: 2 },

});