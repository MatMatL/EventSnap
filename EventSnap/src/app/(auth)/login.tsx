import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, ActivityIndicator } from 'react-native';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn() {
    setErrorMessage(null);
    
    if (!email.trim() || !password) {
      setErrorMessage("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });
    
    if (error) {
      setLoading(false);
      if (error.message === 'Invalid login credentials') {
        setErrorMessage("E-mail ou mot de passe incorrect.");
      } else if (error.message.includes('Email not confirmed')) {
        setErrorMessage("Veuillez confirmer votre adresse e-mail avant de continuer.");
      } else {
        setErrorMessage(error.message);
      }
    } else {
      setLoading(false);
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
          <Text style={styles.subtitle}>S'AUTHENTIFIER</Text>
        </View>

        <View style={styles.card}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADRESSE EMAIL</Text>
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

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>MOT DE PASSE</Text>
              <Text style={styles.forgotPassword}>OUBLIÉ ?</Text>
            </View>
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

          {/* Message d'erreur intégré au-dessus du bouton */}
          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          {/* Bouton Connexion */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pas encore de compte ?{' '}
            <Text style={styles.footerLink} onPress={() => router.push('/register' as any)}>
              S'inscrire
            </Text>
          </Text>
        </View>

        <Text style={styles.copyright}>© 2026 EVENTSNAP INTERACTIVE</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

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
  errorText: { color: '#D9534F', fontSize: 13, textAlign: 'center', marginBottom: 15, fontWeight: '600' },
  footer: { marginTop: 30 },
  footerText: { fontSize: 14, color: '#555' },
  footerLink: { color: '#335C58', fontWeight: '700' },
  copyright: { position: 'absolute', bottom: 20, fontFamily: 'Courier', fontSize: 10, color: '#888' }
});