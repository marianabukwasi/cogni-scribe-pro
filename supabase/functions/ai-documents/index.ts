import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const docPrompts: Record<string, string> = {
  clinical_note: 'You are a professional medical scribe. Generate a clinical note in {format} format based on the session. Return JSON with section_name and content for each section of the note. Output language: {language}.',
  case_note: 'You are a professional legal scribe. Generate a case note / file note based on the session. Return JSON with section_name and content for each section. Output language: {language}.',
  attendance_note: 'You are a professional legal scribe. Generate a client attendance note based on the session. Return JSON with section_name and content for each section. Output language: {language}.',
  follow_up_letter: 'Write a professional follow-up letter based on the session. Return JSON with section_name and content for each section. Output language: {language}.',
  case_summary: 'You are a professional caseworker scribe. Generate a structured case summary. Return JSON with section_name and content for each section. Output language: {language}.',
  needs_assessment: 'You are a professional caseworker. Generate a needs assessment document. Return JSON with section_name and content for each section. Output language: {language}.',
  draft_application: 'You are a professional caseworker. Generate a draft application document. Reconstruct events chronologically. Return JSON with section_name and content for each section. Output language: {language}.',
  progress_note: 'You are a professional therapy scribe. Generate a progress note in {format} format. Return JSON with section_name and content for each section. Output language: {language}.',
  risk_assessment: 'You are a clinical risk assessor. Generate a risk assessment summary. Return JSON with section_name and content for each section. Output language: {language}.',
  session_summary: 'You are a professional scribe. Generate a session summary. Return JSON with section_name and content for each section. Output language: {language}.',
  action_items: 'Generate a structured action items document. Return JSON with section_name and content for each section. Output language: {language}.',
  prescription: 'Generate prescription details for the selected medications. Country format: {prescriptionCountry}. Output language: {language}. Return JSON array with: medication_name, dosage, form, frequency, duration, quantity, special_instructions for each medication.',
  referral_letter: 'Write a professional referral letter. Language: {language}. Style: formal, concise, clinically appropriate. Return JSON with: specialty, to, body, language, urgency for each referral needed.',
};

function cleanJson(content: string): string {
  return content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

async function fetchKnowledgeBaseContext(professionalId: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('knowledge_base_items')
      .select('title, content, category, tags')
      .eq('professional_id', professionalId)
      .eq('status', 'ready')
      .not('content', 'is', null)
      .limit(10);
    if (!data || data.length === 0) return '';
    return '\n\nProfessional\'s Knowledge Base (use to match their style and protocols):\n' +
      data.map(item => `[${item.category}] ${item.title}: ${(item.content || '').slice(0, 500)}`).join('\n');
  } catch { return ''; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { docType, format, language, prescriptionCountry, transcript, selectedItems, clientDetails, professionalName, profession, specialty, professionalId } = await req.json();

    let systemPrompt = docPrompts[docType] || docPrompts.session_summary;
    systemPrompt = systemPrompt
      .replace('{format}', format || 'standard')
      .replace('{language}', language || 'en')
      .replace('{prescriptionCountry}', prescriptionCountry || 'EU');
    systemPrompt += ' Return ONLY valid JSON. No markdown.';

    // Fetch KB context
    const kbContext = professionalId ? await fetchKnowledgeBaseContext(professionalId) : '';

    const userMessage = `Professional: ${professionalName || 'Professional'} (${profession || 'Professional'}, ${specialty || 'General'})
Selected items/findings: ${selectedItems ? JSON.stringify(selectedItems) : 'None'}
${clientDetails ? `Client details: ${JSON.stringify(clientDetails)}` : ''}
Transcript: ${transcript || 'No transcript available.'}${kbContext}`;

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
      console.error('Failed to parse AI doc response:', content);
      return new Response(JSON.stringify({ error: 'Parse error', raw: content }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ document: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('ai-documents error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
