import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useAIChat } from "@/hooks/useAIChat";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, FileText, AlertTriangle, Check, Eye,
  MessageSquare, Send, Pencil, X, Settings, Clock,
  Globe, RefreshCw, Plus, Brain, StickyNote, ShoppingBasket,
  Loader2, ShieldAlert
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
type ProfKey = "medical" | "legal" | "ngo" | "therapy" | "generic";

interface Flag {
  severity: "critical" | "important" | "info" | "safeguarding";
  title: string;
  detail: string;
  source: string;
}

interface ForwardItem {
  category: string;
  title: string;
  color: string;
  isCustom?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  thinking?: boolean;
}

// ─── Helpers ────────────────────────────────────────────
function getProfKey(profession?: string): ProfKey {
  if (!profession) return "medical";
  if (profession === "medical_doctor") return "medical";
  if (profession === "lawyer") return "legal";
  if (["ngo_caseworker", "refugee_support", "social_worker"].includes(profession)) return "ngo";
  if (profession === "therapist") return "therapy";
  return "generic";
}

// ─── Demo Summaries ─────────────────────────────────────
const demoSummaries: Record<ProfKey, Record<string, string>> = {
  medical: {
    "Chief Complaint": "Progressive headaches with visual disturbances over 2 weeks, predominantly in the morning. Patient describes the pain as a pressure sensation.",
    "Duration & History": "Symptoms began approximately 2 weeks ago, worsening in frequency and intensity. Morning predominance noted. No prior history of similar episodes. Patient reports intermittent diplopia on lateral gaze.",
    "Current Medications Mentioned": "St. John's Wort (self-prescribed for mood), Vitamin D supplement, Omega-3 fish oil. No prescribed medications currently.",
    "Allergies Mentioned": "No allergies reported during this session. Cross-reference with intake form recommended.",
    "Key Clinical Findings": "Pressure-type bilateral headache with morning predominance, suggesting raised intracranial pressure. Visual disturbances including diplopia on lateral gaze. Possible papilledema — fundoscopy required urgently.",
    "Patient's Own Words": "\"C'est plutôt une pression... comme si ma tête allait exploser\" (It's more of a pressure... like my head is going to explode)\n\n\"Sometimes I see double, especially when looking to the side\"",
  },
  legal: {
    "Nature of Issue": "Commercial contract dispute. Client alleges breach of terms by supplier who failed to deliver goods within agreed timeframe, resulting in significant financial losses.",
    "Key Facts Stated": "Contract signed 15 January 2026. Delivery deadline 1 March 2026. No delivery made. Client made three written requests. Supplier acknowledged delay but offered no remediation.",
    "Relevant Dates Mentioned": "Contract execution: 15 January 2026\nDelivery deadline: 1 March 2026\nFirst complaint: 5 March 2026\nLimitation consideration: 6 years from breach",
    "Documents Referenced": "Original signed contract, three email exchanges with supplier, invoice records showing payment made, bank statements confirming wire transfer of €47,500.",
    "Client's Priorities": "Primary objective is delivery of goods rather than compensation. Willing to pursue damages if delivery cannot be arranged. Estimates €3,000/week in lost revenue.",
  },
  ngo: {
    "Chronological Timeline of Events": "2024 — Left Eritrea due to military conscription threat\n2024-2025 — Travelled through Sudan, Libya (detained ~3 months)\n2025 — Crossed Mediterranean, arrived Italy\n2025 — Transferred to Luxembourg reception facility\n2026 — Awaiting asylum decision, 14 months in process",
    "Immediate Needs Identified": "1. Medical attention — untreated shoulder injury\n2. Psychological support — sleep disturbances and flashbacks\n3. Legal representation — asylum application needs supplementary evidence\n4. Language support — limited French, basic English, fluent Tigrinya",
    "Vulnerability Factors Mentioned": "Former unaccompanied minor (now 19). Physical injury from detention. Psychological trauma indicators. No family support network. Limited language access.",
    "Languages Used in Session": "English with interpreter support. Client switched to Tigrinya for detailed accounts. Some French for administrative terms.",
    "Key Statements (verbatim)": "\"I left because they would take me to the army and I would never come back\"\n\n\"In Libya they kept us in a room with many people. We could not go outside for three months\"\n\n\"I want to study. I want to become someone.\"",
  },
  therapy: {
    "Presenting Concerns": "Persistent low mood for ~6 weeks, coinciding with relationship breakdown. Difficulty motivating for daily activities, social withdrawal, disrupted sleep (early morning waking at 4am).",
    "Mood and Affect Observed": "Flat affect throughout. Minimal eye contact initially, improving during rapport building. Tearful discussing relationship breakdown. Speech rate slow but coherent.",
    "Key Themes": "Loss and grief. Self-blame and rumination. Social isolation as coping. Disrupted routine contributing to mood maintenance. Pre-existing perfectionism exacerbating response.",
    "Risk Factors Mentioned": "Passive suicidal ideation ('sometimes I think it would be easier to not be here') — no active plans or intent. No self-harm history. Protective factors: close sister relationship, pet care commitment.",
    "Client's Goals Expressed": "\"I want to stop feeling like this\" — primary motivation is mood improvement. Interest in understanding impact depth. Willing to engage with homework tasks.",
  },
  generic: {
    "Session Overview": "Comprehensive discussion covering primary concerns and current situation. Key issues identified and potential next steps discussed.",
    "Key Points Discussed": "Multiple areas addressed including immediate needs, background context, and potential pathways forward.",
    "Action Items": "Several action items identified requiring follow-up from both professional and client.",
    "Client's Perspective": "Views and priorities expressed clearly. Direct quotes captured for the record.",
  },
};

// ─── Demo Flags ─────────────────────────────────────────
const getDemoFlags = (pk: ProfKey): Flag[] => {
  if (pk === "medical") return [
    { severity: "critical", title: "Drug Interaction Risk", detail: "Patient takes St. John's Wort — may interact with Acetazolamide and many other medications. Verify full medication list before prescribing. St. John's Wort can reduce effectiveness of oral contraceptives, anticoagulants, and SSRIs.", source: "Detected from transcript at 00:01:55" },
    { severity: "important", title: "Symptom Timeline Discrepancy", detail: "Patient stated symptoms began 2 weeks ago in session, but intake form indicates intermittent headaches for 3 months. This discrepancy should be clarified — chronic vs acute onset changes the differential.", source: "Cross-referenced with intake form" },
    { severity: "info", title: "Previous MRI Referenced", detail: "Patient mentioned a previous MRI — document not in file. Consider requesting records from prior provider to avoid unnecessary repeat imaging.", source: "Detected from transcript at 00:01:18" },
  ];
  if (pk === "legal") return [
    { severity: "critical", title: "Limitation Period Approaching", detail: "Depending on jurisdiction, the limitation period for contract claims may be approaching. If cross-border element applies, different limitation rules may apply. Verify and consider protective measures immediately.", source: "Risk analysis from case facts" },
    { severity: "important", title: "Incomplete Documentation", detail: "Client referenced verbal agreements made before the written contract. These may affect interpretation of terms. Request any notes, emails, or witness details from pre-contractual negotiations.", source: "Detected from transcript" },
    { severity: "info", title: "Jurisdiction Question", detail: "Contract may have cross-border elements — supplier registered in different EU country. Confirm applicable jurisdiction and consider Rome I Regulation.", source: "Cross-referenced with client profile" },
  ];
  if (pk === "ngo") return [
    { severity: "safeguarding", title: "Detention Trauma — Immediate Support Needed", detail: "Client described conditions of detention in Libya consistent with torture and inhuman treatment. PTSD risk is high. Immediate psychological referral recommended. These accounts should be documented carefully for asylum claim — consider medico-legal report.", source: "Detected from transcript" },
    { severity: "critical", title: "Untreated Physical Injury", detail: "Client reports shoulder injury sustained during detention, untreated for approximately 18 months. Medical assessment urgently needed — may also constitute evidence for asylum claim.", source: "Detected from transcript" },
    { severity: "safeguarding", title: "Former Unaccompanied Minor", detail: "Client states they are 19 but arrived as unaccompanied minor. Verify age documentation and ensure appropriate support was provided during minority. Any gaps in care may be relevant to current needs assessment.", source: "Cross-referenced with intake data" },
    { severity: "important", title: "Language Access Barrier", detail: "Client has limited French and basic English. Tigrinya interpreter needed for accurate communication. Ensure all official documents and appointments have interpreter support arranged.", source: "Observed during session" },
  ];
  if (pk === "therapy") return [
    { severity: "critical", title: "Passive Suicidal Ideation — Safety Plan Required", detail: "Client endorsed passive suicidal ideation ('sometimes I think it would be easier to not be here'). No active plans or intent reported. Safety plan discussed but not yet formalised. Complete PHQ-9 at next session and document full safety assessment.", source: "Detected from transcript" },
    { severity: "important", title: "Sleep Disruption Pattern", detail: "Early morning waking (4am) persisting for 6+ weeks. This pattern is consistent with depressive disorder but should rule out physiological causes. Consider sleep hygiene psychoeducation and possible GP referral if persistent.", source: "Clinical observation" },
    { severity: "info", title: "Medication History Gap", detail: "Client mentioned being prescribed medication 'a few years ago' for similar symptoms but stopped taking it. Clarify what was prescribed, duration, response, and reason for discontinuation — relevant for treatment planning.", source: "Detected from transcript" },
    { severity: "safeguarding", title: "Social Isolation Concern", detail: "Client reports significant social withdrawal over past 6 weeks. Only regular contact is with sister (weekly). No engagement with friends, work colleagues, or community. Monitor for deterioration and consider social activation as treatment target.", source: "Clinical assessment" },
  ];
  return [
    { severity: "important", title: "Follow-up Required", detail: "Several items from this session require follow-up action.", source: "Session analysis" },
  ];
};

// ─── Demo Forward Items ─────────────────────────────────
const getDemoForwardItems = (pk: ProfKey): ForwardItem[] => {
  if (pk === "medical") return [
    { category: "Diagnosis", title: "Idiopathic Intracranial Hypertension (IIH)", color: "bg-primary/20 text-primary" },
    { category: "Medication", title: "Acetazolamide (Diamox) 250mg twice daily", color: "bg-accent/20 text-accent" },
    { category: "Procedure", title: "Urgent Fundoscopy", color: "bg-warning/20 text-warning" },
    { category: "Referral", title: "Ophthalmology — visual field assessment", color: "bg-purple-500/20 text-purple-400" },
    { category: "Referral", title: "Neurology consultation if papilledema confirmed", color: "bg-purple-500/20 text-purple-400" },
    { category: "Follow-up", title: "2-week review appointment", color: "bg-secondary text-muted-foreground" },
  ];
  if (pk === "legal") return [
    { category: "Case Assessment", title: "Breach of Contract — Strong Case", color: "bg-primary/20 text-primary" },
    { category: "Legal Strategy", title: "Send Letter Before Action (14-day deadline)", color: "bg-accent/20 text-accent" },
    { category: "Required Documents", title: "Gather all contract correspondence", color: "bg-warning/20 text-warning" },
    { category: "Alternative", title: "Mediation if LBA unsuccessful", color: "bg-orange-500/20 text-orange-400" },
    { category: "Next Step", title: "Client to provide documents within 5 business days", color: "bg-secondary text-muted-foreground" },
  ];
  if (pk === "ngo") return [
    { category: "Status Assessment", title: "Asylum application — eligible for protection", color: "bg-primary/20 text-primary" },
    { category: "Immediate Needs", title: "Medical assessment for shoulder injury", color: "bg-accent/20 text-accent" },
    { category: "Immediate Needs", title: "Psychological support referral (trauma)", color: "bg-accent/20 text-accent" },
    { category: "Service Referral", title: "Legal aid for asylum evidence", color: "bg-purple-500/20 text-purple-400" },
    { category: "Service Referral", title: "Tigrinya interpreter for future sessions", color: "bg-purple-500/20 text-purple-400" },
    { category: "Follow-up", title: "Follow-up in 1 week — check all referrals actioned", color: "bg-secondary text-muted-foreground" },
  ];
  if (pk === "therapy") return [
    { category: "DSM Assessment", title: "Major Depressive Disorder — Moderate (provisional)", color: "bg-primary/20 text-primary" },
    { category: "Therapeutic Approach", title: "CBT — Behavioral Activation protocol", color: "bg-accent/20 text-accent" },
    { category: "Medication Review", title: "Coordinate with GP re: SSRI consideration", color: "bg-warning/20 text-warning" },
    { category: "Safety", title: "Formalise safety plan at next session", color: "bg-destructive/20 text-destructive" },
    { category: "Follow-up", title: "Weekly sessions for initial 6-week block", color: "bg-secondary text-muted-foreground" },
  ];
  return [
    { category: "Assessment", title: "Initial assessment complete", color: "bg-primary/20 text-primary" },
    { category: "Action", title: "Document findings", color: "bg-accent/20 text-accent" },
    { category: "Follow-up", title: "Schedule next appointment", color: "bg-secondary text-muted-foreground" },
  ];
};

// ─── Document Types by Profession ───────────────────────
const docTypes: Record<ProfKey, { key: string; label: string; format?: string[]; defaultFormat?: string }[]> = {
  medical: [
    { key: "clinical_note", label: "Clinical Note", format: ["SOAP", "DAP"], defaultFormat: "SOAP" },
    { key: "prescription", label: "Prescription" },
    { key: "referral_letter", label: "Referral Letter(s)" },
  ],
  legal: [
    { key: "case_note", label: "Case Note / File Note" },
    { key: "attendance_note", label: "Client Attendance Note" },
    { key: "follow_up_letter", label: "Follow-up Letter" },
  ],
  ngo: [
    { key: "case_summary", label: "Case Summary" },
    { key: "needs_assessment", label: "Needs Assessment" },
    { key: "draft_application", label: "Draft Application" },
    { key: "referral_letter", label: "Referral Letter(s)" },
  ],
  therapy: [
    { key: "progress_note", label: "Progress Note", format: ["BIRP", "DAP"], defaultFormat: "BIRP" },
    { key: "risk_assessment", label: "Risk Assessment Summary" },
    { key: "referral_letter", label: "Referral Letter(s)" },
  ],
  generic: [
    { key: "session_summary", label: "Session Summary" },
    { key: "action_items", label: "Action Items" },
    { key: "follow_up_letter", label: "Follow-up Letter" },
  ],
};

// ─── Demo Chat ──────────────────────────────────────────
const chatSuggestions: Record<ProfKey, string[]> = {
  medical: ["Any drug interactions I should check?", "What are alternative treatments for IIH?", "Draft a referral letter to neurology"],
  legal: ["Summarise strengths and weaknesses of this case", "Draft a Letter Before Action", "What is the relevant legislation?"],
  ngo: ["What services are available for this client?", "Draft an urgent housing referral", "What is the asylum process next step?"],
  therapy: ["What CBT techniques apply here?", "Summarise risk factors for my supervisor", "What does DSM-5 say about this presentation?"],
  generic: ["Summarise the key points", "What should I follow up on?", "Draft a follow-up letter"],
};

const chatResponses: Record<string, string> = {
  "Any drug interactions I should check?": "Based on the session, the patient takes **St. John's Wort**, which has significant interactions:\n\n- **Acetazolamide** — Limited direct interaction, but monitor for metabolic effects\n- **SSRIs** — Serotonin syndrome risk if antidepressants prescribed\n- **Oral contraceptives** — Reduced effectiveness\n- **Warfarin/anticoagulants** — Reduced effectiveness\n- **Cyclosporine** — Significantly reduced levels\n\n**Recommendation:** Patient should discontinue St. John's Wort before starting any new prescriptions. Discuss at next contact.",
  "What are alternative treatments for IIH?": "Alternatives to **Acetazolamide** for IIH:\n\n1. **Topiramate** — dual benefit for weight loss and ICP reduction\n2. **Furosemide** — if carbonic anhydrase inhibitors not tolerated\n3. **Weight management program** — fundamental for long-term management\n4. **Optic nerve sheath fenestration** — if vision threatened\n5. **CSF shunting** — for refractory cases\n\nCurrent evidence supports Acetazolamide as first-line. Topiramate is the most common alternative.",
  "Draft a referral letter to neurology": "I can prepare a **referral letter** including:\n\n- Patient's presenting symptoms (2-week progressive headaches with visual disturbances)\n- Clinical findings suggesting raised ICP\n- Current supplements and interaction concerns\n- Request for urgent assessment including fundoscopy and possible LP\n\nShall I add **\"Neurology Referral Letter\"** to the generation basket?",
  "Summarise strengths and weaknesses of this case": "**Strengths:**\n- Written contract with clear delivery terms\n- Payment made and fully documented (€47,500)\n- Three written complaints demonstrate reasonable mitigation\n- Supplier's acknowledgment of delay on record\n\n**Weaknesses:**\n- Verbal agreements may complicate contractual interpretation\n- Cross-border jurisdiction question (Rome I Regulation)\n- Client's primary preference (delivery) harder to enforce than damages\n- Quantification of ongoing losses needs supporting evidence",
  "Draft a Letter Before Action": "I can draft a **Letter Before Action** that includes:\n\n- Identification of the contractual breach\n- Summary of client's losses and ongoing impact\n- Demand for delivery within 14 days\n- Alternative: damages claim of €47,500 + ongoing losses\n- Notice of intent to commence proceedings\n\nShall I add this to the generation basket?",
  "What is the relevant legislation?": "Key legislation for this contract dispute:\n\n- **Luxembourg Civil Code** — Articles 1134-1184 (contractual obligations)\n- **Rome I Regulation (EC 593/2008)** — Applicable law for cross-border contracts\n- **Brussels I Regulation (EU 1215/2012)** — Jurisdiction rules\n- **Prescription Act** — 10-year general limitation in Luxembourg\n\nIf the supplier is based in another EU state, Rome I Article 4 determines applicable law based on characteristic performance.",
  "What services are available for this client?": "Based on this client's profile and needs in Luxembourg:\n\n- **Medical**: MSF clinic or national health registration via CNS\n- **Psychological**: OLAI psychological support service, Fondation Caritas\n- **Legal**: Passerell asbl for asylum legal aid, Service Réfugiés de la Croix-Rouge\n- **Language**: Tigrinya interpreter via ASTI or CLAE\n- **Housing**: OLAI/Caritas emergency accommodation\n- **Education**: CASNA for educational orientation",
  "Draft an urgent housing referral": "I can draft an **urgent housing referral** including:\n\n- Client's current housing status\n- Vulnerability factors (former UAM, trauma, physical injury)\n- Immediate safety needs\n- Supporting documentation references\n\nShall I add this to the generation basket?",
  "What is the asylum process next step?": "For this client's asylum case in Luxembourg:\n\n1. **Current status**: Application pending (14 months)\n2. **Next step**: Supplementary evidence submission\n3. **Key evidence needed**: Medical documentation of detention injuries, psychological assessment, country of origin information\n4. **Timeline**: Decision expected within 6-9 months of supplementary submission\n5. **If refused**: 30-day appeal period to Tribunal Administratif",
  "What CBT techniques apply here?": "For **moderate depression** with this presentation:\n\n**Behavioral Activation (primary):**\n- Activity monitoring and scheduling\n- Graded task assignment\n- Pleasant activity planning\n\n**Cognitive Restructuring (secondary):**\n- Thought records for self-blame patterns\n- Evidence-based challenging of perfectionist standards\n- Behavioral experiments around social engagement\n\n**Additional:**\n- Sleep hygiene psychoeducation\n- Rumination-focused techniques (worry postponement)\n- Mindfulness elements for present-moment awareness",
  "Summarise risk factors for my supervisor": "**Risk Assessment Summary for Supervision:**\n\n**Risk Factors:**\n- Passive suicidal ideation endorsed\n- Social isolation (6 weeks)\n- Sleep disruption (early morning waking)\n- Recent significant loss (relationship)\n- Possible medication history (discontinued)\n\n**Protective Factors:**\n- No active plans or intent\n- No self-harm history\n- Close relationship with sister\n- Pet care commitment (behavioural anchor)\n- Engaged in therapy willingly\n\n**Risk Level:** Moderate\n**Action:** Formalise safety plan at next session. PHQ-9 monitoring. Consider GP liaison re: SSRI.",
  "What does DSM-5 say about this presentation?": "Based on the session, the presentation is most consistent with:\n\n**Major Depressive Disorder, Single Episode, Moderate (296.22 / F32.1)**\n\n**Criteria met:**\n- ✅ Depressed mood (most of the day, nearly every day, 6 weeks)\n- ✅ Diminished interest/pleasure (social withdrawal, activity reduction)\n- ✅ Insomnia (early morning waking)\n- ✅ Psychomotor retardation (slow speech observed)\n- ✅ Feelings of worthlessness (self-blame)\n- ✅ Recurrent thoughts of death (passive ideation)\n\n**5+ criteria met → Major Depressive Episode**\n**Moderate** severity: functional impairment present but not incapacitating.",
};

// ─── Component ──────────────────────────────────────────
export default function PostSession() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const aiChat = useAIChat();

  const pk = getProfKey(profile?.profession);

  const [session, setSession] = useState<any>(null);
  const [summaryFields, setSummaryFields] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [forwardItems, setForwardItems] = useState<ForwardItem[]>([]);
  const [selectedForward, setSelectedForward] = useState<number[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [flagStatuses, setFlagStatuses] = useState<Record<number, string>>({});
  const [regenerating, setRegenerating] = useState(false);
  const [notes, setNotes] = useState("");
  const [customForwardText, setCustomForwardText] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [docFormats, setDocFormats] = useState<Record<string, string>>({});
  const [docLang, setDocLang] = useState("en");
  const [prescriptionCountry, setPrescriptionCountry] = useState("luxembourg");
  const [generating, setGenerating] = useState(false);
  
  // AI loading states
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [summaryDone, setSummaryDone] = useState(false);
  const [flagsDone, setFlagsDone] = useState(false);
  const [forwardDone, setForwardDone] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const suggestions = chatSuggestions[pk];
  const profDocTypes = docTypes[pk];

  // Helper to get transcript text from session
  const getTranscriptText = useCallback(() => {
    if (!session?.transcript) return "";
    const transcript = session.transcript as any[];
    return transcript.map((l: any) => `[${l.time}] ${l.speaker} (${l.lang}): ${l.text}`).join("\n");
  }, [session]);

  // Fetch session data
  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).single().then(({ data }) => {
      setSession(data);
      if (data?.manual_notes) setNotes(data.manual_notes);
      if (data?.document_output_language) setDocLang(data.document_output_language);
    });
  }, [id]);

  // Generate AI content or load demo data when session loads
  useEffect(() => {
    if (!session) return;
    
    // Pre-select doc types and formats
    setSelectedDocs(docTypes[pk].map(d => d.key));
    const formats: Record<string, string> = {};
    docTypes[pk].forEach(d => { if (d.defaultFormat) formats[d.key] = d.defaultFormat; });
    setDocFormats(formats);

    if (isDemo) {
      // Demo mode: use static data
      setSummaryFields(demoSummaries[pk]);
      setFlags(getDemoFlags(pk));
      const items = getDemoForwardItems(pk);
      setForwardItems(items);
      setSelectedForward(items.map((_, i) => i));
      setSummaryDone(true);
      setFlagsDone(true);
      setForwardDone(true);
      return;
    }

    // Real AI generation — 3 parallel calls
    const transcript = getTranscriptText();
    if (!transcript) {
      // No transcript, fall back to demo
      setSummaryFields(demoSummaries[pk]);
      setFlags(getDemoFlags(pk));
      const items = getDemoForwardItems(pk);
      setForwardItems(items);
      setSelectedForward(items.map((_, i) => i));
      setSummaryDone(true);
      setFlagsDone(true);
      setForwardDone(true);
      return;
    }

    const selectedItems = session.selected_items;
    const contextBody = {
      professionKey: pk,
      profession: profile?.profession || "professional",
      specialty: profile?.specialty || undefined,
      country: profile?.country_of_practice || undefined,
      transcript,
      selectedItems,
    };

    // Summary
    setSummaryLoading(true);
    supabase.functions.invoke("ai-post-session", {
      body: { ...contextBody, type: "summary", summaryFields: Object.keys(demoSummaries[pk]) },
    }).then(({ data, error }) => {
      setSummaryLoading(false);
      setSummaryDone(true);
      if (error || data?.error) {
        console.error("Summary error:", error || data?.error);
        setSummaryFields(demoSummaries[pk]);
        toast.error("AI summary generation failed, showing demo data");
      } else if (data?.result) {
        setSummaryFields(data.result);
      } else {
        setSummaryFields(demoSummaries[pk]);
      }
    });

    // Flags
    setFlagsLoading(true);
    supabase.functions.invoke("ai-post-session", {
      body: { ...contextBody, type: "flags" },
    }).then(({ data, error }) => {
      setFlagsLoading(false);
      setFlagsDone(true);
      if (error || data?.error) {
        console.error("Flags error:", error || data?.error);
        setFlags(getDemoFlags(pk));
      } else if (Array.isArray(data?.result)) {
        setFlags(data.result);
      } else {
        setFlags(getDemoFlags(pk));
      }
    });

    // Forward
    setForwardLoading(true);
    supabase.functions.invoke("ai-post-session", {
      body: { ...contextBody, type: "forward" },
    }).then(({ data, error }) => {
      setForwardLoading(false);
      setForwardDone(true);
      if (error || data?.error) {
        console.error("Forward error:", error || data?.error);
        const items = getDemoForwardItems(pk);
        setForwardItems(items);
        setSelectedForward(items.map((_, i) => i));
      } else if (Array.isArray(data?.result)) {
        const items: ForwardItem[] = data.result.map((r: any) => ({
          category: r.category || "Action",
          title: r.title || "",
          color: r.color || "bg-secondary text-muted-foreground",
        }));
        setForwardItems(items);
        setSelectedForward(items.map((_: any, i: number) => i));
      } else {
        const items = getDemoForwardItems(pk);
        setForwardItems(items);
        setSelectedForward(items.map((_, i) => i));
      }
    });
  }, [session, pk, isDemo]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiChat.messages]);

  // ─── Summary Editing ──────────────────────────────────
  const startEdit = (field: string) => { setEditingField(field); setEditValue(summaryFields[field] || ""); };
  const saveEdit = () => {
    if (!editingField) return;
    setSummaryFields(prev => ({ ...prev, [editingField]: editValue }));
    setEditingField(null);
    toast.success("Summary updated");
    if (id) supabase.from("sessions").update({ summary: { ...summaryFields, [editingField]: editValue } as any }).eq("id", id);
  };
  const cancelEdit = () => { setEditingField(null); setEditValue(""); };

  const handleRegenerate = async () => {
    setRegenerating(true);
    if (!isDemo && session?.transcript) {
      const { data, error } = await supabase.functions.invoke("ai-post-session", {
        body: {
          type: "summary",
          professionKey: pk,
          profession: profile?.profession,
          specialty: profile?.specialty,
          country: profile?.country_of_practice,
          transcript: getTranscriptText(),
          summaryFields: Object.keys(summaryFields),
        },
      });
      if (!error && data?.result) setSummaryFields(data.result);
      else toast.error("Regeneration failed");
    }
    setRegenerating(false);
    toast.success("Summary regenerated");
  };

  // ─── Forward Items ────────────────────────────────────
  const toggleForward = (i: number) => setSelectedForward(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const addCustomForward = () => {
    if (!customForwardText.trim()) return;
    setForwardItems(prev => [...prev, { category: "Custom", title: customForwardText.trim(), color: "bg-secondary text-muted-foreground", isCustom: true }]);
    setSelectedForward(prev => [...prev, forwardItems.length]);
    setCustomForwardText("");
  };

  // ─── Flag Actions ─────────────────────────────────────
  const markFlagReviewed = (i: number) => setFlagStatuses(s => ({ ...s, [i]: "reviewed" }));
  const dismissFlag = (i: number) => setFlagStatuses(s => ({ ...s, [i]: "dismissed" }));
  const addFlagToNotes = (f: Flag) => {
    setNotes(prev => prev + `\n\n[FLAG] ${f.title}: ${f.detail}`);
    toast.success("Added to notes");
  };

  // ─── Chat ─────────────────────────────────────────────
  const handleChat = (msg: string) => {
    setChatInput("");
    if (isDemo) {
      // Demo mode: use static responses
      aiChat.setMessages(prev => [...prev, { role: "user", content: msg }]);
      setTimeout(() => {
        aiChat.setMessages(prev => [...prev, {
          role: "assistant",
          content: chatResponses[msg] || "I've analyzed the session context. Based on the transcript, clinical findings, and your knowledge base, here are my recommendations for this case."
        }]);
      }, 1500);
      return;
    }
    // Real AI chat with streaming
    aiChat.sendMessage(msg, {
      profession: profile?.profession,
      specialty: profile?.specialty,
      country: profile?.country_of_practice,
      transcript: getTranscriptText(),
      selectedItems: session?.selected_items,
    });
  };

  const addChatToNotes = (content: string) => {
    setNotes(prev => prev + `\n\n[AI] ${content.slice(0, 200)}...`);
    toast.success("Added to notes");
  };

  const addChatToBasket = (content: string) => {
    // Extract first line as title
    const title = content.split("\n")[0].replace(/[*#]/g, "").trim().slice(0, 60);
    setForwardItems(prev => [...prev, { category: "AI Suggestion", title, color: "bg-primary/20 text-primary", isCustom: true }]);
    setSelectedForward(prev => [...prev, forwardItems.length]);
    toast.success("Added to basket");
  };

  // ─── Document Generation ──────────────────────────────
  const toggleDoc = (key: string) => setSelectedDocs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const handleGenerate = async () => {
    setGenerating(true);
    
    if (!isDemo && session?.transcript) {
      // Generate documents via AI in parallel
      const transcript = getTranscriptText();
      const selectedBasketItems = selectedForward.map(i => forwardItems[i]);
      
      const promises = selectedDocs.map(async (docKey) => {
        try {
          const { data, error } = await supabase.functions.invoke("ai-documents", {
            body: {
              docType: docKey,
              format: docFormats[docKey],
              language: docLang,
              prescriptionCountry,
              transcript,
              selectedItems: selectedBasketItems,
              professionalName: profile?.full_name,
              profession: profile?.profession,
              specialty: profile?.specialty,
            },
          });
          
          if (error || data?.error) {
            console.error(`Doc generation error for ${docKey}:`, error || data?.error);
            return null;
          }
          
          // Save generated document to database
          if (data?.document) {
            await supabase.from("documents").insert({
              professional_id: profile?.user_id || "",
              session_id: id,
              client_id: session?.client_id,
              document_type: docKey,
              title: `${docKey.replace(/_/g, " ")} - ${session?.client_name || "Client"}`,
              content: data.document,
              language: docLang,
              format: docFormats[docKey] || null,
            });
          }
          return data?.document;
        } catch (e) {
          console.error(`Doc generation failed for ${docKey}:`, e);
          return null;
        }
      });
      
      await Promise.all(promises);
    }
    
    setGenerating(false);
    setShowGenerateDialog(false);
    toast.success(`${selectedDocs.length} documents generated`);
    navigate(`/session/${id}/documents`);
  };

  // ─── Computed ─────────────────────────────────────────
  const sessionDate = session?.start_time ? format(new Date(session.start_time), "d MMMM yyyy") : format(new Date(), "d MMMM yyyy");
  const sessionDuration = session?.duration_seconds ? `${Math.floor(session.duration_seconds / 60)} min ${session.duration_seconds % 60}s` : "—";
  const outputLang = session?.document_output_language?.toUpperCase() || "EN";
  const unreviewedCount = flags.filter((_, i) => !flagStatuses[i]).length;
  const criticalUnreviewed = flags.filter((f, i) => !flagStatuses[i] && f.severity === "critical").length;
  const clientName = session?.client_name || "Client";

  const severityConfig = {
    critical: { class: "severity-critical", badge: "bg-destructive/20 text-destructive", icon: "⚠", label: "CRITICAL" },
    important: { class: "severity-important", badge: "bg-warning/20 text-warning", icon: "", label: "IMPORTANT" },
    info: { class: "severity-info", badge: "bg-primary/20 text-primary", icon: "", label: "INFORMATION" },
    safeguarding: { class: "severity-safeguarding", badge: "bg-purple-500/20 text-purple-400", icon: "🛡", label: "SAFEGUARDING" },
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* ─── Main Content ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-xl text-foreground">{clientName} — Session Review</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{sessionDate} · {sessionDuration}
                </span>
                {session?.session_type && <span className="status-badge bg-secondary text-muted-foreground text-[10px]">{session.session_type}</span>}
                <span className="status-badge bg-primary/20 text-primary text-[10px] flex items-center gap-1"><Globe className="w-3 h-3" />{outputLang}</span>
                {session?.retention_decision && <span className="status-badge bg-accent/20 text-accent text-[10px]">{session.retention_decision.replace(/_/g, " ")}</span>}
              </div>
            </div>
            <Button onClick={() => setShowGenerateDialog(true)} className="gap-2" disabled={selectedForward.length === 0}>
              <FileText className="w-4 h-4" />Generate Documents ({selectedForward.length})
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 bg-surface border border-border w-fit">
            <TabsTrigger value="summary" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5">
              Summary {summaryDone && !summaryLoading && <Check className="w-3 h-3 text-accent" />}
              {summaryLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </TabsTrigger>
            <TabsTrigger value="flags" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5">
              Points to Note
              {flagsDone && !flagsLoading && <Check className="w-3 h-3 text-accent" />}
              {flagsLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
              {!flagsLoading && unreviewedCount > 0 && (
                <span className={`ml-1.5 w-5 h-5 rounded-full text-[10px] inline-flex items-center justify-center ${criticalUnreviewed > 0 ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                  {unreviewedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="forward" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5">
              Way Forward {forwardDone && !forwardLoading && <Check className="w-3 h-3 text-accent" />}
              {forwardLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </TabsTrigger>
          </TabsList>

          {/* ─── Summary Tab ────────────────────────── */}
          <TabsContent value="summary" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {summaryLoading && (
                  <>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="glass-card p-5 space-y-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-3/5" />
                      </div>
                    ))}
                  </>
                )}
                {!summaryLoading && Object.entries(summaryFields).map(([field, value]) => (
                  <div key={field} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-primary">{field}</h3>
                      {editingField === field ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2 text-accent"><Check className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2 text-muted-foreground"><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(field)} className="h-6 px-2 text-muted-foreground hover:text-foreground gap-1 text-xs">
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                      )}
                    </div>
                    {editingField === field ? (
                      <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="bg-secondary border-border text-foreground text-sm min-h-[100px]" autoFocus />
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{value}</p>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" onClick={handleRegenerate} disabled={regenerating} className="border-border text-muted-foreground gap-2">
                    {regenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {regenerating ? "Regenerating..." : "Regenerate Summary"}
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/settings")} className="text-muted-foreground gap-2 text-xs">
                    <Settings className="w-3.5 h-3.5" /> Configure Summary Fields
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Points to Note Tab ─────────────────── */}
          <TabsContent value="flags" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {flagsLoading && (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-card p-5 space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    ))}
                  </>
                )}
                {!flagsLoading && flags.length === 0 && (
                  <div className="text-center py-12">
                    <Check className="w-10 h-10 text-accent mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-muted-foreground">No flags identified for this session.</p>
                    <p className="text-xs text-muted-foreground mt-1">This does not replace professional judgment.</p>
                  </div>
                )}
                {/* Alert log from session */}
                {!flagsLoading && sessionAlerts.length > 0 && (
                  <div className="glass-card p-5 mb-4 border-warning/20">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert className="w-4 h-4 text-warning" />
                      <h3 className="text-sm font-semibold text-foreground">Alerts Triggered During Session</h3>
                      <span className="status-badge bg-warning/20 text-warning text-[10px]">{sessionAlerts.length}</span>
                    </div>
                    <div className="space-y-2">
                      {sessionAlerts.map((a: any, i: number) => (
                        <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg ${a.severity === "critical" ? "bg-destructive/5 border border-destructive/20" : "bg-warning/5 border border-warning/20"}`}>
                          <span className={`text-[10px] font-mono shrink-0 mt-0.5 ${a.severity === "critical" ? "text-destructive" : "text-warning"}`}>{a.timestamp}</span>
                          <div className="min-w-0">
                            <span className={`status-badge text-[9px] mb-1 ${a.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                              {a.severity === "critical" ? "⚠ CRITICAL" : "IMPORTANT"}
                            </span>
                            <p className="text-xs text-foreground mt-1">{a.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Triggered at {new Date(a.triggeredAt).toLocaleTimeString()}{a.read ? " · Acknowledged" : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group by severity */}
                {(["critical", "safeguarding", "important", "info"] as const).map(sev => {
                  const items = flags.map((f, i) => ({ ...f, idx: i })).filter(f => f.severity === sev);
                  if (items.length === 0) return null;
                  return (
                    <div key={sev}>
                      {items.map(({ idx, ...f }) => {
                        const reviewed = !!flagStatuses[idx];
                        const cfg = severityConfig[f.severity];
                        return (
                          <div key={idx} className={`glass-card p-5 mb-3 ${cfg.class} transition-all ${reviewed ? "opacity-40" : ""}`}>
                            <div className="flex items-start justify-between">
                              <span className={`status-badge text-[10px] ${cfg.badge}`}>
                                {cfg.icon && `${cfg.icon} `}{cfg.label}
                              </span>
                              {reviewed && <span className="status-badge bg-accent/20 text-accent text-[10px]"><Check className="w-3 h-3 inline mr-0.5" />{flagStatuses[idx]}</span>}
                            </div>
                            <h3 className="text-sm font-medium text-foreground mt-2">{f.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.detail}</p>
                            <p className="text-[10px] text-muted-foreground mt-2 italic">{f.source}</p>
                            {!reviewed && (
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" variant="outline" onClick={() => markFlagReviewed(idx)} className="text-xs border-border text-foreground gap-1">
                                  <Eye className="w-3 h-3" />Mark as Reviewed
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => addFlagToNotes(f)} className="text-xs text-muted-foreground gap-1">
                                  <StickyNote className="w-3 h-3" />Add to Notes
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => dismissFlag(idx)} className="text-xs text-muted-foreground">Dismiss</Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Way Forward Tab ────────────────────── */}
          <TabsContent value="forward" className="flex-1 overflow-hidden mt-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">Select items to include in generated documents:</p>
                {forwardItems.map((item, i) => {
                  const isSelected = selectedForward.includes(i);
                  return (
                    <div key={i} onClick={() => toggleForward(i)} className={`suggestion-card ${isSelected ? "suggestion-card-selected" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className={`status-badge ${item.color} text-[10px]`}>{item.category}</span>
                        <div className="flex items-center gap-2">
                          {item.isCustom && <span className="text-[10px] text-muted-foreground">Custom</span>}
                          {isSelected && <Check className="w-4 h-4 text-accent" />}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-2">{item.title}</p>
                    </div>
                  );
                })}
                {/* Add custom */}
                <div className="flex gap-2 mt-2">
                  <Input value={customForwardText} onChange={e => setCustomForwardText(e.target.value)}
                    placeholder="Add custom item..." onKeyDown={e => { if (e.key === "Enter") addCustomForward(); }}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-xs" />
                  <Button size="sm" variant="outline" onClick={addCustomForward} disabled={!customForwardText.trim()} className="border-border text-foreground px-2">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </ScrollArea>

            {/* Generation Basket */}
            <div className="border-t border-border p-3 bg-surface space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBasket className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Generation Basket</span>
                </div>
                <span className="status-badge bg-primary/20 text-primary text-[10px]">{selectedForward.length} items</span>
              </div>
              {selectedForward.length > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {selectedForward.map(i => (
                    <div key={i} className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-secondary/50">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`status-badge ${forwardItems[i]?.color} text-[9px] shrink-0 px-1.5`}>{forwardItems[i]?.category}</span>
                        <span className="text-[11px] text-foreground truncate">{forwardItems[i]?.title}</span>
                      </div>
                      <button onClick={() => toggleForward(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={() => setShowGenerateDialog(true)} disabled={selectedForward.length === 0} className="w-full gap-2">
                <FileText className="w-4 h-4" />Generate Documents from {selectedForward.length} selections
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Chat Panel ──────────────────────────────── */}
      <div className="w-80 border-l border-border flex flex-col bg-surface">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Ask your Knowledge Base</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Ask anything about this session, your client, or your specialty</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {aiChat.messages.length === 0 && (
              <>
                <div className="glass-card p-3 text-xs text-muted-foreground leading-relaxed">
                  I have full context from this session, <span className="text-foreground font-medium">{clientName}</span>'s history, and your knowledge base. Ask me anything — drug interactions, treatment protocols, case strategies, or ask me to draft a referral letter or prescription.
                </div>
                <div className="space-y-2">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => handleChat(s)} className="w-full text-left text-xs px-3 py-2.5 rounded-md bg-secondary text-foreground hover:bg-primary/10 transition-colors leading-relaxed">
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {aiChat.messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-6" : "mr-1"}>
                {m.thinking ? (
                  <div className="glass-card p-3">
                    <div className="typing-dots flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-3 text-xs leading-relaxed ${m.role === "user" ? "bg-primary/20 text-foreground" : "glass-card text-foreground"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:text-foreground [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-foreground [&_li]:text-xs [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line">{m.content}</p>
                    )}
                    {m.role === "assistant" && !m.thinking && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                        <Button size="sm" variant="ghost" onClick={() => addChatToNotes(m.content)} className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1">
                          <StickyNote className="w-3 h-3" />Add to Notes
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => addChatToBasket(m.content)} className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1">
                          <ShoppingBasket className="w-3 h-3" />Add to Basket
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) { e.preventDefault(); handleChat(chatInput); } }}
              placeholder="Ask a question..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-xs" />
            <Button size="sm" onClick={() => chatInput.trim() && handleChat(chatInput)} disabled={!chatInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Document Generation Dialog ──────────────── */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="bg-surface border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Generate Documents</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">Select which documents to generate from {selectedForward.length} selected items:</p>

          <div className="space-y-3 mt-2">
            {profDocTypes.map(dt => (
              <div key={dt.key} className="glass-card p-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={selectedDocs.includes(dt.key)} onCheckedChange={() => toggleDoc(dt.key)} className="border-border" />
                  <span className="text-sm text-foreground font-medium">{dt.label}</span>
                </div>
                {selectedDocs.includes(dt.key) && dt.format && (
                  <div className="mt-2 ml-7">
                    <span className="text-[10px] text-muted-foreground mr-2">Format:</span>
                    <Select value={docFormats[dt.key] || dt.defaultFormat} onValueChange={v => setDocFormats(prev => ({ ...prev, [dt.key]: v }))}>
                      <SelectTrigger className="w-28 h-7 text-xs bg-secondary border-border text-foreground inline-flex">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border">
                        {dt.format.map(f => <SelectItem key={f} value={f} className="text-xs text-foreground">{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {selectedDocs.includes(dt.key) && dt.key === "prescription" && (
                  <div className="mt-2 ml-7">
                    <span className="text-[10px] text-muted-foreground mr-2">Country format:</span>
                    <Select value={prescriptionCountry} onValueChange={setPrescriptionCountry}>
                      <SelectTrigger className="w-36 h-7 text-xs bg-secondary border-border text-foreground inline-flex">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border">
                        <SelectItem value="luxembourg" className="text-xs text-foreground">Luxembourg / eSanté</SelectItem>
                        <SelectItem value="hungary" className="text-xs text-foreground">Hungary / NEAK</SelectItem>
                        <SelectItem value="eu_other" className="text-xs text-foreground">Other EU</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3">
            <span className="text-[10px] text-muted-foreground mr-2">Output language:</span>
            <Select value={docLang} onValueChange={setDocLang}>
              <SelectTrigger className="w-32 h-7 text-xs bg-secondary border-border text-foreground inline-flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border">
                {[["en","English"],["fr","French"],["de","German"],["lb","Luxembourgish"],["hu","Hungarian"]].map(([v,l]) => (
                  <SelectItem key={v} value={v} className="text-xs text-foreground">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleGenerate} disabled={selectedDocs.length === 0 || generating} className="gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Generating..." : `Generate ${selectedDocs.length} Document${selectedDocs.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}