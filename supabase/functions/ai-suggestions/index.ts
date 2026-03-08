import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const systemPrompts: Record<string, string> = {
  medical: `You are a specialist clinical AI assistant for medical professionals. You have deep knowledge of conditions, medications, dosages, drug interactions, treatment guidelines, and referral pathways. Analyse the transcript and return JSON with: diagnoses (array of {name, detail, confidence: "high"/"medium"/"low"}), medications (array of {name, detail, dosage}), alternatives (array of {name, detail}), warnings (string array), nextSteps (array of {name, detail}). Return ONLY valid JSON. No markdown.`,
  legal: `You are a legal AI assistant. Analyse the transcript and return JSON with: assessments (array of {name, detail, confidence: "high"/"medium"/"low"}), strategies (array of {name, detail}), documentsNeeded (array of {name, detail}), warnings (string array), nextSteps (array of {name, detail}). Return ONLY valid JSON. No markdown.`,
  ngo: `You are an asylum and social support AI assistant. Analyse the transcript and return JSON with: statusAssessment (array of {name, detail, confidence: "high"/"medium"/"low"}), immediateNeeds (array of {name, detail}), serviceReferrals (array of {name, detail}), warnings (string array), nextSteps (array of {name, detail}). Return ONLY valid JSON. No markdown.`,
  therapy: `You are a clinical psychology AI assistant. Analyse the transcript and return JSON with: diagnoses (array of {name, detail, confidence: "high"/"medium"/"low"}), therapeuticApproaches (array of {name, detail}), alternatives (array of {name, detail}), warnings (string array), nextSteps (array of {name, detail}). Return ONLY valid JSON. No markdown.`,
  generic: `You are a professional AI assistant. Analyse the transcript and return JSON with: assessments (array of {name, detail, confidence: "high"/"medium"/"low"}), actions (array of {name, detail}), alternatives (array of {name, detail}), warnings (string array), nextSteps (array of {name, detail}). Return ONLY valid JSON. No markdown.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { profession, specialty, country, transcript, professionKey } = await req.json();

    const pk = professionKey || 'generic';
    const systemPrompt = systemPrompts[pk] || systemPrompts.generic;

    const userMessage = `Professional: ${profession || 'Professional'}, Specialty: ${specialty || 'General'}, Country: ${country || 'Not specified'}

Current session transcript so far:
${transcript || 'No transcript yet.'}

Analyse and return suggestions.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Try to parse JSON from response
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response as JSON:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: content }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ suggestions: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('ai-suggestions error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
