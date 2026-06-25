import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignIn() {
    // 1. Validation locale simple avant l'appel API
    if (!email.trim() || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir votre e-mail et votre mot de passe.');
      return;
    }

    setLoading(true);
    
    // 2. Tentative de connexion
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });

    setLoading(false);

    if (error) {
      // 3. Gestion des erreurs spécifiques de Supabase
      let errorMessage = "Une erreur est survenue lors de la connexion.";
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "E-mail ou mot de passe incorrect.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Veuillez confirmer votre adresse e-mail avant de vous connecter.";
      } else {
        errorMessage = error.message; // Affiche le message brut si spécifique
      }
      
      Alert.alert('Erreur de connexion', errorMessage);
    } else {
      // Succès
      router.replace('/(tabs)');
    }
  }

  return (
    <LinearGradient colors={['#E3EAE5', '#F5F3EB']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.cameraIconWrapper}>
            <Feather name="camera" size={24} color="#335C58" />
          </View>
          <Text style={styles.logo}>EventSnap</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput 
                placeholder="exemple@eventsnap.com"
                placeholderTextColor="#A0A0A0"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <TextInput 
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                style={styles.input}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#A0A0A0" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Se connecter</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pas encore de compte ? <Text style={styles.footerLink} onPress={() => router.push('/register')}>S'inscrire</Text>
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}


// Conservation de vos styles d'origine
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  cameraIconWrapper: { backgroundColor: '#D1DBD7', padding: 12, borderRadius: 12, marginBottom: 16 },
  logo: { fontSize: 40, fontWeight: '800', color: '#335C58', letterSpacing: -1 },
  subtitle: { fontSize: 11, fontFamily: 'Courier', fontWeight: '600', color: '#555', marginTop: 4, letterSpacing: 1.5 },
  card: {
    backgroundColor: '#FFFFFF',
    width: width > 400 ? 360 : '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: 'Courier', fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 8 },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotPassword: { fontFamily: 'Courier', fontSize: 12, fontWeight: '700', color: '#335C58' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F2EB',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  input: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  primaryButton: {
    backgroundColor: '#335C58',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    marginTop: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer: { marginTop: 30 },
  footerText: { fontSize: 14, color: '#555' },
  footerLink: { color: '#335C58', fontWeight: '700' },
  copyright: { position: 'absolute', bottom: 20, fontFamily: 'Courier', fontSize: 10, color: '#888' }
});