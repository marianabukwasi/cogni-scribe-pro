import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Sparkles, FileText, AlertTriangle, Check, Eye,
  MessageSquare, Send, Pencil, X, Settings, Clock,
  Globe, RefreshCw
} from "lucide-react";

// ─── Profession-Adaptive Summary Fields ─────────────────
type ProfKey = "medical" | "legal" | "ngo" | "therapy" | "generic";

function getProfKey(profession?: string): ProfKey {
  if (!profession) return "medical";
  if (profession === "medical_doctor") return "medical";
  if (profession === "lawyer") return "legal";
  if (["ngo_caseworker", "refugee_support", "social_worker"].includes(profession)) return "ngo";
  if (profession === "therapist") return "therapy";
  return "generic";
}

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
    "Nature of Issue": "Commercial contract dispute. Client alleges breach of terms by supplier who failed to deliver goods within agreed timeframe, resulting in significant financial losses to client's business operations.",
    "Key Facts Stated": "Contract signed on 15 January 2026. Delivery deadline was 1 March 2026. No delivery made as of session date. Client has made three written requests for delivery. Supplier has acknowledged delay but offered no remediation.",
    "Relevant Dates Mentioned": "Contract execution: 15 January 2026\nDelivery deadline: 1 March 2026\nFirst complaint: 5 March 2026\nClient's last communication: 2 March 2026\nLimitation consideration: 6 years from breach",
    "Documents Referenced": "Original signed contract, three email exchanges with supplier, invoice records showing payment made, bank statements confirming wire transfer of €47,500.",
    "Client's Priorities": "Client's primary objective is delivery of goods rather than financial compensation. However, willing to pursue damages if delivery cannot be arranged. Concerned about ongoing business impact — estimates €3,000/week in lost revenue.",
  },
  ngo: {
    "Chronological Timeline of Events": "2024 — Left country of origin (Eritrea) due to military conscription threat\n2024-2025 — Travelled through Sudan, Libya (detained for ~3 months)\n2025 — Crossed Mediterranean, arrived in Italy\n2025 — Transferred to Luxembourg reception facility\n2026 — Current: awaiting asylum decision, 14 months in process",
    "Immediate Needs Identified": "1. Medical attention — untreated shoulder injury from Libya detention\n2. Psychological support — reports sleep disturbances and flashbacks\n3. Legal representation — asylum application needs supplementary evidence\n4. Language support — limited French, basic English, fluent Tigrinya",
    "Vulnerability Factors Mentioned": "Former unaccompanied minor (now 19). Physical injury from detention. Psychological trauma indicators. No family support network in Luxembourg. Limited language access.",
    "Languages Used in Session": "Session conducted primarily in English with interpreter support. Client switched to Tigrinya for detailed accounts of journey. Some French phrases used for administrative terms.",
    "Key Statements (verbatim)": "\"I left because they would take me to the army and I would never come back\"\n\n\"In Libya they kept us in a room with many people. We could not go outside for three months\"\n\n\"I want to study. I want to become someone.\"",
  },
  therapy: {
    "Presenting Concerns": "Client reports persistent low mood for approximately 6 weeks, coinciding with relationship breakdown. Describes difficulty motivating for daily activities, social withdrawal, and disrupted sleep patterns (early morning waking at 4am).",
    "Mood and Affect Observed": "Flat affect throughout session. Minimal eye contact initially, improving during rapport building. Tearful when discussing relationship breakdown. Speech rate slow but coherent. No psychomotor agitation observed.",
    "Key Themes": "Loss and grief related to relationship ending. Self-blame and rumination patterns. Social isolation as coping mechanism. Disrupted routine contributing to mood maintenance cycle. Pre-existing perfectionism potentially exacerbating response.",
    "Risk Factors Mentioned": "Client endorsed passive suicidal ideation ('sometimes I think it would be easier to not be here') but denied active plans or intent. No history of self-harm. Protective factors: close relationship with sister, commitment to pet care.",
    "Client's Goals Expressed": "\"I want to stop feeling like this\" — primary motivation is mood improvement. Client expressed interest in understanding why the breakup has affected them so deeply. Willing to engage with homework tasks between sessions.",
  },
  generic: {
    "Session Overview": "Comprehensive discussion covering the client's primary concerns and current situation. Key issues were identified and potential next steps discussed.",
    "Key Points Discussed": "Multiple areas were addressed during the session including the client's immediate needs, background context, and potential pathways forward.",
    "Action Items": "Several action items were identified during the session that require follow-up from both the professional and the client.",
    "Client's Perspective": "The client expressed their views and priorities clearly. Direct quotes captured for the record.",
  },
};

// ─── Demo Points to Note ────────────────────────────────
const getDemoFlags = (pk: ProfKey) => {
  if (pk === "medical") return [
    { severity: "critical" as const, title: "Drug Interaction Risk", detail: "Patient takes St. John's Wort — may interact with Acetazolamide and many other medications. Verify full medication list before prescribing.", source: "Detected from transcript at 00:01:55" },
    { severity: "important" as const, title: "Symptom Timeline Discrepancy", detail: "Patient stated symptoms began 2 weeks ago but intake form indicates intermittent headaches for 3 months. Clarify at next contact.", source: "Cross-referenced with intake form" },
    { severity: "info" as const, title: "Previous MRI Referenced", detail: "Patient mentioned a previous MRI — document not in file. Consider requesting records from prior provider.", source: "Detected from transcript at 00:01:18" },
  ];
  if (pk === "legal") return [
    { severity: "critical" as const, title: "Limitation Period Approaching", detail: "Depending on jurisdiction, the limitation period for contract claims may be approaching. Verify applicable limitation and consider protective measures.", source: "Risk analysis from case facts" },
    { severity: "important" as const, title: "Incomplete Documentation", detail: "Client referenced verbal agreements made before the written contract. These may affect interpretation of terms. Request any notes or witnesses.", source: "Detected from transcript" },
    { severity: "info" as const, title: "Jurisdiction Question", detail: "Contract may have cross-border elements — supplier registered in different EU country. Confirm applicable jurisdiction.", source: "Cross-referenced with client profile" },
  ];
  if (pk === "ngo") return [
    { severity: "critical" as const, title: "Safeguarding — Detention Trauma", detail: "Client described conditions of detention in Libya consistent with PTSD risk. Immediate psychological referral recommended. Document for asylum claim.", source: "Detected from transcript" },
    { severity: "important" as const, title: "Untreated Medical Condition", detail: "Client reports shoulder injury sustained during detention, untreated for approximately 18 months. Medical assessment urgently needed.", source: "Detected from transcript" },
    { severity: "important" as const, title: "Age Assessment Needed", detail: "Client states they are 19 but arrived as an unaccompanied minor. Verify age documentation and ensure age-appropriate support was provided.", source: "Cross-referenced with intake data" },
  ];
  if (pk === "therapy") return [
    { severity: "critical" as const, title: "Passive Suicidal Ideation", detail: "Client endorsed passive suicidal ideation. Safety plan discussed but not yet formalised. Complete PHQ-9 at next session and document safety assessment.", source: "Detected from transcript" },
    { severity: "important" as const, title: "Sleep Disruption Pattern", detail: "Early morning waking (4am) for 6+ weeks. Rule out physiological causes. Consider sleep hygiene psychoeducation and possible GP referral if persistent.", source: "Clinical observation" },
    { severity: "info" as const, title: "Medication History Gap", detail: "Client mentioned being prescribed medication 'a few years ago' but stopped. Clarify what was prescribed and reason for discontinuation.", source: "Detected from transcript" },
  ];
  return [
    { severity: "important" as const, title: "Follow-up Required", detail: "Several items from this session require follow-up action.", source: "Session analysis" },
  ];
};

// ─── Demo Way Forward Items ─────────────────────────────
const getDemoForwardItems = (pk: ProfKey) => {
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
    { category: "Alternative Strategy", title: "Mediation if LBA unsuccessful", color: "bg-orange-500/20 text-orange-400" },
    { category: "Next Step", title: "Client to provide documents within 5 business days", color: "bg-secondary text-muted-foreground" },
  ];
  if (pk === "ngo") return [
    { category: "Status Assessment", title: "Asylum application — eligible for protection", color: "bg-primary/20 text-primary" },
    { category: "Immediate Needs", title: "Medical assessment for shoulder injury", color: "bg-accent/20 text-accent" },
    { category: "Immediate Needs", title: "Psychological support referral (trauma)", color: "bg-accent/20 text-accent" },
    { category: "Service Referral", title: "Legal aid for supplementary asylum evidence", color: "bg-purple-500/20 text-purple-400" },
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

// ─── Demo Chat ──────────────────────────────────────────
const chatSuggestions: Record<ProfKey, string[]> = {
  medical: ["Any drug interactions I should check?", "What are alternative treatments for IIH?", "Draft a referral letter to neurology"],
  legal: ["Summarise the strengths and weaknesses of this case", "Draft a Letter Before Action", "What precedents apply here?"],
  ngo: ["What services are available for this client?", "Draft a referral to psychological support", "Summarise the timeline for the asylum file"],
  therapy: ["Suggest homework tasks for next session", "What validated scales should I use?", "Draft a risk assessment summary"],
  generic: ["Summarise the key points", "What should I follow up on?", "Draft a follow-up letter"],
};

const chatResponses: Record<string, string> = {
  "Any drug interactions I should check?": "Based on the session, the patient takes St. John's Wort, which has significant interactions:\n\n• **Acetazolamide** — Limited direct interaction, but monitor for metabolic effects\n• **SSRIs** — Serotonin syndrome risk if prescribed antidepressants\n• **Oral contraceptives** — Reduced effectiveness\n• **Warfarin/anticoagulants** — Reduced effectiveness\n\nRecommend patient discontinues St. John's Wort before starting any new prescriptions.",
  "What are alternative treatments for IIH?": "Alternatives to Acetazolamide for IIH:\n\n1. **Topiramate** — dual benefit for weight loss and ICP reduction\n2. **Furosemide** — if carbonic anhydrase inhibitors not tolerated\n3. **Weight management program** — fundamental for long-term management\n4. **Optic nerve sheath fenestration** — if vision threatened\n5. **CSF shunting** — for refractory cases",
  "Draft a referral letter to neurology": "I can prepare a referral letter including the patient's presenting symptoms, clinical findings, and your request for assessment. Shall I add this to the document generation basket?",
  "Summarise the strengths and weaknesses of this case": "**Strengths:**\n• Written contract with clear delivery terms\n• Payment made and documented\n• Three written complaints show reasonable mitigation\n• Supplier's acknowledgment of delay\n\n**Weaknesses:**\n• Verbal agreements may complicate interpretation\n• Cross-border jurisdiction question\n• Client's primary preference (delivery) may be harder to enforce than damages",
  "What services are available for this client?": "Based on this client's profile and needs in Luxembourg:\n\n• **Medical**: MSF clinic or national health registration\n• **Psychological**: OLAI psychological support service, Fondation Caritas\n• **Legal**: Passerell asbl for asylum legal aid\n• **Language**: Tigrinya interpreter via ASTI\n• **Housing**: OLAI/Caritas emergency accommodation",
  "Suggest homework tasks for next session": "Based on the CBT Behavioral Activation framework:\n\n1. **Activity monitoring** — Log daily activities and mood ratings (0-10)\n2. **Pleasant activity scheduling** — Plan 1-2 enjoyable activities before next session\n3. **Sleep diary** — Record bedtime, wake time, and quality\n4. **Thought record** — Capture 2-3 negative automatic thoughts when they arise",
};

// ─── Component ──────────────────────────────────────────
export default function PostSession() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const pk = getProfKey(profile?.profession);

  const [session, setSession] = useState<any>(null);
  const [summaryFields, setSummaryFields] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedForward, setSelectedForward] = useState<number[]>([]);
  const [flagStatuses, setFlagStatuses] = useState<Record<number, string>>({});
  const [regenerating, setRegenerating] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const flags = getDemoFlags(pk);
  const forwardItems = getDemoForwardItems(pk);
  const suggestions = chatSuggestions[pk];

  // Load session & init summary
  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).single().then(({ data }) => {
      setSession(data);
    });
  }, [id]);

  useEffect(() => {
    setSummaryFields(demoSummaries[pk]);
    // Pre-select all forward items
    setSelectedForward(getDemoForwardItems(pk).map((_, i) => i));
  }, [pk]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const startEdit = (field: string) => {
    setEditingField(field);
    setEditValue(summaryFields[field] || "");
  };

  const saveEdit = () => {
    if (editingField) {
      setSummaryFields(prev => ({ ...prev, [editingField]: editValue }));
      setEditingField(null);
      toast.success("Summary updated");
      // Persist to DB
      if (id) {
        supabase.from("sessions").update({ summary: { ...summaryFields, [editingField]: editValue } as any }).eq("id", id);
      }
    }
  };

  const cancelEdit = () => { setEditingField(null); setEditValue(""); };

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => {
      setRegenerating(false);
      toast.success("Summary regenerated");
    }, 2000);
  };

  const handleChat = (msg: string) => {
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: chatResponses[msg] || "I've analyzed the session context. Based on the transcript and findings, here are my recommendations for this case..."
      }]);
    }, 1200);
  };

  const toggleForward = (i: number) => {
    setSelectedForward(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const sessionDate = session?.start_time ? format(new Date(session.start_time), "d MMMM yyyy") : format(new Date(), "d MMMM yyyy");
  const sessionDuration = session?.duration_seconds ? `${Math.floor(session.duration_seconds / 60)} min ${session.duration_seconds % 60}s` : "—";
  const outputLang = session?.document_output_language?.toUpperCase() || "EN";
  const unreviewed = flags.filter((_, i) => !flagStatuses[i]).length;

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* ─── Main Content ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-xl text-foreground">{session?.client_name || "Session Review"}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{sessionDate} · {sessionDuration}
                </span>
                {session?.session_type && (
                  <span className="status-badge bg-secondary text-muted-foreground text-[10px]">{session.session_type}</span>
                )}
                <span className="status-badge bg-primary/20 text-primary text-[10px] flex items-center gap-1">
                  <Globe className="w-3 h-3" />{outputLang}
                </span>
                {session?.retention_decision && (
                  <span className="status-badge bg-accent/20 text-accent text-[10px]">
                    {session.retention_decision.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={() => navigate(`/session/${id}/documents`)} className="gap-2">
              <FileText className="w-4 h-4" />Generate Documents ({selectedForward.length})
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 bg-surface border border-border w-fit">
            <TabsTrigger value="summary" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">
              Summary
            </TabsTrigger>
            <TabsTrigger value="flags" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">
              Points to Note
              {unreviewed > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-warning/20 text-warning text-[10px] inline-flex items-center justify-center">
                  {unreviewed}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="forward" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">
              Way Forward
            </TabsTrigger>
          </TabsList>

          {/* ─── Summary Tab ────────────────────────── */}
          <TabsContent value="summary" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {Object.entries(summaryFields).map(([field, value]) => (
                  <div key={field} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-primary">{field}</h3>
                      {editingField === field ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2 text-accent">
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2 text-muted-foreground">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(field)} className="h-6 px-2 text-muted-foreground hover:text-foreground gap-1 text-xs">
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                      )}
                    </div>
                    {editingField === field ? (
                      <Textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="bg-secondary border-border text-foreground text-sm min-h-[100px]"
                        autoFocus
                      />
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
                {flags.map((f, i) => {
                  const reviewed = !!flagStatuses[i];
                  const sevClass = f.severity === "critical" ? "severity-critical" : f.severity === "important" ? "severity-important" : "severity-info";
                  const sevBadge = f.severity === "critical" ? "bg-destructive/20 text-destructive" : f.severity === "important" ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary";
                  return (
                    <div key={i} className={`glass-card p-5 ${sevClass} ${reviewed ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between">
                        <span className={`status-badge text-[10px] ${sevBadge}`}>
                          {f.severity === "critical" && "⚠ "}{f.severity.toUpperCase()}
                        </span>
                        {reviewed && <Check className="w-4 h-4 text-accent" />}
                      </div>
                      <h3 className="text-sm font-medium text-foreground mt-2">{f.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.detail}</p>
                      <p className="text-[10px] text-muted-foreground mt-2 italic">{f.source}</p>
                      {!reviewed && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" onClick={() => setFlagStatuses(s => ({ ...s, [i]: "reviewed" }))} className="text-xs border-border text-foreground gap-1">
                            <Eye className="w-3 h-3" />Reviewed
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setFlagStatuses(s => ({ ...s, [i]: "dismissed" }))} className="text-xs text-muted-foreground">
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Way Forward Tab ────────────────────── */}
          <TabsContent value="forward" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">Select items to include in generated documents:</p>
                {forwardItems.map((item, i) => {
                  const isSelected = selectedForward.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleForward(i)}
                      className={`suggestion-card ${isSelected ? "suggestion-card-selected" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`status-badge ${item.color} text-[10px]`}>{item.category}</span>
                        {isSelected && <Check className="w-4 h-4 text-accent" />}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-2">{item.title}</p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Chat Panel (persistent right side) ──────── */}
      <div className="w-80 border-l border-border flex flex-col bg-surface">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Session Assistant</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Ask anything about this session</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {chatMessages.length === 0 && (
              <>
                <div className="glass-card p-3 text-xs text-muted-foreground leading-relaxed">
                  I have full context from this session. Ask me about clinical details, drug interactions, treatment protocols, or ask me to draft documents.
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
            {chatMessages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-6" : "mr-2"}>
                <div className={`rounded-lg p-3 text-xs leading-relaxed ${m.role === "user" ? "bg-primary/20 text-foreground" : "glass-card text-foreground"}`}>
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) handleChat(chatInput); }}
              placeholder="Ask a question..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-xs"
            />
            <Button size="sm" onClick={() => chatInput.trim() && handleChat(chatInput)} disabled={!chatInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}