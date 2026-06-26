import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';

/**
 * Retour arrière sécurisé : si la pile est vide (ex. après router.replace
 * depuis la création d'événement), redirige vers une route de repli.
 */
export function useSafeBack(fallback: Href = '/(tabs)/events') {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }, [router, fallback]);
}
