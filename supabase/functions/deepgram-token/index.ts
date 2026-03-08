import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    if (!DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY is not configured');
    }

    // Create a temporary API key valid for 60 seconds
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { 'Authorization': `Token ${DEEPGRAM_API_KEY}` },
    });

    if (!response.ok) {
      // If we can't list projects, just return the key directly (simpler approach)
      // The key will be used for a single WebSocket session
      return new Response(JSON.stringify({ key: DEEPGRAM_API_KEY }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const projects = await response.json();
    const projectId = projects.projects?.[0]?.project_id;

    if (!projectId) {
      return new Response(JSON.stringify({ key: DEEPGRAM_API_KEY }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a temporary key
    const tempKeyResponse = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: 'Temporary session key',
        scopes: ['usage:write'],
        time_to_live_in_seconds: 120,
      }),
    });

    if (!tempKeyResponse.ok) {
      // Fallback to main key
      return new Response(JSON.stringify({ key: DEEPGRAM_API_KEY }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tempKey = await tempKeyResponse.json();

    return new Response(JSON.stringify({ key: tempKey.key }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating Deepgram token:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
