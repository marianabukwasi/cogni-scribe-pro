import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Check, Download, FileText, Printer, Edit, Clock, Plus, Lock,
  ChevronDown, ChevronRight, Globe, ArrowLeft, Shield, AlertTriangle
} from "lucide-react";
import { generateDocumentPDF, generateAuditTrailPDF, generatePrescriptionPDF, generateReferralPDF } from "@/lib/pdfExport";

// ─── Types ──────────────────────────────────────────────
type ProfKey = "medical" | "legal" | "ngo" | "therapy" | "generic";

interface DocSection {
  key: string;
  title: string;
  content: string;
  edited: boolean;
  editedAt?: string;
}

interface AuditEntry {
  time: string;
  action: string;
  before?: string;
  after?: string;
}

interface PrescriptionItem {
  name: string;
  dosage: string;
  form: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

interface ReferralLetter {
  id: string;
  specialty: string;
  to: string;
  body: string;
  language: string;
  approved: boolean;
  urgency?: string;
  anonymised?: boolean;
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

function now() {
  return format(new Date(), "HH:mm");
}

// ─── Demo Data by Profession ────────────────────────────
function getDemoSections(pk: ProfKey): DocSection[] {
  if (pk === "medical") return [
    { key: "S", title: "Subjective", content: "Patient presents with progressive headaches over 2 weeks, described as pressure-type, worse in the mornings. Reports visual disturbances including diplopia on lateral gaze. States: \"C'est plutôt une pression... comme si ma tête allait exploser.\" Recently started St. John's Wort (self-prescribed for mood), Vitamin D, and Omega-3. No prior history of similar episodes. Reports increased work stress.", edited: false },
    { key: "O", title: "Objective", content: "Alert and oriented x4. Cranial nerve examination: diplopia on lateral gaze bilaterally. Visual acuity assessment pending ophthalmology referral. BMI 28.4. Vital signs: BP 128/82, HR 74, Temp 36.8°C. Fundoscopy required to assess for papilledema — not performed in clinic today.", edited: false },
    { key: "A", title: "Assessment", content: "1. Idiopathic Intracranial Hypertension (IIH) — suspected, high probability\n2. Migraine with aura — differential diagnosis, lower probability given pattern\n\nRationale: Pressure-type headache with morning predominance, bilateral visual disturbances, and diplopia pattern consistent with raised intracranial pressure. Obesity is a known risk factor.", edited: false },
    { key: "P", title: "Plan", content: "1. Urgent fundoscopy to assess for papilledema\n2. Initiate Acetazolamide (Diamox) 250mg BID if IIH confirmed\n3. Ophthalmology referral — visual field assessment and OCT\n4. Neurology referral if fundoscopy positive\n5. Discontinue St. John's Wort — interaction risk discussed\n6. Weight management counselling\n7. Follow-up in 2 weeks\n8. Patient advised to seek emergency care if acute vision loss", edited: false },
  ];
  if (pk === "therapy") return [
    { key: "B", title: "Behavior", content: "Client presented with flat affect, minimal eye contact initially improving during session. Speech rate slow but coherent. Tearful when discussing relationship breakdown. Reports persistent low mood for ~6 weeks, difficulty motivating for daily activities, social withdrawal, and early morning waking (4am). Endorsed passive suicidal ideation ('sometimes I think it would be easier to not be here') — no active plans or intent.", edited: false },
    { key: "I", title: "Intervention", content: "Rapport building and psychoeducation on depression cycle. Introduced behavioral activation model. Began activity monitoring (daily log homework). Conducted initial risk assessment — safety plan discussed informally. Explored protective factors: close relationship with sister, pet care commitment.", edited: false },
    { key: "R", title: "Response", content: "Client engaged well with behavioral activation rationale. Expressed relief at having explanation for experience ('I thought I was just being lazy'). Agreed to activity monitoring homework. Appeared slightly more animated by end of session. Acknowledged passive ideation without distress, identified sister as key support.", edited: false },
    { key: "P", title: "Plan", content: "1. Formalise safety plan at next session\n2. Complete PHQ-9 and GAD-7 at session 2\n3. Review activity log and identify patterns\n4. Begin graded task assignment\n5. Consider GP liaison re: SSRI if insufficient response to therapy\n6. Weekly sessions for initial 6-week block\n7. Supervision note: discuss risk level", edited: false },
  ];
  if (pk === "legal") return [
    { key: "date_parties", title: "Date and Parties", content: `Date: ${format(new Date(), "d MMMM yyyy")}\nAttendees: Client — [Client Name], Advisor — Dr. Sarah Chen\nMatter: Commercial Contract Dispute — Breach of Supply Agreement\nFile Reference: CC-2026-0147`, edited: false },
    { key: "advice_summary", title: "Summary of Advice Given", content: "Advised client that the facts as presented constitute a prima facie breach of contract under Luxembourg Civil Code Article 1184. The supplier's failure to deliver within the agreed timeframe, combined with acknowledgment of delay, provides a strong basis for claim.\n\nDiscussed two potential routes:\n1. Specific performance (delivery of goods) — client's preference\n2. Damages claim (€47,500 + ongoing losses at ~€3,000/week)\n\nAdvised that a Letter Before Action should be sent as first step, with 14-day response period.", edited: false },
    { key: "instructions", title: "Instructions Received", content: "Client instructs to pursue delivery of goods as primary objective. Authorises sending Letter Before Action. Willing to pursue damages if delivery cannot be arranged within reasonable timeframe. Client to provide all contract correspondence and bank statements within 5 business days.", edited: false },
    { key: "action_required", title: "Action Required", content: "1. Draft and send Letter Before Action within 48 hours\n2. Review original contract for jurisdiction and applicable law clauses\n3. Assess cross-border implications (Rome I Regulation)\n4. Prepare damages calculation schedule\n5. Research supplier's financial standing", edited: false },
    { key: "next_steps", title: "Next Steps", content: "Follow-up meeting scheduled for 2 weeks from today to review supplier response.\nIf no response to LBA: instruct on court proceedings.\nClient to contact office immediately if supplier makes direct approach.", edited: false },
  ];
  if (pk === "ngo") return [
    { key: "timeline", title: "Chronological Timeline", content: "2024 — Left Eritrea due to military conscription threat\n2024-2025 — Journey through Sudan and Libya (detained approximately 3 months in Libya)\n2025 — Mediterranean crossing, arrival in Italy\n2025 — Transfer to Luxembourg reception facility (OLAI)\n2026 — Asylum application pending (14 months in process). Current session.", edited: false },
    { key: "needs", title: "Needs Identified", content: "1. URGENT — Medical assessment for untreated shoulder injury (sustained during detention, ~18 months ago)\n2. URGENT — Psychological support — presenting with sleep disturbances, flashbacks, hypervigilance consistent with PTSD\n3. Legal representation — asylum application requires supplementary evidence\n4. Language support — requires Tigrinya interpreter for all official interactions\n5. Educational orientation — expressed desire to study", edited: false },
    { key: "actions", title: "Actions Taken This Session", content: "1. Detailed account recorded for case file\n2. Immediate medical referral initiated (MSF clinic)\n3. Psychological support referral to OLAI counselling service\n4. Contact made with Passerell asbl for legal aid\n5. Interpreter request submitted to ASTI", edited: false },
    { key: "referrals", title: "Referrals Made", content: "1. MSF Clinic Luxembourg — shoulder injury assessment (urgent)\n2. OLAI Psychological Support Service — trauma counselling\n3. Passerell asbl — asylum legal representation\n4. ASTI — Tigrinya interpreter services\n5. CASNA — educational orientation (pending medical/psych stabilisation)", edited: false },
    { key: "next_appointment", title: "Next Appointment", content: "Follow-up in 1 week to confirm all referrals actioned.\nPriority: verify medical appointment confirmed.\nEnsure interpreter arranged for next session.", edited: false },
  ];
  return [
    { key: "overview", title: "Session Overview", content: "Comprehensive discussion covering primary concerns and current situation.", edited: false },
    { key: "key_points", title: "Key Points", content: "Multiple areas addressed including immediate needs and potential next steps.", edited: false },
    { key: "actions", title: "Action Items", content: "Several action items identified requiring follow-up.", edited: false },
  ];
}

function getDemoFormatLabel(pk: ProfKey): string {
  if (pk === "medical") return "Clinical Note — SOAP Format";
  if (pk === "therapy") return "Progress Note — BIRP Format";
  if (pk === "legal") return "Case Note / File Note";
  if (pk === "ngo") return "Case Summary";
  return "Session Summary";
}

function getDemoPrescriptions(): PrescriptionItem[] {
  return [
    { name: "Acetazolamide (Diamox)", dosage: "250mg", form: "Tablet", frequency: "Twice daily", duration: "30 days", quantity: "60", instructions: "Take with food. Monitor for tingling in extremities. Avoid driving if experiencing dizziness." },
  ];
}

function getDemoReferrals(pk: ProfKey): ReferralLetter[] {
  if (pk === "medical") return [
    {
      id: "oph",
      specialty: "Ophthalmology",
      to: "Ophthalmology Department, Centre Hospitalier de Luxembourg",
      body: "Dear Colleague,\n\nI am writing to refer the above patient for urgent ophthalmological assessment.\n\nThis patient presents with a 2-week history of progressive headaches with morning predominance and bilateral visual disturbances including diplopia on lateral gaze. The clinical picture is concerning for idiopathic intracranial hypertension.\n\nI would be grateful for:\n- Visual field assessment\n- Optical coherence tomography (OCT)\n- Fundoscopy to assess for papilledema\n\nCurrent supplements: St. John's Wort (to be discontinued), Vitamin D, Omega-3.\n\nPlease do not hesitate to contact me if you require further information.\n\nWith kind regards,",
      language: "en",
      approved: false,
    },
    {
      id: "neuro",
      specialty: "Neurology",
      to: "Neurology Department, Centre Hospitalier de Luxembourg",
      body: "Dear Colleague,\n\nI am writing to refer the above patient for neurological assessment following suspected idiopathic intracranial hypertension.\n\nThe patient, a 34-year-old presenting with 2-week progressive pressure-type headaches with morning predominance, bilateral diplopia on lateral gaze, and BMI 28.4. Ophthalmology assessment has been simultaneously requested.\n\nI would be grateful for:\n- Neurological examination\n- Consideration of lumbar puncture with opening pressure measurement\n- MRV to exclude cerebral venous sinus thrombosis\n\nThank you for your time.\n\nWith kind regards,",
      language: "en",
      approved: false,
    },
  ];
  if (pk === "ngo") return [
    {
      id: "medical",
      specialty: "Medical Assessment",
      to: "MSF Clinic Luxembourg",
      body: "Dear Medical Team,\n\nI am referring the above beneficiary for urgent medical assessment.\n\nThe client reports an untreated shoulder injury sustained approximately 18 months ago during detention in Libya. The injury has not been assessed or treated since. Client reports persistent pain and limited range of motion.\n\nAdditionally, the client presents with indicators consistent with PTSD (sleep disturbances, flashbacks, hypervigilance) which may benefit from parallel psychological assessment.\n\nThe client requires a Tigrinya interpreter for all medical appointments.\n\nThis assessment is also relevant to the client's pending asylum application, as medical documentation of injuries may constitute important evidence.\n\nThank you for your urgent attention to this referral.",
      language: "en",
      approved: false,
      urgency: "Urgent",
    },
    {
      id: "psych",
      specialty: "Psychological Support",
      to: "OLAI Psychological Support Service",
      body: "Dear Colleagues,\n\nI am referring the above beneficiary for trauma-focused psychological support.\n\nThe client is a 19-year-old Eritrean national (former unaccompanied minor) who has experienced:\n- Forced displacement and threat of military conscription\n- Approximately 3 months detention in Libya\n- Mediterranean crossing\n\nPresenting symptoms include: sleep disturbances, flashbacks, hypervigilance, and social withdrawal. These symptoms are consistent with post-traumatic stress disorder and warrant specialist assessment.\n\nThe client requires a Tigrinya interpreter.\n\nPlease contact me to coordinate appointment scheduling.",
      language: "en",
      approved: false,
      urgency: "Urgent",
    },
  ];
  if (pk === "therapy") return [
    {
      id: "gp",
      specialty: "GP Liaison",
      to: "Client's General Practitioner",
      body: "Dear Doctor,\n\nI am writing regarding our shared patient who has commenced therapy for a moderate depressive episode.\n\nThe client presents with persistent low mood (6 weeks), early morning waking, social withdrawal, and passive suicidal ideation without active plans or intent. Protective factors are present.\n\nI have commenced Cognitive Behavioral Therapy with a behavioral activation focus. I would appreciate your consideration of:\n- SSRI medication review if insufficient response to therapy by week 6\n- Bloods to rule out organic causes (thyroid, vitamin D, B12)\n\nI will keep you informed of progress.\n\nWith kind regards,",
      language: "en",
      approved: false,
    },
  ];
  if (pk === "legal") return [
    {
      id: "lba",
      specialty: "Letter Before Action",
      to: "[Supplier Company Name and Address]",
      body: "Dear Sir/Madam,\n\nRe: Breach of Contract — Supply Agreement dated 15 January 2026\n\nWe act on behalf of [Client Name] in relation to the above matter.\n\nOur client entered into a written agreement with your company on 15 January 2026 for the supply of [goods], with an agreed delivery date of 1 March 2026. Payment of €47,500 was made in full by wire transfer on [date].\n\nDespite three written requests dated [dates], no delivery has been made. Your company acknowledged the delay on [date] but offered no remediation.\n\nThis constitutes a breach of the agreement and our client has suffered losses estimated at €3,000 per week since the delivery deadline.\n\nWe hereby demand:\n1. Delivery of the contracted goods within 14 days of this letter; or\n2. Full refund of €47,500 plus damages for ongoing losses\n\nShould we not receive a satisfactory response within 14 days, our client reserves the right to commence legal proceedings without further notice.\n\nYours faithfully,",
      language: "en",
      approved: false,
    },
  ];
  return [];
}

function getDemoAudit(pk: ProfKey): AuditEntry[] {
  const sections = getDemoSections(pk);
  return sections.map((s, i) => ({
    time: format(new Date(Date.now() - (sections.length - i) * 60000), "HH:mm"),
    action: `AI generated ${s.title} section`,
  }));
}

// ─── Component ──────────────────────────────────────────
export default function DocumentReview() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();

  const pk = getProfKey(profile?.profession);
  const hasPrescription = pk === "medical";

  const [tab, setTab] = useState("clinical");
  const [sections, setSections] = useState<DocSection[]>(() => getDemoSections(pk));
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>(() => getDemoAudit(pk));
  const [editing, setEditing] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [approved, setApproved] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState<number | null>(null);

  // Prescription
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>(() => getDemoPrescriptions());
  const [rxApproved, setRxApproved] = useState(false);
  const [showRxConfirm, setShowRxConfirm] = useState(false);
  const [rxCountry, setRxCountry] = useState(profile?.prescription_country_format || "luxembourg");

  // Referrals
  const [referrals, setReferrals] = useState<ReferralLetter[]>(() => getDemoReferrals(pk));
  const [activeReferral, setActiveReferral] = useState<string>(() => getDemoReferrals(pk)[0]?.id || "");
  const [editingReferral, setEditingReferral] = useState(false);
  const [referralEditBuffer, setReferralEditBuffer] = useState("");
  const [showRefConfirm, setShowRefConfirm] = useState(false);
  const [activeRefConfirm, setActiveRefConfirm] = useState("");

  const [session, setSession] = useState<any>(null);

  // Load session and AI-generated documents
  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).single().then(({ data }) => setSession(data));
    
    // Try loading AI-generated documents from DB
    if (!isDemo) {
      supabase.from("documents").select("*").eq("session_id", id).then(({ data: docs }) => {
        if (!docs || docs.length === 0) return; // Keep demo data
        
        // Find clinical/case/progress note
        const clinicalDoc = docs.find(d => 
          ["clinical_note", "case_note", "progress_note", "case_summary", "session_summary", "needs_assessment", "attendance_note", "action_items", "follow_up_letter", "draft_application", "risk_assessment"].includes(d.document_type)
        );
        if (clinicalDoc?.content) {
          try {
            const content = clinicalDoc.content as any;
            if (Array.isArray(content)) {
              const aiSections: DocSection[] = content.map((s: any) => ({
                key: s.section_name || s.key || "",
                title: s.section_name || s.title || "",
                content: s.content || "",
                edited: false,
              }));
              if (aiSections.length > 0) setSections(aiSections);
            } else if (typeof content === "object") {
              const aiSections: DocSection[] = Object.entries(content).map(([key, val]) => ({
                key,
                title: key,
                content: String(val),
                edited: false,
              }));
              if (aiSections.length > 0) setSections(aiSections);
            }
          } catch { /* keep demo */ }
        }
        
        // Find prescription
        const rxDoc = docs.find(d => d.document_type === "prescription");
        if (rxDoc?.content) {
          try {
            const content = rxDoc.content as any;
            if (Array.isArray(content)) {
              setRxItems(content.map((r: any) => ({
                name: r.medication_name || r.name || "",
                dosage: r.dosage || "",
                form: r.form || "",
                frequency: r.frequency || "",
                duration: r.duration || "",
                quantity: r.quantity || "",
                instructions: r.special_instructions || r.instructions || "",
              })));
            }
          } catch { /* keep demo */ }
        }
        
        // Find referral letters
        const refDocs = docs.filter(d => d.document_type === "referral_letter");
        if (refDocs.length > 0) {
          const aiReferrals: ReferralLetter[] = [];
          refDocs.forEach(doc => {
            try {
              const content = doc.content as any;
              if (Array.isArray(content)) {
                content.forEach((r: any, i: number) => {
                  aiReferrals.push({
                    id: `ref-${doc.id}-${i}`,
                    specialty: r.specialty || "Referral",
                    to: r.to || "",
                    body: r.body || "",
                    language: r.language || "en",
                    approved: false,
                    urgency: r.urgency,
                  });
                });
              } else if (typeof content === "object") {
                aiReferrals.push({
                  id: `ref-${doc.id}`,
                  specialty: content.specialty || "Referral",
                  to: content.to || "",
                  body: content.body || "",
                  language: content.language || "en",
                  approved: false,
                  urgency: content.urgency,
                });
              }
            } catch { /* skip */ }
          });
          if (aiReferrals.length > 0) {
            setReferrals(aiReferrals);
            setActiveReferral(aiReferrals[0].id);
          }
        }
        
        // Update audit trail
        const trail: AuditEntry[] = docs.map(d => ({
          time: format(new Date(d.created_at), "HH:mm"),
          action: `AI generated ${d.document_type.replace(/_/g, " ")}`,
        }));
        if (trail.length > 0) setAuditTrail(trail);
      });
    }
  }, [id, isDemo, pk]);

  const clientName = session?.client_name || "Client";
  const sessionDate = session?.start_time ? format(new Date(session.start_time), "d MMMM yyyy") : format(new Date(), "d MMMM yyyy");
  const profName = profile?.full_name || "Dr. Sarah Chen";
  const profOrg = profile?.organisation || "Luxembourg Health Clinic";
  const profReg = profile?.registration_number || "LU-MD-2024-001";

  // ─── Clinical Note Actions ────────────────────────────
  const startSectionEdit = (key: string) => {
    const s = sections.find(s => s.key === key);
    if (!s) return;
    setEditing(key);
    setEditBuffer(s.content);
  };

  const saveSectionEdit = () => {
    if (!editing) return;
    const before = sections.find(s => s.key === editing)?.content || "";
    setSections(prev => prev.map(s => s.key === editing ? { ...s, content: editBuffer, edited: true, editedAt: now() } : s));
    setAuditTrail(prev => [...prev, { time: now(), action: `Professional edited ${sections.find(s => s.key === editing)?.title} section`, before, after: editBuffer }]);
    setEditing(null);
    toast.success("Section updated");
  };

  const addSection = () => {
    const key = `custom_${Date.now()}`;
    setSections(prev => [...prev, { key, title: "New Section", content: "Enter content here...", edited: true }]);
    setAuditTrail(prev => [...prev, { time: now(), action: "Professional added new section" }]);
    setEditing(key);
    setEditBuffer("Enter content here...");
  };

  const handleApprove = () => {
    setApproved(true);
    setShowApproveConfirm(false);
    setAuditTrail(prev => [...prev, { time: now(), action: `Document approved by ${profName}` }]);
    toast.success("Document approved and locked");
    if (id && profile) {
      supabase.from("documents").insert({
        professional_id: profile.user_id,
        session_id: id,
        title: getDemoFormatLabel(pk),
        document_type: pk === "medical" ? "clinical_note" : pk === "therapy" ? "progress_note" : pk === "legal" ? "case_note" : "case_summary",
        content: { sections: sections.map(s => ({ key: s.key, title: s.title, content: s.content })) } as any,
        approved: true,
        approved_at: new Date().toISOString(),
        audit_trail: auditTrail as any,
        language: session?.document_output_language || "en",
      });
    }
  };

  // ─── Prescription Actions ─────────────────────────────
  const updateRx = (i: number, field: keyof PrescriptionItem, value: string) => {
    setRxItems(prev => prev.map((rx, idx) => idx === i ? { ...rx, [field]: value } : rx));
  };

  const addRx = () => {
    setRxItems(prev => [...prev, { name: "", dosage: "", form: "Tablet", frequency: "", duration: "", quantity: "", instructions: "" }]);
  };

  const removeRx = (i: number) => setRxItems(prev => prev.filter((_, idx) => idx !== i));

  const handleRxApprove = () => {
    setRxApproved(true);
    setShowRxConfirm(false);
    toast.success("Prescription signed and saved");
  };

  // ─── Referral Actions ─────────────────────────────────
  const currentRef = referrals.find(r => r.id === activeReferral);

  const startRefEdit = () => {
    if (!currentRef) return;
    setEditingReferral(true);
    setReferralEditBuffer(currentRef.body);
  };

  const saveRefEdit = () => {
    setReferrals(prev => prev.map(r => r.id === activeReferral ? { ...r, body: referralEditBuffer } : r));
    setEditingReferral(false);
    toast.success("Referral letter updated");
  };

  const approveRef = (refId: string) => {
    setReferrals(prev => prev.map(r => r.id === refId ? { ...r, approved: true } : r));
    setShowRefConfirm(false);
    toast.success("Referral letter approved");
  };

  const changeRefLang = (refId: string, lang: string) => {
    setReferrals(prev => prev.map(r => r.id === refId ? { ...r, language: lang } : r));
    toast.info(`Language changed — in production, the letter would be translated to ${lang === "fr" ? "French" : lang === "de" ? "German" : lang === "hu" ? "Hungarian" : "English"}`);
  };

  // Compute which tabs to show
  const tabs: { value: string; label: string; icon: typeof FileText }[] = [
    { value: "clinical", label: getDemoFormatLabel(pk).split(" — ")[0], icon: FileText },
  ];
  if (hasPrescription) tabs.push({ value: "prescription", label: "Prescription", icon: FileText });
  if (referrals.length > 0) tabs.push({ value: "referral", label: `Referral${referrals.length > 1 ? "s" : ""} (${referrals.length})`, icon: FileText });

  const countryConfig: Record<string, { label: string; badge: string; idLabel: string; regLabel: string }> = {
    luxembourg: { label: "Luxembourg / eSanté Format", badge: "eSanté Ready", idLabel: "SECU Number", regLabel: "CNS Registration" },
    hungary: { label: "Hungary / NEAK Format", badge: "NEAK Ready", idLabel: "TAJ Number", regLabel: "NEAK Licence" },
    eu_other: { label: "EU Cross-Border Format", badge: "EU Directive 2011/24/EU", idLabel: "Health Insurance ID", regLabel: "Professional Licence" },
  };

  const cc = countryConfig[rxCountry] || countryConfig.luxembourg;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/session/${id}/post`)} className="text-muted-foreground gap-1">
              <ArrowLeft className="w-4 h-4" />Back
            </Button>
            <div>
              <h1 className="font-heading text-lg text-foreground">Document Review — {clientName}</h1>
              <p className="text-xs text-muted-foreground">{sessionDate} · {profName}</p>
            </div>
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="mt-3">
          <TabsList className="bg-surface border border-border">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2">
                <t.icon className="w-4 h-4" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ─── Clinical Note Tab ────────────────────────── */}
      {tab === "clinical" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Document Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto glass-card p-8">
              {/* Doc Header */}
              <div className="mb-6 pb-4 border-b border-border">
                <h2 className="font-heading text-2xl text-foreground">{getDemoFormatLabel(pk)}</h2>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{profName} · {profOrg}</span>
                  <span>Reg: {profReg}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Patient: {clientName}</span>
                  <span>Date: {sessionDate}</span>
                </div>
                {approved && (
                  <div className="mt-3 flex items-center gap-2 text-accent">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-medium">Document approved and locked</span>
                  </div>
                )}
              </div>

              {/* Sections */}
              {sections.map(section => (
                <div key={section.key} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-primary">
                      {section.key.length <= 2 ? `${section.key} — ` : ""}{section.title}
                    </h3>
                    {!approved && (
                      <button
                        onClick={() => editing === section.key ? saveSectionEdit() : startSectionEdit(section.key)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {editing === section.key ? <><Check className="w-3.5 h-3.5" /> Save</> : <><Edit className="w-3.5 h-3.5" /> Edit</>}
                      </button>
                    )}
                  </div>
                  <div className={`border-l-2 ${section.edited ? "border-l-accent" : "border-l-primary/30"} pl-4`}>
                    {editing === section.key ? (
                      <textarea
                        value={editBuffer}
                        onChange={e => setEditBuffer(e.target.value)}
                        onKeyDown={e => { if (e.key === "Escape") setEditing(null); }}
                        className="w-full bg-secondary border border-border rounded-md p-3 text-sm text-foreground resize-none min-h-[120px] focus:ring-1 focus:ring-primary outline-none"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
                    )}
                  </div>
                  {section.edited && section.editedAt && (
                    <p className="text-[10px] text-accent mt-1 ml-4">Edited by professional at {section.editedAt}</p>
                  )}
                </div>
              ))}

              {!approved && (
                <Button variant="outline" onClick={addSection} className="w-full mb-6 border-border text-muted-foreground gap-2 border-dashed">
                  <Plus className="w-4 h-4" />Add Section
                </Button>
              )}

              {!approved ? (
                <Button onClick={() => setShowApproveConfirm(true)} className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Check className="w-4 h-4" />Verify and Approve
                </Button>
              ) : (
              <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2 border-border text-foreground" onClick={() => generateDocumentPDF({ formatLabel: getDemoFormatLabel(pk), profName, profOrg, profReg, clientName, sessionDate, sections: sections.map(s => ({ title: s.title, content: s.content })) })}><Download className="w-4 h-4" />Download PDF</Button>
                  <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Download className="w-4 h-4" />Download DOCX</Button>
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail Panel */}
          <div className="w-72 border-l border-border overflow-y-auto p-4 bg-surface shrink-0">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />Audit Trail
            </h3>
            <div className="space-y-2">
              {auditTrail.map((a, i) => (
                <div key={i}>
                  <button
                    onClick={() => a.before ? setExpandedAudit(expandedAudit === i ? null : i) : null}
                    className="flex items-start gap-2 w-full text-left group"
                  >
                    <Clock className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground">{a.time}</p>
                      <p className="text-xs text-foreground">{a.action}</p>
                    </div>
                    {a.before && (
                      expandedAudit === i ? <ChevronDown className="w-3 h-3 text-muted-foreground mt-1 shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
                    )}
                  </button>
                  {expandedAudit === i && a.before && (
                    <div className="ml-5 mt-1 space-y-1">
                      <div className="text-[10px] p-2 rounded bg-destructive/10 text-destructive/80 line-through max-h-20 overflow-y-auto">{a.before.slice(0, 200)}...</div>
                      <div className="text-[10px] p-2 rounded bg-accent/10 text-accent max-h-20 overflow-y-auto">{a.after?.slice(0, 200)}...</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-6 border-border text-muted-foreground text-xs gap-1">
              <Download className="w-3 h-3" />Export Audit Trail
            </Button>
          </div>
        </div>
      )}

      {/* ─── Prescription Tab ────────────────────────── */}
      {tab === "prescription" && hasPrescription && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto glass-card p-8">
            {/* Prescription Header */}
            <div className="mb-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-2xl text-foreground">Prescription</h2>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <p>{profName} · {profOrg}</p>
                    <p>Registration: {profReg}</p>
                    <p>Date: {sessionDate}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Select value={rxCountry} onValueChange={setRxCountry}>
                    <SelectTrigger className="w-44 h-8 text-xs bg-secondary border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border">
                      <SelectItem value="luxembourg" className="text-xs text-foreground">Luxembourg / eSanté</SelectItem>
                      <SelectItem value="hungary" className="text-xs text-foreground">Hungary / NEAK</SelectItem>
                      <SelectItem value="eu_other" className="text-xs text-foreground">EU Cross-Border</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="status-badge bg-accent/20 text-accent text-[10px] block text-center">{cc.badge}</span>
                </div>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Patient Name</Label>
                  <Input defaultValue={clientName} className="bg-secondary border-border text-foreground text-sm mt-0.5 h-8" readOnly={rxApproved} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Date of Birth</Label>
                  <Input defaultValue="01/05/1992" className="bg-secondary border-border text-foreground text-sm mt-0.5 h-8" readOnly={rxApproved} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">{cc.idLabel}</Label>
                  <Input placeholder="Required" className="bg-secondary border-border text-foreground text-sm mt-0.5 h-8" readOnly={rxApproved} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">{cc.regLabel}</Label>
                  <Input defaultValue={profReg} className="bg-secondary border-border text-foreground text-sm mt-0.5 h-8" readOnly={rxApproved} />
                </div>
              </div>

              {rxCountry === "eu_other" && (
                <div className="mt-3 p-2 rounded bg-primary/10 text-xs text-primary flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  This prescription follows EU Directive 2011/24/EU cross-border format
                </div>
              )}

              {rxApproved && (
                <div className="mt-3 flex items-center gap-2 text-accent">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-medium">Prescription signed and locked</span>
                </div>
              )}
            </div>

            {/* Medication Items */}
            {rxItems.map((rx, i) => (
              <div key={i} className="glass-card p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Medication (INN)</Label>
                    <Input value={rx.name} onChange={e => updateRx(i, "name", e.target.value)} className="bg-secondary border-border text-foreground mt-0.5 font-medium" readOnly={rxApproved} />
                  </div>
                  {!rxApproved && (
                    <Button variant="ghost" size="sm" onClick={() => removeRx(i)} className="text-destructive hover:text-destructive/80 h-8 px-2 text-xs">Remove</Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-[10px] text-muted-foreground">Dosage</Label><Input value={rx.dosage} onChange={e => updateRx(i, "dosage", e.target.value)} className="bg-secondary border-border text-foreground mt-0.5 h-8" readOnly={rxApproved} /></div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Form</Label>
                    <Select value={rx.form} onValueChange={v => updateRx(i, "form", v)} disabled={rxApproved}>
                      <SelectTrigger className="bg-secondary border-border text-foreground mt-0.5 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-surface border-border">
                        {["Tablet", "Capsule", "Liquid", "Injection", "Cream", "Inhaler", "Drops"].map(f => (
                          <SelectItem key={f} value={f} className="text-xs text-foreground">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px] text-muted-foreground">Frequency</Label><Input value={rx.frequency} onChange={e => updateRx(i, "frequency", e.target.value)} className="bg-secondary border-border text-foreground mt-0.5 h-8" readOnly={rxApproved} /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Duration</Label><Input value={rx.duration} onChange={e => updateRx(i, "duration", e.target.value)} className="bg-secondary border-border text-foreground mt-0.5 h-8" readOnly={rxApproved} /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Quantity to Dispense</Label><Input value={rx.quantity} onChange={e => updateRx(i, "quantity", e.target.value)} className="bg-secondary border-border text-foreground mt-0.5 h-8" readOnly={rxApproved} /></div>
                </div>
                <div className="mt-3">
                  <Label className="text-[10px] text-muted-foreground">Special Instructions</Label>
                  <Input value={rx.instructions} onChange={e => updateRx(i, "instructions", e.target.value)} className="bg-secondary border-border text-foreground mt-0.5 h-8" readOnly={rxApproved} />
                </div>
              </div>
            ))}

            {!rxApproved && (
              <Button variant="outline" onClick={addRx} className="w-full mb-4 border-border text-foreground gap-2 border-dashed">
                <Plus className="w-4 h-4" />Add Medication
              </Button>
            )}

            {!rxApproved ? (
              <Button onClick={() => setShowRxConfirm(true)} className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Check className="w-4 h-4" />Verify and Sign Prescription
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Download className="w-4 h-4" />PDF</Button>
                <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Printer className="w-4 h-4" />Print</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Referral Letters Tab ────────────────────── */}
      {tab === "referral" && referrals.length > 0 && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Referral sub-tabs */}
            {referrals.length > 1 && (
              <Tabs value={activeReferral} onValueChange={v => { setActiveReferral(v); setEditingReferral(false); }}>
                <TabsList className="bg-surface border border-border mb-4">
                  {referrals.map(r => (
                    <TabsTrigger key={r.id} value={r.id} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground text-xs">
                      {r.specialty}
                      {r.approved && <Check className="w-3 h-3 ml-1 text-accent" />}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {currentRef && (
              <div className="glass-card p-8">
                {/* Letter Header */}
                <div className="mb-6 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-xl text-foreground">{currentRef.specialty} Referral</h2>
                    <div className="flex items-center gap-2">
                      {currentRef.urgency && (
                        <span className={`status-badge text-[10px] ${currentRef.urgency === "Emergency" ? "bg-destructive/20 text-destructive" : currentRef.urgency === "Urgent" ? "bg-warning/20 text-warning" : "bg-secondary text-muted-foreground"}`}>
                          {currentRef.urgency}
                        </span>
                      )}
                      <Select value={currentRef.language} onValueChange={v => changeRefLang(currentRef.id, v)}>
                        <SelectTrigger className="w-28 h-7 text-xs bg-secondary border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-border">
                          {[["en","English"],["fr","French"],["de","German"],["hu","Hungarian"]].map(([v,l]) => (
                            <SelectItem key={v} value={v} className="text-xs text-foreground">{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    <p>Date: {sessionDate}</p>
                    <p>From: {profName}, {profOrg}</p>
                    <p>Re: {clientName}</p>
                  </div>
                  {currentRef.approved && (
                    <div className="mt-3 flex items-center gap-2 text-accent">
                      <Lock className="w-4 h-4" />
                      <span className="text-xs font-medium">Letter approved and locked</span>
                    </div>
                  )}
                </div>

                {/* To Field */}
                <div className="mb-4">
                  <Label className="text-[10px] text-muted-foreground">To</Label>
                  <Input
                    value={currentRef.to}
                    onChange={e => setReferrals(prev => prev.map(r => r.id === activeReferral ? { ...r, to: e.target.value } : r))}
                    className="bg-secondary border-border text-foreground mt-0.5"
                    readOnly={currentRef.approved}
                  />
                </div>

                {/* Letter Body */}
                <div className={`border-l-2 ${currentRef.approved ? "border-l-accent" : "border-l-primary/30"} pl-4`}>
                  {editingReferral ? (
                    <div>
                      <textarea
                        value={referralEditBuffer}
                        onChange={e => setReferralEditBuffer(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-md p-3 text-sm text-foreground resize-none min-h-[300px] focus:ring-1 focus:ring-primary outline-none"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={saveRefEdit} className="gap-1"><Check className="w-3 h-3" />Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingReferral(false)} className="text-muted-foreground">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{currentRef.body}</p>
                      <p className="text-sm text-foreground mt-4 font-medium">{profName}</p>
                      <p className="text-xs text-muted-foreground">{profOrg} · {profReg}</p>
                      {!currentRef.approved && (
                        <Button variant="ghost" size="sm" onClick={startRefEdit} className="mt-3 text-xs text-muted-foreground gap-1">
                          <Edit className="w-3 h-3" />Edit Letter
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Approval */}
                <div className="mt-6 pt-4 border-t border-border">
                  {!currentRef.approved ? (
                    <Button
                      onClick={() => { setActiveRefConfirm(currentRef.id); setShowRefConfirm(true); }}
                      className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Check className="w-4 h-4" />Approve Referral Letter
                    </Button>
                  ) : (
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Download className="w-4 h-4" />PDF</Button>
                      <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Printer className="w-4 h-4" />Print</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Confirmation Dialogs ────────────────────── */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent className="bg-surface border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Confirm Document Approval</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-2">
              I confirm this document accurately reflects my professional assessment. Once approved, the document will be locked and saved to the client record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApproveConfirm(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleApprove} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Check className="w-4 h-4" />Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRxConfirm} onOpenChange={setShowRxConfirm}>
        <DialogContent className="bg-surface border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Confirm Prescription</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-2">
              I confirm this prescription is clinically appropriate for this patient. This action will be logged with timestamp and professional ID.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRxConfirm(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleRxApprove} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Check className="w-4 h-4" />Sign Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRefConfirm} onOpenChange={setShowRefConfirm}>
        <DialogContent className="bg-surface border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Approve Referral Letter</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-2">
              I confirm this referral letter accurately reflects my professional assessment and the content of this session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRefConfirm(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={() => approveRef(activeRefConfirm)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Check className="w-4 h-4" />Approve Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
