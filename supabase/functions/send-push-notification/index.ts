import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type NotificationRecord = {
  id: string;
  user_id: string;
  event_id: string | null;
  message: string;
  type: string;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: NotificationRecord;
};

const TITLE_BY_TYPE: Record<string, string> = {
  event_invitation: 'Nouvelle invitation',
  new_photo: 'Nouvelle photo live',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = (await req.json()) as WebhookPayload | NotificationRecord;
    const record = 'record' in payload && payload.record ? payload.record : (payload as NotificationRecord);

    if (!record?.user_id || !record?.message) {
      return new Response(JSON.stringify({ error: 'Payload invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', record.user_id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile?.expo_push_token) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_push_token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: TITLE_BY_TYPE[record.type] ?? 'EventSnap',
        body: record.message,
        sound: 'default',
        data: {
          notification_id: record.id,
          type: record.type,
          event_id: record.event_id,
        },
      }),
    });

    const pushResult = await pushResponse.json();

    if (!pushResponse.ok) {
      console.error('Expo push error:', pushResult);
      return new Response(JSON.stringify({ error: 'Expo push failed', details: pushResult }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, push: pushResult }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
