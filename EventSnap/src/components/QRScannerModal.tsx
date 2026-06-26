import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const COLORS = {
  teal: '#335C58',
  tealLight: '#2BA8A2',
  coral: '#EF6C4A',
  yellow: '#FFD23F',
  white: '#FFFFFF',
  muted: '#A0A0A0',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onJoined: (eventId: string) => void;
};

export default function QRScannerModal({ visible, onClose, onJoined }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const lockRef = useRef(false);
  const insets = useSafeAreaInsets();

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 20) + 8;

  async function handleScanned({ data }: { data: string }) {
    if (lockRef.current) return;
    lockRef.current = true;
    setScanned(true);

    try {
      const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
      const match = data.match(uuidPattern);
      const eventId = match?.[1];

      if (!eventId) {
        Alert.alert('QR invalide', 'Ce code ne correspond pas à un événement valide.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        Alert.alert('Erreur', 'Vous devez être connecté.');
        return;
      }

      const { data: ev, error: evError } = await supabase
        .from('events')
        .select('id, name, expires_at')
        .eq('id', eventId)
        .single();

      if (evError || !ev) {
        Alert.alert('Erreur', 'Événement introuvable.');
        return;
      }

      if (new Date(ev.expires_at) <= new Date()) {
        Alert.alert('Événement expiré', 'Cet événement n\'accepte plus de nouveaux membres.');
        return;
      }

      const { data: existing } = await supabase
        .from('members')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase.from('members').insert({
          event_id: eventId,
          user_id: userId,
          role: 'guest',
        });
        if (insertError) throw insertError;
      }

      onJoined(eventId);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur s\'est produite.');
      lockRef.current = false;
      setScanned(false);
    }
  }

 return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>

        <View style={[styles.header, { paddingTop: topPadding }]}>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={18} color={COLORS.white} />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Scanner un QR code
          </Text>

          <View style={styles.headerActions}>
            {permission?.granted && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
        </View>

        {/* Corps */}
        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator color={COLORS.white} size="large" />
          </View>
        ) : !permission.granted ? (
          <View style={styles.centeredLight}>
            <Feather name="camera" size={48} color={COLORS.teal} style={{ marginBottom: 16 }} />
            <Text style={styles.permText}>Accès caméra requis</Text>
            <Text style={styles.permSubText}>
              Autorise la caméra pour scanner le QR code de l'événement.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Autoriser la caméra</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleScanned}
            />

            <View style={styles.frameOverlay} pointerEvents="none">
              <View style={styles.darkOverlay} />
              <View style={styles.frameContainer}>
                <View style={styles.frameBorder} />
                <Text style={styles.frameLabel}>Alignez le QR code</Text>
              </View>
              <View style={styles.darkOverlay} />
            </View>

            <View style={styles.hintContainer}>
              <Feather name="info" size={14} color="#fff" />
              <Text style={styles.hintText}>Demande à l'hôte de te montrer le code</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // ── Header (même structure que event/[id].tsx) ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#000',
  },
  iconButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 9,
    borderRadius: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 38, // équilibre visuel avec le bouton close à gauche
    justifyContent: 'flex-end',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 108, 74, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.coral,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.coral,
    letterSpacing: 0.5,
  },

  // ── États de chargement / permission ──
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  centeredLight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: '#F5F3EB',
  },
  permText: { color: '#1A1A1A', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  permSubText: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  permBtn: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Overlay de scan ──
  frameOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  darkOverlay: { flex: 1, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)' },
  frameContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', height: 260 },
  frameBorder: { width: 240, height: 240, borderWidth: 2, borderColor: COLORS.yellow, borderRadius: 20 },
  frameLabel: { color: COLORS.yellow, fontSize: 12, fontWeight: '600', marginTop: 12, letterSpacing: 0.3 },

  hintContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  hintText: { color: '#fff', fontSize: 12, fontWeight: '500' },
});