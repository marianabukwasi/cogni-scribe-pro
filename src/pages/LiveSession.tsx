import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useDeepgramTranscription, TranscriptLine } from "@/hooks/useDeepgramTranscription";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Mic, MicOff, Pause, Play, Square, Clock, Shield, AlertTriangle,
  Check, X, Sparkles, Bold, List, Highlighter, Bell, BellOff,
  Plus, RefreshCw, FileText, Archive, Timer, WifiOff, Loader2
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────
interface Utterance {
  speaker: string;
  lang: string;
  time: string;
  text: string;
  lowConfidence?: boolean;
}

interface Suggestion {
  category: string;
  title: string;
  detail: string;
  confidence?: string;
  section: string;
}

interface Alert {
  id: string;
  severity: "critical" | "important" | "info";
  message: string;
  timestamp: string;
  read: boolean;
}

interface BasketItem {
  id: string;
  category: string;
  title: string;
  detail: string;
  isCustom?: boolean;
}

// ─── Demo Transcript ───────────────────────────────────
const demoTranscript: Utterance[] = [
  { speaker: "Professional", lang: "EN", time: "00:00:12", text: "Good morning. How have you been feeling since our last visit?" },
  { speaker: "Client", lang: "EN", time: "00:00:18", text: "The headaches have been getting worse. Especially in the mornings when I wake up." },
  { speaker: "Professional", lang: "EN", time: "00:00:28", text: "I see. Can you describe the quality of the pain? Is it throbbing, sharp, or more of a pressure feeling?" },
  { speaker: "Client", lang: "FR", time: "00:00:38", text: "C'est plutôt une pression... comme si ma tête allait exploser. Et ma vision devient floue parfois." },
  { speaker: "Professional", lang: "EN", time: "00:00:52", text: "Visual disturbances with the headache — that's important. How long have you been experiencing the visual changes?" },
  { speaker: "Client", lang: "EN", time: "00:01:05", text: "About two weeks now. Sometimes I see double, especially when looking to the side.", lowConfidence: true },
  { speaker: "Professional", lang: "EN", time: "00:01:18", text: "Have you noticed any new medications or changes in your routine recently?" },
  { speaker: "Client", lang: "EN", time: "00:01:28", text: "I started taking some new supplements. And I've been under a lot of stress at work." },
  { speaker: "Professional", lang: "DE", time: "00:01:42", text: "Welche Nahrungsergänzungsmittel nehmen Sie ein? Das ist wichtig für die Diagnose." },
  { speaker: "Client", lang: "EN", time: "00:01:55", text: "I'm taking St. John's Wort for my mood, and some vitamin D and omega-3." },
  { speaker: "Professional", lang: "EN", time: "00:02:08", text: "I'd like to check your eye pressure and do a fundoscopy today. I'm also going to refer you to ophthalmology." },
];

const demoAlerts: Alert[] = [
  { id: "1", severity: "critical", message: "Drug interaction: St. John's Wort detected — may interact with SSRIs and oral contraceptives. Verify patient's full medication list.", timestamp: "00:01:55", read: false },
];

// ─── Profession-Adaptive Config ─────────────────────────
type ProfessionKey = "medical" | "legal" | "ngo" | "therapy" | "generic";

const professionLabelMap: Record<ProfessionKey, Record<string, string>> = {
  medical: { diagnosis: "Diagnosis", action: "Medication", procedure: "Procedure", referral: "Referral", warning: "Warning", followup: "Follow-up", alternative: "If First-Line Fails" },
  legal: { diagnosis: "Case Assessment", action: "Legal Strategy", procedure: "Required Documents", referral: "Referral to Specialist", warning: "Legal Risk", followup: "Next Step", alternative: "Alternative Strategy" },
  ngo: { diagnosis: "Status Assessment", action: "Immediate Needs", procedure: "Service Referral", referral: "Application Type", warning: "Safeguarding", followup: "Follow-up", alternative: "Alternative Support" },
  therapy: { diagnosis: "DSM Assessment", action: "Therapeutic Approach", procedure: "Medication Review", referral: "Crisis Referral", warning: "Safety Concern", followup: "Follow-up", alternative: "Alternative Approach" },
  generic: { diagnosis: "Assessment", action: "Recommended Action", procedure: "Procedure", referral: "Referral", warning: "Warning", followup: "Next Step", alternative: "Alternative" },
};

const sectionOrder = ["warnings", "diagnoses", "actions", "alternatives", "referrals", "followups"] as const;

const sectionTitles: Record<ProfessionKey, Record<typeof sectionOrder[number], string>> = {
  medical: { warnings: "Active Warnings", diagnoses: "Likely Diagnoses", actions: "Recommended Actions", alternatives: "If First-Line Fails", referrals: "Referrals", followups: "Follow-up Recommendations" },
  legal: { warnings: "Legal Risks", diagnoses: "Case Assessment", actions: "Legal Strategy", alternatives: "Alternative Strategies", referrals: "Specialist Referrals", followups: "Next Steps" },
  ngo: { warnings: "Safeguarding Concerns", diagnoses: "Status Assessment", actions: "Immediate Needs", alternatives: "Alternative Support", referrals: "Service Referrals", followups: "Follow-up Actions" },
  therapy: { warnings: "Safety Concerns", diagnoses: "DSM Assessment", actions: "Therapeutic Approach", alternatives: "Alternative Approaches", referrals: "Crisis Referrals", followups: "Follow-up Plan" },
  generic: { warnings: "Active Warnings", diagnoses: "Assessment", actions: "Recommended Actions", alternatives: "Alternatives", referrals: "Referrals", followups: "Follow-up" },
};

function getProfessionKey(profession?: string): ProfessionKey {
  if (!profession) return "medical";
  if (["medical_doctor"].includes(profession)) return "medical";
  if (["lawyer"].includes(profession)) return "legal";
  if (["ngo_caseworker", "refugee_support", "social_worker"].includes(profession)) return "ngo";
  if (["therapist"].includes(profession)) return "therapy";
  return "generic";
}

function getDemoSuggestions(pk: ProfessionKey): Suggestion[] {
  const l = professionLabelMap[pk];
  if (pk === "medical") return [
    { category: l.warning, title: "Drug Interaction Alert", detail: "St. John's Wort may interact with multiple medications. Verify current prescription list.", section: "warnings" },
    { category: l.diagnosis, title: "Idiopathic Intracranial Hypertension (IIH)", detail: "Headache with visual disturbances, pressure-type pain. Consider urgent fundoscopy.", confidence: "High match", section: "diagnoses" },
    { category: l.diagnosis, title: "Migraine with Aura", detail: "Visual disturbances preceding headache. Less likely given pressure quality.", confidence: "Possible", section: "diagnoses" },
    { category: l.diagnosis, title: "Tension-Type Headache", detail: "Bilateral pressure-type pain. Visual symptoms less typical.", confidence: "Consider", section: "diagnoses" },
    { category: l.action, title: "Acetazolamide (Diamox) 250mg", detail: "First-line for IIH. Start 250mg twice daily, titrate up.", section: "actions" },
    { category: l.procedure, title: "Urgent Fundoscopy", detail: "Required to assess papilledema. If confirmed, consider LP with opening pressure.", section: "actions" },
    { category: l.alternative, title: "Topiramate 25mg", detail: "Alternative if Acetazolamide not tolerated. Start low, titrate slowly.", section: "alternatives" },
    { category: l.referral, title: "Ophthalmology Referral", detail: "Visual field assessment and OCT for optic disc swelling.", section: "referrals" },
    { category: l.referral, title: "Neurology Consultation", detail: "If papilledema confirmed, neurological evaluation for secondary causes.", section: "referrals" },
    { category: l.followup, title: "Follow-up in 2 weeks", detail: "Review fundoscopy results and medication response.", section: "followups" },
  ];
  if (pk === "legal") return [
    { category: l.warning, title: "Statute of Limitations Risk", detail: "Case may be approaching limitation period. Verify dates immediately.", section: "warnings" },
    { category: l.diagnosis, title: "Contract Dispute — Breach of Terms", detail: "Likely actionable breach. Key: demonstrating material breach.", confidence: "High match", section: "diagnoses" },
    { category: l.action, title: "Send Letter Before Action", detail: "Formal notification. 14-day response window.", section: "actions" },
    { category: l.procedure, title: "Gather Supporting Documents", detail: "Original contract, correspondence, payment records.", section: "actions" },
    { category: l.alternative, title: "Mediation", detail: "Cost-effective alternative. May preserve business relationship.", section: "alternatives" },
    { category: l.referral, title: "Specialist Commercial Litigation", detail: "If claim exceeds €50,000.", section: "referrals" },
    { category: l.followup, title: "Client to provide documents within 5 days", detail: "Ensure all evidence gathered.", section: "followups" },
  ];
  if (pk === "ngo") return [
    { category: l.warning, title: "Safeguarding Concern", detail: "Client mentioned domestic violence. Assess immediate safety.", section: "warnings" },
    { category: l.diagnosis, title: "Asylum Application — Eligible", detail: "Conditions support international protection claim.", confidence: "High match", section: "diagnoses" },
    { category: l.action, title: "Emergency Housing Application", detail: "Client without stable accommodation. Submit urgent request.", section: "actions" },
    { category: l.action, title: "Medical Assessment Referral", detail: "Untreated medical conditions. Arrange health screening.", section: "actions" },
    { category: l.referral, title: "Legal Aid for Asylum", detail: "Connect with legal aid for asylum application support.", section: "referrals" },
    { category: l.followup, title: "Follow-up in 1 week", detail: "Check housing, medical, and documentation progress.", section: "followups" },
  ];
  if (pk === "therapy") return [
    { category: l.warning, title: "Safety Assessment Needed", detail: "Client expressed passive suicidal ideation. Complete PHQ-9.", section: "warnings" },
    { category: l.diagnosis, title: "Major Depressive Disorder — Moderate", detail: "Persistent low mood, sleep disturbance, anhedonia >2 weeks.", confidence: "High match", section: "diagnoses" },
    { category: l.diagnosis, title: "Generalized Anxiety Disorder", detail: "Excessive worry, difficulty concentrating. Consider GAD-7.", confidence: "Possible", section: "diagnoses" },
    { category: l.action, title: "CBT — Behavioral Activation", detail: "Evidence-based first-line for moderate depression.", section: "actions" },
    { category: l.procedure, title: "SSRI Review with GP", detail: "Coordinate with GP for medication consideration.", section: "actions" },
    { category: l.alternative, title: "ACT-based Approach", detail: "Acceptance and Commitment Therapy as alternative.", section: "alternatives" },
    { category: l.referral, title: "Psychiatry Referral", detail: "If symptoms worsen or medication management needed.", section: "referrals" },
    { category: l.followup, title: "Weekly sessions for 6 weeks", detail: "Reassess after 6 sessions. Track PHQ-9.", section: "followups" },
  ];
  return [
    { category: l.warning, title: "Compliance Risk", detail: "Review regulatory requirements.", section: "warnings" },
    { category: l.diagnosis, title: "Initial Assessment Complete", detail: "Key factors identified.", confidence: "High match", section: "diagnoses" },
    { category: l.action, title: "Document Findings", detail: "Record observations in structured format.", section: "actions" },
    { category: l.followup, title: "Schedule Follow-up", detail: "Book next appointment within 2 weeks.", section: "followups" },
  ];
}

// ─── Category Colours ───────────────────────────────────
function getCategoryColor(cat: string): string {
  const lower = cat.toLowerCase();
  if (lower.includes("warning") || lower.includes("risk") || lower.includes("safety") || lower.includes("safeguarding")) return "bg-destructive/20 text-destructive";
  if (lower.includes("diagnos") || lower.includes("assessment") || lower.includes("dsm")) return "bg-primary/20 text-primary";
  if (lower.includes("medic") || lower.includes("immediate") || lower.includes("strategy") || lower.includes("therapeutic") || lower.includes("cbt") || lower.includes("action")) return "bg-accent/20 text-accent";
  if (lower.includes("procedure") || lower.includes("document") || lower.includes("review") || lower.includes("fundos")) return "bg-warning/20 text-warning";
  if (lower.includes("referral") || lower.includes("crisis") || lower.includes("application") || lower.includes("specialist")) return "bg-purple-500/20 text-purple-400";
  if (lower.includes("alternative") || lower.includes("first-line") || lower.includes("if first")) return "bg-orange-500/20 text-orange-400";
  if (lower.includes("follow")) return "bg-secondary text-muted-foreground";
  return "bg-secondary text-muted-foreground";
}

// ─── Component ──────────────────────────────────────────
export default function LiveSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemo } = useDemo();
  const deepgram = useDeepgramTranscription();

  const pk = getProfessionKey(profile?.profession);
  const sections = sectionTitles[pk];
  const demoSuggestions = getDemoSuggestions(pk);

  const [session, setSession] = useState<any>(null);
  const [paused, setPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [notes, setNotes] = useState("");
  const [visibleLines, setVisibleLines] = useState(0);
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showScrubDialog, setShowScrubDialog] = useState(false);
  const [scrubText, setScrubText] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [scrubLog, setScrubLog] = useState<string[]>([]);
  const [customBasketItem, setCustomBasketItem] = useState("");
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showDecisionGate, setShowDecisionGate] = useState(false);
  const [selectedRetention, setSelectedRetention] = useState<string | null>(null);
  const [purgeTimer, setPurgeTimer] = useState((profile?.auto_purge_minutes || 10) * 60);
  const [decisionMade, setDecisionMade] = useState(false);
  const [liveStarted, setLiveStarted] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const lastNotesLength = useRef(0);

  // The current transcript lines — either from Deepgram or demo simulation
  const transcriptLines: (TranscriptLine & { isInterim?: boolean })[] = isDemo
    ? demoTranscript.slice(0, visibleLines)
    : deepgram.lines;

  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).single().then(({ data }) => {
      setSession(data);
      if (data?.manual_notes) setNotes(data.manual_notes);
      if (data?.status === "ended") setSessionEnded(true);
    });
  }, [id]);

  useEffect(() => {
    if (paused || sessionEnded) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [paused, sessionEnded]);

  // Demo mode: simulate transcript lines appearing
  useEffect(() => {
    if (!isDemo) return;
    if (paused || sessionEnded || visibleLines >= demoTranscript.length) return;
    const t = setTimeout(() => {
      setVisibleLines(v => v + 1);
      setTimeout(() => {
        if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
      }, 50);
    }, 2500 + Math.random() * 2500);
    return () => clearTimeout(t);
  }, [visibleLines, paused, sessionEnded, isDemo]);

  // Live mode: auto-scroll when new lines arrive
  useEffect(() => {
    if (isDemo) return;
    setTimeout(() => {
      if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }, 50);
  }, [deepgram.lines.length, isDemo]);

  // Start live transcription (non-demo)
  const startLiveTranscription = async () => {
    if (isDemo) return;
    const ok = await deepgram.connect(session?.session_language || "multi");
    if (ok) {
      setLiveStarted(true);
      toast.success("Live transcription started");
    } else if (deepgram.micPermission === "denied") {
      toast.error("Microphone access is required for live transcription");
    } else {
      toast.error("Could not start transcription — falling back to demo mode");
    }
  };

  // Handle pause/resume for live mode
  useEffect(() => {
    if (isDemo || !liveStarted) return;
    if (paused) deepgram.pause();
    else deepgram.resume();
  }, [paused, isDemo, liveStarted]);

  useEffect(() => {
    if (visibleLines >= 10 && alerts.length === 0) setAlerts([...demoAlerts]);
  }, [visibleLines, alerts.length]);

  useEffect(() => {
    if (paused || sessionEnded) return;
    const iv = setInterval(() => {
      setRefreshCountdown(c => {
        if (c <= 1) { toast.info("AI suggestions refreshed", { duration: 1500 }); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [paused, sessionEnded]);

  useEffect(() => {
    if (!id || !notes) return;
    const t = setTimeout(() => { supabase.from("sessions").update({ manual_notes: notes }).eq("id", id); }, 10000);
    return () => clearTimeout(t);
  }, [notes, id]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const togglePause = () => setPaused(p => !p);

  const isInBasket = (s: Suggestion) => basketItems.some(b => !b.isCustom && b.title === s.title);

  const toggleSuggestion = (s: Suggestion) => {
    if (s.section === "warnings") return;
    if (isInBasket(s)) {
      setBasketItems(prev => prev.filter(b => b.title !== s.title || b.isCustom));
    } else {
      setBasketItems(prev => [...prev, { id: crypto.randomUUID(), category: s.category, title: s.title, detail: s.detail }]);
    }
  };

  const removeFromBasket = (itemId: string) => setBasketItems(prev => prev.filter(b => b.id !== itemId));

  const addCustomToBasket = () => {
    if (!customBasketItem.trim()) return;
    setBasketItems(prev => [...prev, { id: crypto.randomUUID(), category: "Custom", title: customBasketItem.trim(), detail: "", isCustom: true }]);
    setCustomBasketItem("");
  };

  const handleNotesChange = (value: string) => {
    if (value.endsWith("\n\n") && value.length > lastNotesLength.current) {
      value = value + `[${formatTime(timer)}] `;
    }
    lastNotesLength.current = value.length;
    setNotes(value);
  };

  const insertNoteFormat = (format: string) => {
    if (format === "bold") setNotes(n => n + "**");
    if (format === "bullet") setNotes(n => n + "\n• ");
    if (format === "highlight") setNotes(n => n + "⚡ ");
  };

  const handleScrub = () => {
    if (!scrubText.trim()) return;
    setScrubLog(prev => [...prev, `[${new Date().toISOString()}] Detail scrubbed by professional`]);
    toast.success("Detail permanently scrubbed from record");
    setShowScrubDialog(false);
    setScrubText("");
  };

  const unreadAlerts = alerts.filter(a => !a.read).length;

  const handleEndSession = async () => {
    if (!id) return;
    // Save session state first
    await supabase.from("sessions").update({
      status: "ended" as any,
      end_time: new Date().toISOString(),
      duration_seconds: timer,
      manual_notes: notes,
      transcript: demoTranscript.slice(0, visibleLines) as any,
      selected_items: basketItems.map(b => ({ category: b.category, title: b.title, detail: b.detail, isCustom: b.isCustom || false })) as any,
    }).eq("id", id);
    setSessionEnded(true);
    setShowEndDialog(false);
    setShowDecisionGate(true);
  };

  // Auto-purge countdown for decision gate
  useEffect(() => {
    if (!showDecisionGate || decisionMade) return;
    if (purgeTimer <= 0) {
      handleRetentionDecision("summary_only");
      return;
    }
    const iv = setInterval(() => setPurgeTimer(t => t - 1), 1000);
    return () => clearInterval(iv);
  }, [showDecisionGate, purgeTimer, decisionMade]);

  const handleRetentionDecision = async (decision: string) => {
    if (!id || decisionMade) return;
    setDecisionMade(true);
    setSelectedRetention(decision);

    const retainedItems: string[] = [];
    if (decision === "summary_only") retainedItems.push("summary", "selected_items");
    if (decision === "transcript_summary") retainedItems.push("transcript", "summary", "selected_items");
    if (decision === "keep_everything") retainedItems.push("audio", "transcript", "summary", "selected_items");

    await supabase.from("sessions").update({
      retention_decision: decision as any,
      decision_timestamp: new Date().toISOString(),
    }).eq("id", id);

    // Simulate audio deletion for non-keep-everything
    if (decision !== "keep_everything") {
      await new Promise(r => setTimeout(r, 800));
    }

    toast.success(`Session saved. ${retainedItems.length} items retained.`, { duration: 3000 });

    setTimeout(() => {
      navigate(`/session/${id}/post`);
    }, 1500);
  };

  const formatPurgeTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const alertStyle = profile?.alert_style || ["silent_flash"];

  const groupedSuggestions = sectionOrder.reduce((acc, section) => {
    acc[section] = demoSuggestions.filter(s => s.section === section);
    return acc;
  }, {} as Record<typeof sectionOrder[number], Suggestion[]>);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ─── Top Bar ─────────────────────────────────── */}
      <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">{session?.client_name || "Session"}</span>
          {session?.session_type && <span className="status-badge bg-secondary text-muted-foreground text-[10px]">{session.session_type}</span>}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {alertStyle.includes("silent_flash") ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
            {alertStyle.includes("silent_flash") ? "Silent" : "Vibrate"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {unreadAlerts > 0 && (
            <button onClick={() => setShowAlerts(!showAlerts)} className="relative flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-warning pulse-recording" />
              <span className="text-xs text-warning font-medium">{unreadAlerts}</span>
            </button>
          )}
          {!paused && !sessionEnded && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive pulse-recording" />
              <span className="text-xs font-semibold text-destructive tracking-wide">LIVE</span>
            </div>
          )}
          <span className={`font-mono text-sm tabular-nums ${!paused && !sessionEnded ? "text-destructive" : "text-muted-foreground"}`}>
            <Clock className="w-3.5 h-3.5 inline mr-1" />{formatTime(timer)}
          </span>
          {!sessionEnded && (
            <>
              <Button variant="ghost" size="sm" onClick={togglePause} className="text-foreground gap-1.5">
                {paused ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowScrubDialog(true)} className="text-destructive gap-1.5">
                <Shield className="w-4 h-4" />Privacy: Scrub Detail
              </Button>
              <Button size="sm" onClick={() => setShowEndDialog(true)} className="bg-destructive/20 text-destructive hover:bg-destructive/30 gap-1.5">
                <Square className="w-3.5 h-3.5" />End Session
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alert dropdown */}
      {showAlerts && (
        <div className="absolute top-14 right-48 z-50 w-80 glass-card border border-warning/30 shadow-lg">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Alerts</span>
            <button onClick={() => setShowAlerts(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-3 space-y-2">
            {alerts.map(a => (
              <div key={a.id} className={`p-3 rounded-lg border ${a.severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-3.5 h-3.5 ${a.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                  <span className="text-[10px] text-muted-foreground">{a.timestamp}</span>
                </div>
                <p className="text-xs text-foreground">{a.message}</p>
                {!a.read && (
                  <Button size="sm" variant="ghost" className="text-xs text-primary mt-1.5 h-6 px-2"
                    onClick={() => setAlerts(prev => prev.map(al => al.id === a.id ? { ...al, read: true } : al))}>
                    Mark as reviewed
                  </Button>
                )}
                {alertStyle.includes("phone_vibration") && <p className="text-[10px] text-muted-foreground mt-1 italic">📳 Phone would vibrate now</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Three Columns ───────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Transcript (40%) */}
        <div className="w-[40%] border-r border-border flex flex-col">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Live Transcript</span>
            {!paused && !sessionEnded && <span className="status-badge bg-destructive/20 text-destructive text-[10px]">LIVE</span>}
            {paused && <span className="status-badge bg-secondary text-muted-foreground text-[10px]">PAUSED</span>}
            {sessionEnded && <span className="status-badge bg-secondary text-muted-foreground text-[10px]">ENDED</span>}
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {visibleLines === 0 && (
              <div className="text-center py-16">
                <Mic className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">Press Start Session to begin transcribing</p>
              </div>
            )}
            {demoTranscript.slice(0, visibleLines).map((line, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${line.speaker === "Professional" ? "text-primary" : line.speaker === "Client" ? "text-accent" : "text-warning"}`}>
                    {line.speaker}
                  </span>
                  <span className="status-badge bg-secondary text-muted-foreground text-[9px] px-1.5 py-0">[{line.lang}]</span>
                  <span className="text-[10px] text-muted-foreground">{line.time}</span>
                  {line.lowConfidence && <AlertTriangle className="w-3 h-3 text-warning" />}
                </div>
                <p className={`text-sm text-foreground leading-relaxed ${line.lowConfidence ? "underline decoration-warning decoration-wavy decoration-1" : ""}`}>
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Middle — AI Suggestions (35%) */}
        <div className="w-[35%] border-r border-border flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">AI Suggestions</span>
              <span className="status-badge bg-secondary text-muted-foreground text-[10px]">Click to select</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadAlerts > 0 && (
                <span className="status-badge bg-warning/20 text-warning text-[10px] gap-1">
                  <AlertTriangle className="w-3 h-3" />{unreadAlerts}
                </span>
              )}
              {!sessionEnded && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <RefreshCw className="w-3 h-3" />{refreshCountdown}s
                </span>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {sectionOrder.map(sectionKey => {
                const items = groupedSuggestions[sectionKey];
                if (!items || items.length === 0) return null;
                const isWarningSection = sectionKey === "warnings";
                return (
                  <div key={sectionKey}>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                      {sections[sectionKey]}
                    </h4>
                    <div className="space-y-2">
                      {items.map((s, i) => {
                        const selected = isInBasket(s);
                        return (
                          <div
                            key={`${sectionKey}-${i}`}
                            onClick={() => toggleSuggestion(s)}
                            className={`glass-card p-3.5 transition-all duration-200 ${
                              isWarningSection
                                ? "border-destructive/30 bg-destructive/5 cursor-default"
                                : selected
                                  ? "suggestion-card-selected cursor-pointer"
                                  : "cursor-pointer hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className={`status-badge ${getCategoryColor(s.category)} text-[10px]`}>
                                {isWarningSection && "⚠ "}{s.category}
                              </span>
                              <div className="flex items-center gap-2">
                                {s.confidence && (
                                  <span className={`text-[10px] italic ${
                                    s.confidence === "High match" ? "text-accent" : s.confidence === "Possible" ? "text-warning" : "text-muted-foreground"
                                  }`}>{s.confidence}</span>
                                )}
                                {selected && <Check className="w-4 h-4 text-accent" />}
                              </div>
                            </div>
                            <p className="text-sm font-medium text-foreground mt-2">{s.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* ─── Generation Basket ────────────────────── */}
          <div className="border-t border-border p-3 space-y-2 bg-surface">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">Generation Basket</span>
              </div>
              <span className="status-badge bg-primary/20 text-primary text-[10px]">{basketItems.length} items</span>
            </div>
            {basketItems.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-1">
                {basketItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-secondary/50">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`status-badge ${item.isCustom ? "bg-secondary text-muted-foreground" : getCategoryColor(item.category)} text-[9px] shrink-0 px-1.5`}>
                        {item.isCustom ? "Custom" : item.category}
                      </span>
                      <span className="text-[11px] text-foreground truncate">{item.title}</span>
                    </div>
                    <button onClick={() => removeFromBasket(item.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={customBasketItem} onChange={e => setCustomBasketItem(e.target.value)}
                placeholder="Add custom item..."
                onKeyDown={e => { if (e.key === "Enter") addCustomToBasket(); }}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-xs h-8" />
              <Button size="sm" variant="outline" onClick={addCustomToBasket} disabled={!customBasketItem.trim()} className="border-border text-foreground h-8 px-2">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <Button size="sm" disabled={!sessionEnded || basketItems.length === 0}
              onClick={() => navigate(`/session/${id}/documents`)} className="w-full text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Generate Documents {!sessionEnded && "(after session)"}
            </Button>
          </div>
        </div>

        {/* Right — Manual Notes (25%) */}
        <div className="w-[25%] flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">My Notes</span>
          </div>
          <div className="px-3 py-1.5 border-b border-border flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => insertNoteFormat("bold")} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"><Bold className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => insertNoteFormat("bullet")} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"><List className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => insertNoteFormat("highlight")} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"><Highlighter className="w-3.5 h-3.5" /></Button>
          </div>
          <div className="flex-1 p-3">
            <Textarea value={notes} onChange={e => handleNotesChange(e.target.value)}
              placeholder="Type your notes here...&#10;&#10;Press Enter twice for auto-timestamp"
              className="h-full resize-none bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-sm font-mono leading-relaxed" />
          </div>
          <div className="px-3 py-1.5 border-t border-border text-right">
            <span className="text-[10px] text-muted-foreground">{notes.length} chars</span>
          </div>
        </div>
      </div>

      {/* ─── End Session Confirmation ────────────── */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader><DialogTitle className="text-foreground font-heading">End this session?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will stop the recording and move to the retention decision.</p>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowEndDialog(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleEndSession} className="bg-destructive text-destructive-foreground">Confirm End</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Decision Gate (Full-screen, non-dismissible) ── */}
      {showDecisionGate && (
        <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-3xl mx-auto px-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-heading text-foreground mb-2">What would you like to keep from this session?</h2>
              <p className="text-sm text-muted-foreground">
                Session with <span className="text-foreground font-medium">{session?.client_name || "Client"}</span> — {formatTime(timer)} — {format(new Date(), "d MMM yyyy")}
              </p>
            </div>

            {/* Auto-purge timer */}
            {!decisionMade && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <Timer className={`w-4 h-4 ${purgeTimer < 60 ? "text-destructive" : "text-warning"}`} />
                <span className={`text-sm font-mono ${purgeTimer < 60 ? "text-destructive" : "text-warning"}`}>
                  Auto-deleting audio and transcript in {formatPurgeTime(purgeTimer)} if no selection made
                </span>
              </div>
            )}

            {/* Three option cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* Option 1 — Summary Only */}
              <button
                onClick={() => handleRetentionDecision("summary_only")}
                disabled={decisionMade}
                className={`glass-card p-6 text-left transition-all duration-200 hover:border-primary/50 relative ${
                  selectedRetention === "summary_only" ? "border-accent bg-accent/5" : ""
                } ${decisionMade && selectedRetention !== "summary_only" ? "opacity-40" : ""}`}
              >
                <span className="status-badge bg-accent/20 text-accent text-[10px] mb-4 inline-block">Most Private</span>
                <div className="mb-3">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-base font-heading text-foreground mb-2">Summary Only</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The audio and full transcript will be permanently deleted. Only the AI-generated key points will be saved. Best for sensitive cases.
                </p>
                {selectedRetention === "summary_only" && (
                  <Check className="absolute top-4 right-4 w-5 h-5 text-accent" />
                )}
              </button>

              {/* Option 2 — Transcript + Summary (recommended) */}
              <button
                onClick={() => handleRetentionDecision("transcript_summary")}
                disabled={decisionMade}
                className={`glass-card p-6 text-left transition-all duration-200 relative ${
                  !decisionMade ? "border-primary/40 ring-1 ring-primary/20" : ""
                } ${selectedRetention === "transcript_summary" ? "border-accent bg-accent/5" : "hover:border-primary/50"} ${
                  decisionMade && selectedRetention !== "transcript_summary" ? "opacity-40" : ""
                }`}
              >
                <span className="status-badge bg-primary/20 text-primary text-[10px] mb-4 inline-block">Recommended</span>
                <div className="mb-3">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-base font-heading text-foreground mb-2">Transcript + Summary</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The audio will be deleted. The full text transcript and summary will be saved securely.
                </p>
                {selectedRetention === "transcript_summary" && (
                  <Check className="absolute top-4 right-4 w-5 h-5 text-accent" />
                )}
              </button>

              {/* Option 3 — Keep Everything */}
              <button
                onClick={() => handleRetentionDecision("keep_everything")}
                disabled={decisionMade}
                className={`glass-card p-6 text-left transition-all duration-200 hover:border-primary/50 relative ${
                  selectedRetention === "keep_everything" ? "border-accent bg-accent/5" : ""
                } ${decisionMade && selectedRetention !== "keep_everything" ? "opacity-40" : ""}`}
              >
                <span className="status-badge bg-warning/20 text-warning text-[10px] mb-4 inline-block">Full Record</span>
                <div className="mb-3">
                  <Archive className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-base font-heading text-foreground mb-2">Keep Everything</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Audio, transcript, and summary all saved. Use only when audio evidence may be needed.
                </p>
                {selectedRetention === "keep_everything" && (
                  <Check className="absolute top-4 right-4 w-5 h-5 text-accent" />
                )}
              </button>
            </div>

            {/* Post-decision confirmation */}
            {decisionMade && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 status-badge bg-accent/20 text-accent text-sm px-4 py-2">
                  <Check className="w-4 h-4" />
                  {selectedRetention !== "keep_everything" ? "Audio deleted." : ""} Redirecting to post-session review…
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Privacy Scrub Dialog ────────────────────── */}
      <Dialog open={showScrubDialog} onOpenChange={setShowScrubDialog}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader><DialogTitle className="text-foreground font-heading flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" /> Privacy: Scrub Detail
          </DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Describe the detail to permanently remove from this session record:</p>
          <Input value={scrubText} onChange={e => setScrubText(e.target.value)}
            placeholder="e.g. Patient's home address mentioned at 00:01:30"
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">This action is irreversible. The scrubbed content will not be recorded.</p>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => { setShowScrubDialog(false); setScrubText(""); }} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleScrub} disabled={!scrubText.trim()} className="bg-destructive text-destructive-foreground gap-1.5">
              <Shield className="w-4 h-4" />Confirm Scrub
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}