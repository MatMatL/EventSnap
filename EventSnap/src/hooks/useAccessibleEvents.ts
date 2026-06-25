import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types/event';

type UseAccessibleEventsResult = {
  events: Event[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAccessibleEvents(): UseAccessibleEventsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('events')
      .select(
        'id, name, latitude, longitude, location_label, event_date, expires_at, host_id',
      )
      .order('event_date', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setEvents([]);
    } else {
      setEvents(data ?? []);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  useEffect(() => {
    if (attempt === 0) return;
    fetchEvents();
  }, [attempt, fetchEvents]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);

  return { events, loading, error, refetch };
}
