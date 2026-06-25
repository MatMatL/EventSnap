import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

export default function SocialScreen() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // États pour les données réelles de la DB
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
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
        await fetchIncomingRequests(user.id);
      } else if (activeTab === 'suggestions') {
        await fetchSuggestions(user.id);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  }

  // 1. LIRE LES AMIS RÉELS (Statut: 'accepted')
  async function fetchFriends(userId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        sender:profiles!friendships_sender_id_fkey(id, username, avatar_url),
        receiver:profiles!friendships_receiver_id_fkey(id, username, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) throw error;

    // Filtrer pour obtenir le profil de l'ami et non le sien
    const formattedFriends = data.map((f: any) => {
      return f.sender.id === userId ? f.receiver : f.sender;
    });

    // Appliquer le filtre de recherche textuelle si nécessaire
    if (searchQuery.trim()) {
      setFriends(formattedFriends.filter(f => f.username.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setFriends(formattedFriends);
    }
  }

  // 2. LIRE LES DEMANDES REÇUES (Statut: 'pending' et destinataire = moi)
  async function fetchIncomingRequests(userId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        sender:profiles!friendships_sender_id_fkey(id, username, avatar_url),
        created_at
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    setRequests(data || []);
  }

  // 3. RECHERCHE GLOBALE / SUGGESTIONS (Profils qui ne sont pas encore en relation avec moi)
  async function fetchSuggestions(userId: string) {
    // Récupérer d'abord toutes mes relations existantes (Amis ou Demandes en cours)
    const { data: relations } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    const excludedUserIds = new Set<string>([userId]);
    relations?.forEach((r: any) => {
      excludedUserIds.add(r.sender_id);
      excludedUserIds.add(r.receiver_id);
    });

    let query = supabase.from('profiles').select('id, username, avatar_url');

    if (searchQuery.trim()) {
      // Si l'utilisateur tape une recherche
      query = query.ilike('username', `%${searchQuery.trim()}%`);
    }

    const { data: profiles, error } = await query.limit(15);
    if (error) throw error;

    // Filtrer les profils pour exclure soi-même et les relations déjà existantes
    const filteredSuggestions = (profiles || []).filter((p: any) => !excludedUserIds.has(p.id));
    setSuggestions(filteredSuggestions);
  }

  // ACTION : ENVOYER UNE DEMANDE D'AMI
  async function handleAddFriend(receiverId: string) {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from('friendships')
        .insert([{ sender_id: currentUserId, receiver_id: receiverId, status: 'pending' }]);

      if (error) throw error;
      Alert.alert('Envoyé', 'Demande d’ami envoyée !');
      fetchSuggestions(currentUserId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }

  // ACTION : ACCEPTER UNE DEMANDE D'AMI
  async function handleAcceptRequest(friendshipId: string) {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      Alert.alert('Succès', 'Demande acceptée !');
      if (currentUserId) fetchIncomingRequests(currentUserId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }

  // ACTION : REFUSER OU SUPPRIMER UNE RELATION
  async function handleDeclineRequest(friendshipId: string) {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      if (currentUserId) fetchIncomingRequests(currentUserId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }

  return (
    <LinearGradient colors={['#E5F0ED', '#F5F3EB']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header de la page */}
        <View style={styles.topBar}>
          <Text style={styles.topLogo}>EventSnap <Text style={{fontWeight: '400', fontSize: 20}}>Social</Text></Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => initSocial()}>
            <Ionicons name="refresh-outline" size={20} color="#335C58" />
          </TouchableOpacity>
        </View>

        {/* Barre de Recherche Dynamique */}
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

        {/* Barre des Onglets (DA Maquette Uniformisée) */}
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

        {/* Liste défilante principale */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color="#335C58" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ONGLET 1 : LISTE D'AMIS */}
              {activeTab === 'friends' && (
                friends.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun ami trouvé.</Text>
                ) : (
                  friends.map(friend => (
                    <View key={friend.id} style={styles.userCard}>
                      {friend.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <View style={styles.avatarPlaceholder}><Feather name="user" size={20} color="#335C58" /></View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.usernameText}>{friend.username || 'Utilisateur'}</Text>
                        <Text style={styles.subText}>@{friend.username?.toLowerCase()}_lens</Text>
                      </View>
                      <TouchableOpacity style={styles.actionBtnOutline}>
                        <Feather name="message-square" size={16} color="#335C58" />
                      </TouchableOpacity>
                    </View>
                  ))
                )
              )}

              {/* ONGLET 2 : DEMANDES REÇUES */}
              {activeTab === 'requests' && (
                requests.length === 0 ? (
                  <Text style={styles.emptyText}>Aucune demande en attente.</Text>
                ) : (
                  requests.map(req => (
                    <View key={req.id} style={[styles.userCard, styles.accentLeftBorder]}>
                      {req.sender?.avatar_url ? (
                        <Image source={{ uri: req.sender.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <View style={styles.avatarPlaceholder}><Feather name="user" size={20} color="#335C58" /></View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.usernameText}>{req.sender?.username || 'Anonyme'}</Text>
                        <Text style={styles.subText}>Te demande en ami</Text>
                      </View>
                      <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineRequest(req.id)}>
                          <Feather name="x" size={16} color="#D9534F" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req.id)}>
                          <Feather name="check" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )
              )}

              {/* ONGLET 3 : RECHERCHE GLOBALE ET SUGGESTIONS */}
              {activeTab === 'suggestions' && (
                suggestions.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun nouveau profil disponible.</Text>
                ) : (
                  suggestions.map(sug => (
                    <View key={sug.id} style={styles.userCard}>
                      {sug.avatar_url ? (
                        <Image source={{ uri: sug.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <View style={styles.avatarPlaceholder}><Feather name="user" size={20} color="#335C58" /></View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.usernameText}>{sug.username || 'Anonyme'}</Text>
                        <Text style={styles.subText}>Membre EventSnap</Text>
                      </View>
                      <TouchableOpacity style={styles.primaryActionBtn} onPress={() => handleAddFriend(sug.id)}>
                        <Feather name="user-plus" size={14} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.btnText}>Ajouter</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )
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
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, marginBottom: 16 },
  topLogo: { fontSize: 22, fontWeight: '800', color: '#335C58' },
  iconButton: { backgroundColor: '#FFFFFF', padding: 8, borderRadius: 12, boxShadow: '0px 2px 6px rgba(0,0,0,0.04)' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, paddingHorizontal: 16, height: 46, borderRadius: 14, marginBottom: 20, boxShadow: '0px 2px 6px rgba(0,0,0,0.02)' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  tabBarContainer: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#E8E5DC', marginBottom: 16, marginHorizontal: 20 },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 3, borderBottomColor: '#EF6C4A', marginBottom: -2 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#888' },
  tabTextActive: { color: '#1A1A1A' },
  userCard: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 12, boxShadow: '0px 4px 10px rgba(0,0,0,0.02)' },
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
  btnText: { color: '#FFF', fontSize: 12, fontWeight: '700' }
});