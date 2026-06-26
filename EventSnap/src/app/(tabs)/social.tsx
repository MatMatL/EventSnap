import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, TextInput,  Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

export default function SocialScreen() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    initSocial();
  }, [activeTab, searchQuery]);

  async function initSocial() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (activeTab === 'friends') {
        await fetchFriends(user.id);
      } else if (activeTab === 'requests') {
        await fetchRequests(user.id);
      } else if (activeTab === 'suggestions') {
        await fetchSuggestions(user.id);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFriends(userId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user:profiles!friendships_user_id_fkey(id, username, avatar_url),
        friend:profiles!friendships_friend_id_fkey(id, username, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) throw error;

    const formattedFriends = data.map((f: any) => {
      return f.user.id === userId ? f.friend : f.user;
    });

    if (searchQuery.trim()) {
      setFriends(formattedFriends.filter(f => f.username.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setFriends(formattedFriends);
    }
  }

  async function fetchRequests(userId: string) {
    // 1. Demandes Reçues (Je suis le friend_id)
    const { data: incoming, error: inError } = await supabase
      .from('friendships')
      .select(`
        id,
        user:profiles!friendships_user_id_fkey(id, username, avatar_url),
        created_at
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (inError) throw inError;
    setIncomingRequests(incoming || []);

    // 2. Demandes Envoyées (Je suis le user_id)
    const { data: outgoing, error: outError } = await supabase
      .from('friendships')
      .select(`
        id,
        friend:profiles!friendships_friend_id_fkey(id, username, avatar_url),
        created_at
      `)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (outError) throw outError;
    setOutgoingRequests(outgoing || []);
  }

  async function fetchSuggestions(userId: string) {
    const { data: relations } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    const excludedUserIds = new Set<string>([userId]);
    relations?.forEach((r: any) => {
      excludedUserIds.add(r.user_id);
      excludedUserIds.add(r.friend_id);
    });

    let query = supabase.from('profiles').select('id, username, avatar_url');
    if (searchQuery.trim()) {
      query = query.ilike('username', `%${searchQuery.trim()}%`);
    }

    const { data: profiles, error } = await query.limit(15);
    if (error) throw error;

    const filteredSuggestions = (profiles || []).filter((p: any) => !excludedUserIds.has(p.id));
    setSuggestions(filteredSuggestions);
  }

  async function handleAddFriend(receiverId: string) {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from('friendships')
        .insert([{ user_id: currentUserId, friend_id: receiverId, status: 'pending' }]);
      if (error) throw error;
      Alert.alert('Envoyé', 'Demande d’ami envoyée !');
      fetchSuggestions(currentUserId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }

  async function handleAcceptRequest(friendshipId: string) {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      if (error) throw error;
      if (currentUserId) fetchRequests(currentUserId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }

  async function handleDeclineRequest(friendshipId: string) {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      if (error) throw error;
      if (currentUserId) fetchRequests(currentUserId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }

  return (
    <LinearGradient colors={['#E5F0ED', '#F5F3EB']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Text style={styles.topLogo}>EventSnap <Text style={{fontWeight: '400', fontSize: 20}}>Social</Text></Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => initSocial()}>
            <Ionicons name="refresh-outline" size={20} color="#335C58" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <Feather name="search" size={18} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un pseudo..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabBarContainer}>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'friends' && styles.tabItemActive]} onPress={() => setActiveTab('friends')}>
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Mes Amis</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'requests' && styles.tabItemActive]} onPress={() => setActiveTab('requests')}>
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>Demandes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'suggestions' && styles.tabItemActive]} onPress={() => setActiveTab('suggestions')}>
            <Text style={[styles.tabText, activeTab === 'suggestions' && styles.tabTextActive]}>Découvrir</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color="#335C58" style={{ marginTop: 40 }} />
          ) : (
            <>
              {activeTab === 'friends' && (
                friends.length === 0 ? <Text style={styles.emptyText}>Aucun ami trouvé.</Text> :
                friends.map(friend => (
                  <View key={friend.id} style={styles.userCard}>
                    {friend.avatar_url ? <Image source={{ uri: friend.avatar_url }} style={styles.avatarImage} /> : <View style={styles.avatarPlaceholder}><Feather name="user" size={20} color="#335C58" /></View>}
                    <View style={styles.userInfo}>
                      <Text style={styles.usernameText}>{friend.username || 'Utilisateur'}</Text>
                      <Text style={styles.subText}>@{friend.username?.toLowerCase()}_lens</Text>
                    </View>
                    <TouchableOpacity style={styles.actionBtnOutline}><Feather name="message-square" size={16} color="#335C58" /></TouchableOpacity>
                  </View>
                ))
              )}

              {activeTab === 'requests' && (
                incomingRequests.length === 0 && outgoingRequests.length === 0 ? <Text style={styles.emptyText}>Aucune demande en attente.</Text> :
                <>
                  {incomingRequests.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={styles.sectionSubTitle}>Demandes reçues</Text>
                      {incomingRequests.map(req => (
                        <View key={req.id} style={[styles.userCard, styles.accentLeftBorder]}>
                          {req.user?.avatar_url ? <Image source={{ uri: req.user.avatar_url }} style={styles.avatarImage} /> : <View style={styles.avatarPlaceholder}><Feather name="user" size={20} color="#335C58" /></View>}
                          <View style={styles.userInfo}>
                            <Text style={styles.usernameText}>{req.user?.username || 'Anonyme'}</Text>
                            <Text style={styles.subText}>Te demande en ami</Text>
                          </View>
                          <View style={styles.actionsContainer}>
                            <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineRequest(req.id)}><Feather name="x" size={16} color="#D9534F" /></TouchableOpacity>
                            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req.id)}><Feather name="check" size={16} color="#FFF" /></TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {outgoingRequests.length > 0 && (
                    <View>
                      <Text style={styles.sectionSubTitle}>Demandes envoyées</Text>
                      {outgoingRequests.map(req => (
                        <View key={req.id} style={styles.userCard}>
                          {req.friend?.avatar_url ? <Image source={{ uri: req.friend.avatar_url }} style={styles.avatarImage} /> : <View style={styles.avatarPlaceholder}><Feather name="user" size={20} color="#335C58" /></View>}
                          <View style={styles.userInfo}>
                            <Text style={styles.usernameText}>{req.friend?.username || 'Anonyme'}</Text>
                            <Text style={styles.subText}>En attente de validation...</Text>
                          </View>
                          <View style={styles.actionsContainer}>
                            <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineRequest(req.id)}><Feather name="x" size={16} color="#D9534F" /></TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {activeTab === 'suggestions' && (
                suggestions.length === 0 ? <Text style={styles.emptyText}>Aucun nouveau profil disponible.</Text> :
                suggestions.map(sug => (
                  <View key={sug.id} style={styles.userCard}>
                    {sug.avatar_url ? <Image source={{ uri: sug.avatar_url }} style={styles.avatarImage} /> : <View style={styles.avatarPlaceholder}><Feather name="user" size={20} color="#335C58" /></View>}
                    <View style={styles.userInfo}>
                      <Text style={styles.usernameText}>{sug.username || 'Anonyme'}</Text>
                      <Text style={styles.subText}>Membre EventSnap</Text>
                    </View>
                    <TouchableOpacity style={styles.primaryActionBtn} onPress={() => handleAddFriend(sug.id)}>
                      <Feather name="user-plus" size={14} color="#FFF" style={{ marginRight: 6 }} /><Text style={styles.btnText}>Ajouter</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { 
    flex: 1, 
    marginTop: Platform.OS === 'ios' ? 12 : 36, 
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, marginBottom: 16 },
  topLogo: { fontSize: 22, fontWeight: '800', color: '#335C58' },
  iconButton: { backgroundColor: '#FFFFFF', padding: 8, borderRadius: 12, elevation: 2 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, paddingHorizontal: 16, height: 46, borderRadius: 14, marginBottom: 20, elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  tabBarContainer: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#E8E5DC', marginBottom: 16, marginHorizontal: 20 },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 3, borderBottomColor: '#EF6C4A', marginBottom: -2 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#888' },
  tabTextActive: { color: '#1A1A1A' },
  userCard: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 12, elevation: 2 },
  accentLeftBorder: { borderLeftWidth: 4, borderLeftColor: '#335C58', borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5F0ED', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarImage: { width: 44, height: 44, borderRadius: 22, marginRight: 14, borderWidth: 1, borderColor: '#E8E5DC' },
  userInfo: { flex: 1 },
  usernameText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  subText: { fontSize: 12, color: '#666', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 40, fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  acceptBtn: { backgroundColor: '#335C58', width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  declineBtn: { backgroundColor: '#FCEBEA', width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  primaryActionBtn: { backgroundColor: '#EF6C4A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, borderRadius: 10 },
  actionBtnOutline: { borderWidth: 1.5, borderColor: '#335C58', width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  sectionSubTitle: { fontSize: 12, fontWeight: '800', color: '#335C58', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4 },
});