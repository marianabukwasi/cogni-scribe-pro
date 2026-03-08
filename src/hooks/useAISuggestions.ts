import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AISuggestion {
  category: string;
  title: string;
  detail: string;
  confidence?: string;
  section: string;
}

interface SuggestionResponse {
  // Medical
  diagnoses?: { name: string; detail: string; confidence?: string }[];
  medications?: { name: string; detail: string; dosage?: string }[];
  // Therapy
  therapeuticApproaches?: { name: string; detail: string }[];
  // Legal
  assessments?: { name: string; detail: string; confidence?: string }[];
  strategies?: { name: string; detail: string }[];
  documentsNeeded?: { name: string; detail: string }[];
  // NGO
  statusAssessment?: { name: string; detail: string; confidence?: string }[];
  immediateNeeds?: { name: string; detail: string }[];
  serviceReferrals?: { name: string; detail: string }[];
  // Shared
  alternatives?: { name: string; detail: string }[];
  actions?: { name: string; detail: string }[];
  warnings?: string[];
  nextSteps?: { name: string; detail: string }[];
}

type ProfessionKey = "medical" | "legal" | "ngo" | "therapy" | "generic";

const professionLabelMap: Record<ProfessionKey, Record<string, string>> = {
  medical: { diagnosis: "Diagnosis", action: "Medication", procedure: "Procedure", referral: "Referral", warning: "Warning", alternative: "If First-Line Fails", followup: "Follow-up" },
  legal: { diagnosis: "Case Assessment", action: "Legal Strategy", procedure: "Required Documents", referral: "Referral", warning: "Legal Risk", alternative: "Alternative Strategy", followup: "Next Step" },
  ngo: { diagnosis: "Status Assessment", action: "Immediate Needs", procedure: "Service Referral", referral: "Application Type", warning: "Safeguarding", alternative: "Alternative Support", followup: "Follow-up" },
  therapy: { diagnosis: "DSM Assessment", action: "Therapeutic Approach", procedure: "Medication Review", referral: "Crisis Referral", warning: "Safety Concern", alternative: "Alternative Approach", followup: "Follow-up" },
  generic: { diagnosis: "Assessment", action: "Recommended Action", procedure: "Procedure", referral: "Referral", warning: "Warning", alternative: "Alternative", followup: "Next Step" },
};

function mapConfidence(c?: string): string | undefined {
  if (!c) return undefined;
  if (c === "high") return "High match";
  if (c === "medium") return "Possible";
  if (c === "low") return "Consider";
  return c;
}

function mapResponseToSuggestions(data: SuggestionResponse, pk: ProfessionKey): AISuggestion[] {
  const labels = professionLabelMap[pk];
  const suggestions: AISuggestion[] = [];

  // Warnings
  if (data.warnings) {
    data.warnings.forEach(w => {
      suggestions.push({ category: labels.warning, title: w.length > 60 ? w.slice(0, 57) + "..." : w, detail: w, section: "warnings" });
    });
  }

  // Diagnoses / Assessments / Status
  const diagItems = data.diagnoses || data.assessments || data.statusAssessment || [];
  diagItems.forEach(d => {
    suggestions.push({ category: labels.diagnosis, title: d.name, detail: d.detail, confidence: mapConfidence(d.confidence), section: "diagnoses" });
  });

  // Actions / Medications / Strategies / Immediate Needs / Therapeutic Approaches
  const actionItems = data.medications || data.strategies || data.immediateNeeds || data.therapeuticApproaches || data.actions || [];
  actionItems.forEach(a => {
    suggestions.push({ category: labels.action, title: a.name, detail: a.detail + ((a as any).dosage ? ` — ${(a as any).dosage}` : ""), section: "actions" });
  });

  // Documents needed (legal)
  if (data.documentsNeeded) {
    data.documentsNeeded.forEach(d => {
      suggestions.push({ category: labels.procedure, title: d.name, detail: d.detail, section: "actions" });
    });
  }

  // Service referrals (NGO)
  if (data.serviceReferrals) {
    data.serviceReferrals.forEach(r => {
      suggestions.push({ category: labels.procedure, title: r.name, detail: r.detail, section: "referrals" });
    });
  }

  // Alternatives
  if (data.alternatives) {
    data.alternatives.forEach(a => {
      suggestions.push({ category: labels.alternative, title: a.name, detail: a.detail, section: "alternatives" });
    });
  }

  // Next steps
  if (data.nextSteps) {
    data.nextSteps.forEach(n => {
      suggestions.push({ category: labels.followup, title: n.name, detail: n.detail, section: "followups" });
    });
  }

  return suggestions;
}

export function useAISuggestions() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTranscriptLength = useRef(0);
  const lastRequestTime = useRef(0);
  const utterancesSinceLastRequest = useRef(0);

  const fetchSuggestions = useCallback(async (
    transcript: string,
    professionKey: ProfessionKey,
    profession: string,
    specialty?: string,
    country?: string,
    force = false
  ) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;

    // Cost control: only request if 3+ new utterances and 30s since last request (unless forced)
    if (!force) {
      if (utterancesSinceLastRequest.current < 3) return;
      if (timeSinceLastRequest < 30000) return;
    }

    setLoading(true);
    setError(null);
    lastRequestTime.current = now;
    utterancesSinceLastRequest.current = 0;

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-suggestions", {
        body: { transcript, professionKey, profession, specialty, country },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.suggestions) {
        const mapped = mapResponseToSuggestions(data.suggestions, professionKey);
        setSuggestions(mapped);
      }
    } catch (e: any) {
      console.error("AI suggestion error:", e);
      setError(e.message || "Failed to get AI suggestions");
      // Keep existing suggestions on error
    } finally {
      setLoading(false);
    }
  }, []);

  const trackNewUtterance = useCallback(() => {
    utterancesSinceLastRequest.current++;
  }, []);

  return { suggestions, loading, error, fetchSuggestions, trackNewUtterance, setSuggestions };
}
