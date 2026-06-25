import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    // Validation du format du pseudo (3-30 caractères, lettres, chiffres, _)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      Alert.alert('Pseudo invalide', 'Le pseudo doit faire entre 3 et 30 caractères (lettres, chiffres et _ uniquement).');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
          }
        }
      });

      if (error) {
        setLoading(false);
        if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
          Alert.alert('Serveur saturé', 'Limite de mails atteinte. Désactivez bien "Confirm email" tout en bas de Supabase.');
        } else {
          Alert.alert('Erreur d\'inscription', error.message);
        }
        return;
      }

      setLoading(false);
      
      // Si "Confirm email" est bien désactivé en bas dans Supabase, data.session existera immédiatement
      if (data?.session) {
        Alert.alert('Compte créé !', 'Bienvenue sur EventSnap.', [
          { text: 'Continuer', onPress: () => router.replace('/' as any) }
        ]);
      } else {
        Alert.alert('Vérification requise', 'Un mail vous a été envoyé. Si vous êtes en local, désactivez "Confirm email" dans Supabase.', [
          { text: 'OK', onPress: () => router.replace('/login' as any) }
        ]);
      }

    } catch (err) {
      setLoading(false);
      console.error("💥 Crash handleSignUp :", err);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    }
  }

  return (
    <LinearGradient colors={['#E5F0ED', '#F5F3EB']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.topBar}>
          <Text style={styles.topLogo}>EventSnap</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez EventSnap et commencez à capturer vos événements.</Text>

          {/* Nom d'utilisateur (Pseudo indispensable pour le Trigger SQL) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom d'utilisateur</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={18} color="#A0A0A0" style={styles.iconLeft} />
              <TextInput 
                placeholder="Mon_Pseudo" 
                placeholderTextColor="#A0A0A0" 
                style={styles.input} 
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse Email</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={18} color="#A0A0A0" style={styles.iconLeft} />
              <TextInput 
                placeholder="exemple@mail.com" 
                placeholderTextColor="#A0A0A0" 
                style={styles.input} 
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color="#A0A0A0" style={styles.iconLeft} />
              <TextInput 
                placeholder="••••••••" 
                placeholderTextColor="#A0A0A0" 
                style={styles.input} 
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {/* Confirmation */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Feather name="shield" size={18} color="#A0A0A0" style={styles.iconLeft} />
              <TextInput 
                placeholder="••••••••" 
                placeholderTextColor="#A0A0A0" 
                style={styles.input} 
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {/* Bouton d'action */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>S'inscrire</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Déjà inscrit ?{' '}
            <Text style={styles.footerLink} onPress={() => router.push('/login' as any)}>
              Se connecter
            </Text>
          </Text>
        </View>
        
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  topBar: { marginBottom: 15 },
  topLogo: { fontSize: 24, fontWeight: '800', color: '#335C58' },
  card: {
    backgroundColor: '#FFFFFF',
    width: width > 400 ? 360 : '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  label: { fontFamily: 'Courier', fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  iconLeft: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  primaryButton: {
    backgroundColor: '#335C58',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    borderRadius: 26,
    marginTop: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer: { marginTop: 24 },
  footerText: { fontSize: 14, color: '#555' },
  footerLink: { color: '#335C58', fontWeight: '700' }
});