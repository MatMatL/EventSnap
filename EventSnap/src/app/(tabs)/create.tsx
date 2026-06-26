import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCreateEvent, TTL_OPTIONS } from '../../hooks/use-create-event';

const COLORS = {
  bgGradientStart: '#E5F0ED',
  bgGradientEnd: '#F5F3EB',
  teal: '#335C58',
  tealLight: '#2BA8A2',
  yellow: '#FFD23F',
  coral: '#EF6C4A',
  white: '#FFFFFF',
  border: '#E8E5DC',
  inputBg: '#F4F2EB',
  muted: '#888888',
  dark: '#1A1A1A',
};

// ─── Composants Internes de Formulaire ───────────────────────────────────────

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Feather name={icon as any} size={15} color={COLORS.teal} />
      <Text style={styles.sectionTitleText}>{label}</Text>
    </View>
  );
}

function InputLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function CreateEventScreen() {
  const router = useRouter();
  const { form, updateField, detectLocation, submit, loading, locating, error } = useCreateEvent();

  const [dateText, setDateText] = useState(() => {
    const d = form.eventDate;
    return formatDateForInput(d);
  });
  const [dateError, setDateError] = useState<string | null>(null);

  function formatDateForInput(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function handleDateChange(text: string) {
    setDateText(text);
    const parsed = new Date(text.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) {
      setDateError('Format attendu : AAAA-MM-JJ HH:MM');
    } else if (parsed <= new Date()) {
      setDateError('La date doit être dans le futur.');
    } else {
      setDateError(null);
      updateField('eventDate', parsed);
    }
  }

  async function handleSubmit() {
    if (dateError) {
      Alert.alert('Date invalide', dateError);
      return;
    }
    const id = await submit();
    if (id) {
      router.replace(`/event/${id}` as any);
    }
  }

  const expiresAt = new Date(form.eventDate.getTime() + form.ttlHours * 60 * 60 * 1000);
  const expiresLabel = expiresAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          
          {/* Header Harmonisé */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={20} color={COLORS.teal} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                EventSnap <Text style={{ fontWeight: '400', fontSize: 22 }}>Création</Text>
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Bannière Erreur */}
            {error && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={COLORS.coral} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Section 1 : Infos Générales */}
            <View style={styles.card}>
              <SectionTitle icon="info" label="Informations générales" />

              <InputLabel>Nom de l'événement *</InputLabel>
              <View style={[styles.inputWrapper, !form.name && styles.inputRequired]}>
                <TextInput
                  style={styles.input}
                  placeholder="Ex : Soirée plage, Randonnée forêt…"
                  placeholderTextColor={COLORS.muted}
                  value={form.name}
                  onChangeText={(v) => updateField('name', v)}
                  maxLength={120}
                  returnKeyType="next"
                />
                <Text style={styles.charCount}>{form.name.length}/120</Text>
              </View>

              <InputLabel>Description</InputLabel>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Décris la sortie, le programme, les éléments à prévoir…"
                  placeholderTextColor={COLORS.muted}
                  value={form.description}
                  onChangeText={(v) => updateField('description', v)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Section 2 : Localisation */}
            <View style={styles.card}>
              <SectionTitle icon="map-pin" label="Localisation" />

              <TouchableOpacity
                style={[styles.geoButton, locating && styles.geoButtonDisabled]}
                onPress={detectLocation}
                disabled={locating}
              >
                {locating ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Feather name="crosshair" size={16} color={COLORS.white} />
                )}
                <Text style={styles.geoButtonText}>
                  {locating ? 'Détection en cours…' : 'Détecter ma position'}
                </Text>
              </TouchableOpacity>

              {form.latitude !== null && (
                <View style={styles.locationBadge}>
                  <Feather name="check-circle" size={14} color={COLORS.tealLight} />
                  <Text style={styles.locationBadgeText} numberOfLines={2}>
                    {form.locationLabel || `${form.latitude.toFixed(5)}, ${form.longitude?.toFixed(5)}`}
                  </Text>
                </View>
              )}

              <InputLabel>Préciser le lieu (optionnel)</InputLabel>
              <View style={styles.inputWrapper}>
                <Feather name="map-pin" size={15} color={COLORS.muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex : Parc de la Tête d'Or, Lyon"
                  placeholderTextColor={COLORS.muted}
                  value={form.locationLabel || ''}
                  onChangeText={(v) => updateField('locationLabel', v)}
                />
              </View>
            </View>

            {/* Section 3 : Date & Durée */}
            <View style={styles.card}>
              <SectionTitle icon="clock" label="Date & durée de vie" />

              <InputLabel>Date de l'événement *</InputLabel>
              <View style={[styles.inputWrapper, dateError ? styles.inputError : undefined]}>
                <Feather name="calendar" size={15} color={COLORS.muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="AAAA-MM-JJ HH:MM"
                  placeholderTextColor={COLORS.muted}
                  value={dateText}
                  onChangeText={handleDateChange}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              {dateError && <Text style={styles.fieldError}>{dateError}</Text>}

              <InputLabel>Durée de vie de la galerie</InputLabel>
              <View style={styles.ttlRow}>
                {TTL_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.hours}
                    style={[styles.ttlChip, form.ttlHours === opt.hours && styles.ttlChipActive]}
                    onPress={() => updateField('ttlHours', opt.hours)}
                  >
                    <Text style={[styles.ttlChipText, form.ttlHours === opt.hours && styles.ttlChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.expiryInfo}>
                <Feather name="clock" size={12} color={COLORS.muted} />
                <Text style={styles.expiryInfoText}>
                  La galerie expirera le <Text style={styles.expiryDate}>{expiresLabel}</Text>
                </Text>
              </View>
            </View>

            {/* Bouton de Soumission */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.teal} size="small" />
              ) : (
                <>
                  <Feather name="plus-circle" size={18} color={COLORS.teal} style={{ marginRight: 6 }} />
                  <Text style={styles.submitButtonText}>Créer l'événement</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.requiredNote}>* Champs obligatoires</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles Harmonisés (Sans aucune régression fonctionnelle) ────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 12 : 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.teal,
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    borderWidth: 1,
    borderColor: '#FFCDC0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: COLORS.coral,
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputRequired: {
    borderColor: '#E8D5B0',
  },
  inputError: {
    borderColor: COLORS.coral,
    backgroundColor: '#FFF6F4',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.muted,
    marginLeft: 4,
    fontWeight: '600',
  },
  fieldError: {
    fontSize: 12,
    color: COLORS.coral,
    marginTop: -4,
    fontWeight: '600',
  },
  geoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  geoButtonDisabled: {
    opacity: 0.6,
  },
  geoButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E5F0ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  locationBadgeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.teal,
    fontWeight: '600',
  },
  ttlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ttlChip: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  ttlChipActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  ttlChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  ttlChipTextActive: {
    color: COLORS.white,
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  expiryInfoText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  expiryDate: {
    fontWeight: '700',
    color: COLORS.teal,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
    borderRadius: 20,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.teal,
  },
  requiredNote: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
});