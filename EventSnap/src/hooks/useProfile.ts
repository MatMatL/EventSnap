import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Profile = {
  username: string;
  avatar_url: string | null;
};

type UseProfileResult = {
  profile: Profile | null;
  loading: boolean;
};

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();

    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading };
}
