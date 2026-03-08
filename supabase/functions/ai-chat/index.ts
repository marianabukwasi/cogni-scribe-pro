import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { messages, profession, specialty, country, transcript, clientHistory, selectedItems, knowledgeBaseItems } = await req.json();

    const systemPrompt = `You are a specialist AI assistant for a ${profession || 'professional'} professional${specialty ? ` specialising in ${specialty}` : ''} practising in ${country || 'their country'}. You have access to:
1. The full transcript of the current session
2. The client's history from previous sessions
3. The professional's personal knowledge base
4. The generation basket (what the professional has selected)

Answer questions concisely and accurately. When drafting documents, produce professional-quality text ready to use. Always note when something requires clinical or professional judgment. Knowledge base content takes priority over general knowledge.`;

    const contextMessage = `CONTEXT:
${knowledgeBaseItems ? `KNOWLEDGE BASE:\n${JSON.stringify(knowledgeBaseItems)}\n` : ''}
SESSION TRANSCRIPT:
${transcript || 'No transcript available.'}
${clientHistory ? `CLIENT HISTORY:\n${JSON.stringify(clientHistory)}` : ''}
${selectedItems ? `GENERATION BASKET:\n${JSON.stringify(selectedItems)}` : ''}`;

    // Build messages array with context as first user message
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextMessage },
      { role: 'assistant', content: 'I have full context from this session and your knowledge base. How can I help?' },
      ...(messages || []),
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('ai-chat error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
