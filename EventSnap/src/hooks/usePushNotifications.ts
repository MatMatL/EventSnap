import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  clearPushTokenFromProfile,
  getRouteFromNotificationData,
  registerForPushNotifications,
  savePushTokenToProfile,
  type PushNotificationData,
} from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';

export function usePushNotifications(isAuthenticated: boolean) {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web') return;

    let cancelled = false;

    async function setupPush() {
      try {
        const token = await registerForPushNotifications();
        if (!cancelled && token) {
          await savePushTokenToProfile(token);
        }
      } catch (error) {
        console.warn('Push registration failed:', error);
      }
    }

    setupPush();

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushNotificationData;
      const route = getRouteFromNotificationData(data);
      if (route) {
        router.push(route as any);
      }
    });

    return () => {
      cancelled = true;
      responseListener.current?.remove();
    };
  }, [isAuthenticated, router]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && Platform.OS !== 'web') {
        clearPushTokenFromProfile().catch(console.warn);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}
