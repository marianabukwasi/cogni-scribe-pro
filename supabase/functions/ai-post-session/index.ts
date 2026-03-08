import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const summaryPrompts: Record<string, string> = {
  medical: 'You are a professional medical scribe. Generate a structured summary of this clinical session. Be concise and factual. Return JSON object with field_name keys and content string values. Use the summary fields provided.',
  legal: 'You are a professional legal scribe. Generate a structured summary of this legal consultation. Be concise and factual. Return JSON object with field_name keys and content string values.',
  ngo: 'You are a professional caseworker scribe. Generate a structured summary of this intake/support session. Be concise and factual. Return JSON object with field_name keys and content string values.',
  therapy: 'You are a professional therapy scribe. Generate a structured summary of this therapy session. Be concise and factual. Return JSON object with field_name keys and content string values.',
  generic: 'You are a professional scribe. Generate a structured summary of this session. Be concise and factual. Return JSON object with field_name keys and content string values.',
};

const flagsPrompts: Record<string, string> = {
  medical: 'You are a clinical safety checker. Identify flags, warnings, drug interactions, contradictions, and items requiring attention. Categorise as: critical, important, info, or safeguarding. Return JSON array with: {severity, title, detail, source}.',
  legal: 'You are a legal risk checker. Identify legal risks, deadline issues, contradictions, and items requiring attention. Categorise as: critical, important, info, or safeguarding. Return JSON array with: {severity, title, detail, source}.',
  ngo: 'You are a safeguarding and needs checker. Identify safeguarding concerns, urgent needs, vulnerabilities, and items requiring attention. Categorise as: critical, important, info, or safeguarding. Return JSON array with: {severity, title, detail, source}.',
  therapy: 'You are a clinical and safety checker for therapy. Identify risk factors, safety concerns, contradictions, and items requiring attention. Categorise as: critical, important, info, or safeguarding. Return JSON array with: {severity, title, detail, source}.',
  generic: 'You are a professional safety checker. Identify warnings, contradictions, and items requiring attention. Categorise as: critical, important, info, or safeguarding. Return JSON array with: {severity, title, detail, source}.',
};

const forwardPrompts: Record<string, string> = {
  medical: 'You are a specialist medical AI assistant. Based on this session, generate comprehensive suggestions for next steps. Return JSON array with: {category (Diagnosis/Medication/Procedure/Referral/Follow-up), title, color}. Be thorough.',
  legal: 'You are a specialist legal AI assistant. Based on this session, generate comprehensive suggestions for next steps. Return JSON array with: {category (Case Assessment/Legal Strategy/Required Documents/Alternative/Next Step), title, color}. Be thorough.',
  ngo: 'You are a specialist social support AI assistant. Based on this session, generate comprehensive suggestions for next steps. Return JSON array with: {category (Status Assessment/Immediate Needs/Service Referral/Follow-up), title, color}. Be thorough.',
  therapy: 'You are a specialist therapy AI assistant. Based on this session, generate comprehensive suggestions for next steps. Return JSON array with: {category (DSM Assessment/Therapeutic Approach/Medication Review/Safety/Follow-up), title, color}. Be thorough.',
  generic: 'You are a professional AI assistant. Based on this session, generate comprehensive suggestions for next steps. Return JSON array with: {category (Assessment/Action/Follow-up), title, color}. Be thorough.',
};

function cleanJson(content: string): string {
  return content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { type, professionKey, profession, specialty, country, transcript, summaryFields, clientHistory, intakeData, selectedItems } = await req.json();

    const pk = professionKey || 'generic';

    let systemPrompt = '';
    let userMessage = '';

    if (type === 'summary') {
      systemPrompt = summaryPrompts[pk] || summaryPrompts.generic;
      userMessage = `Professional: ${profession}, Specialty: ${specialty || 'General'}, Country: ${country || 'Not specified'}
Summary fields to generate: ${summaryFields ? JSON.stringify(summaryFields) : 'Chief Complaint, Duration & History, Key Clinical Findings, Plan'}
Transcript: ${transcript || 'No transcript available.'}
${intakeData ? `Intake form: ${JSON.stringify(intakeData)}` : ''}
${clientHistory ? `Client history: ${JSON.stringify(clientHistory)}` : ''}
Return ONLY valid JSON object with the field names as keys.`;
    } else if (type === 'flags') {
      systemPrompt = flagsPrompts[pk] || flagsPrompts.generic;
      userMessage = `Professional: ${profession}, Specialty: ${specialty || 'General'}, Country: ${country || 'Not specified'}
Transcript: ${transcript || 'No transcript available.'}
${clientHistory ? `Client history: ${JSON.stringify(clientHistory)}` : ''}
Return ONLY valid JSON array.`;
    } else if (type === 'forward') {
      systemPrompt = forwardPrompts[pk] || forwardPrompts.generic;
      userMessage = `Transcript: ${transcript || 'No transcript available.'}
${selectedItems ? `Selected items from session: ${JSON.stringify(selectedItems)}` : ''}
${clientHistory ? `Client history: ${JSON.stringify(clientHistory)}` : ''}
Return ONLY valid JSON array.`;
    } else {
      throw new Error(`Unknown type: ${type}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt + ' Return ONLY valid JSON. No markdown.' },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(cleanJson(content));
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: content }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('ai-post-session error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
