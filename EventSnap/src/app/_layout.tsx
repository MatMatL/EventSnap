import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, Slot } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <Slot />;
}