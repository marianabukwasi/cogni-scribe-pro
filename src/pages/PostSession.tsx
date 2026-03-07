import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Archive, FileText, AlertTriangle, Check, Eye, MessageSquare, Send, ChevronRight, X, Download } from "lucide-react";

const demoSummary = {
  medical_doctor: {
    "Chief Complaint": "Progressive headaches with visual disturbances over 2 weeks",
    "Duration & History": "Symptoms began approximately 2 weeks ago, worsening in frequency and intensity. Morning predominance. No prior history of similar episodes.",
    "Current Medications Mentioned": "Patient reports starting new supplements (specific type to be confirmed)",
    "Key Clinical Findings": "Pressure-type headache, bilateral visual disturbances including diplopia on lateral gaze, morning predominance suggesting raised intracranial pressure",
    "Patient's Own Words": '"It feels like my head is going to explode" / "C\'est plutôt une pression"',
  },
  default: {
    "Summary": "Session covered main concerns and action items were identified.",
    "Key Points": "Multiple areas discussed with follow-up needed.",
    "Next Steps": "Review scheduled items and plan follow-up.",
  },
};

const demoFlags = [
  { severity: "critical", title: "Drug Interaction Risk", detail: "Patient mentioned supplements — verify no interaction with existing prescriptions before prescribing Acetazolamide.", source: "Detected from transcript at 00:01:28", class: "severity-critical" },
  { severity: "important", title: "Symptom Timeline Discrepancy", detail: "Patient stated symptoms began 2 weeks ago in session but intake form indicates intermittent headaches for 3 months. Clarify at next contact.", source: "Cross-referenced with intake form", class: "severity-important" },
  { severity: "info", title: "Previous MRI Referenced", detail: "Patient mentioned a previous MRI — document not in file. Consider requesting records.", source: "Detected from transcript at 00:01:18", class: "severity-info" },
];

const chatSuggestions = {
  medical_doctor: ["Any drug interactions I should check?", "What are alternative treatments?", "Draft a referral letter to neurology"],
  default: ["Summarise the key points", "What should I follow up on?", "Draft a follow-up letter"],
};

export default function PostSession() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [showDecisionGate, setShowDecisionGate] = useState(true);
  const [retentionChoice, setRetentionChoice] = useState<string | null>(null);
  const [purgeCountdown, setPurgeCountdown] = useState(600);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedItems, setSelectedItems] = useState<number[]>([1, 3, 4, 5]);
  const [flagStatuses, setFlagStatuses] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).single().then(({ data }) => {
      setSession(data);
      if (data?.retention_decision) setShowDecisionGate(false);
    });
  }, [id]);

  // Purge countdown
  useEffect(() => {
    if (!showDecisionGate || purgeCountdown <= 0) return;
    const iv = setInterval(() => setPurgeCountdown(c => {
      if (c <= 1) {
        setRetentionChoice("summary_only");
        setShowDecisionGate(false);
        return 0;
      }
      return c - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [showDecisionGate, purgeCountdown]);

  const handleRetention = async (choice: string) => {
    setRetentionChoice(choice);
    setShowDecisionGate(false);
    if (id) {
      await supabase.from("sessions").update({
        retention_decision: choice as any,
        decision_timestamp: new Date().toISOString(),
      }).eq("id", id);
    }
    toast.success(`Session saved — ${choice.replace(/_/g, " ")}`);
  };

  const profession = profile?.profession || "default";
  const summary = demoSummary[profession as keyof typeof demoSummary] || demoSummary.default;
  const suggestions = chatSuggestions[profession as keyof typeof chatSuggestions] || chatSuggestions.default;

  const handleChat = (msg: string) => {
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    setTimeout(() => {
      const responses: Record<string, string> = {
        "Any drug interactions I should check?": "Based on the session, the patient mentioned starting new supplements. Acetazolamide (Diamox) can interact with aspirin and other carbonic anhydrase inhibitors. I'd recommend confirming the specific supplements before prescribing. Key interactions to check: lithium (increased toxicity), high-dose aspirin (metabolic acidosis risk), and certain anticonvulsants.",
        "What are alternative treatments?": "For IIH, alternatives to Acetazolamide include:\n\n1. **Topiramate** — dual benefit for weight loss and ICP reduction\n2. **Furosemide** — if carbonic anhydrase inhibitors not tolerated\n3. **Weight management program** — fundamental for long-term management\n4. **Optic nerve sheath fenestration** — if vision threatened\n5. **CSF shunting** — for refractory cases",
        "Draft a referral letter to neurology": "I can prepare a referral letter. It would include the patient's presenting symptoms (2-week progressive headaches with visual disturbances), clinical findings suggesting raised ICP, and your request for urgent assessment including fundoscopy and possible LP. Shall I add this to the generation basket?",
      };
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: responses[msg] || "I'll analyze the session context and provide a detailed response. Based on the transcript and clinical findings, here are my recommendations..."
      }]);
    }, 1500);
  };

  const formatPurge = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Decision Gate
  if (showDecisionGate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <h1 className="font-heading text-3xl text-foreground text-center mb-2">What would you like to keep?</h1>
          <p className="text-muted-foreground text-center text-sm mb-8">
            Session with {session?.client_name || "Client"} — {session?.duration_seconds ? `${Math.floor(session.duration_seconds / 60)} min` : "Session"} — {new Date().toLocaleDateString()}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { key: "summary_only", icon: Sparkles, title: "Summary Only", desc: "Audio and full transcript permanently deleted. Only AI-generated key points saved.", badge: "Most Private", badgeClass: "bg-accent/20 text-accent" },
              { key: "transcript_summary", icon: FileText, title: "Transcript + Summary", desc: "Audio deleted. Full text transcript and summary saved securely.", badge: "Recommended", badgeClass: "bg-primary/20 text-primary" },
              { key: "keep_everything", icon: Archive, title: "Keep Everything", desc: "Audio, transcript, and summary all saved. Use when audio evidence needed.", badge: "Full Record", badgeClass: "bg-warning/20 text-warning" },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => handleRetention(opt.key)}
                className={`glass-card p-6 text-left hover:border-primary/50 transition-all ${opt.key === "transcript_summary" ? "ring-1 ring-primary/30" : ""}`}
              >
                <opt.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="text-foreground font-medium mb-2">{opt.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{opt.desc}</p>
                <span className={`status-badge ${opt.badgeClass}`}>{opt.badge}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-warning">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Auto-deleting in {formatPurge(purgeCountdown)} if no selection made
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl text-foreground">{session?.client_name || "Session"}</h1>
            <p className="text-xs text-muted-foreground">{session?.session_type} — {new Date(session?.created_at || "").toLocaleDateString()}</p>
          </div>
          <Button onClick={() => navigate(`/session/${id}/documents`)} className="gap-2">
            <FileText className="w-4 h-4" />Generate Documents ({selectedItems.length})
          </Button>
        </div>

        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 bg-surface border border-border w-fit">
            <TabsTrigger value="summary" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Summary</TabsTrigger>
            <TabsTrigger value="flags" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">
              Points to Note
              {demoFlags.filter((_, i) => !flagStatuses[i]).length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-warning/20 text-warning text-[10px] inline-flex items-center justify-center">
                  {demoFlags.filter((_, i) => !flagStatuses[i]).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="forward" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Way Forward</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
            {Object.entries(summary).map(([k, v]) => (
              <div key={k} className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-primary">{k}</h3>
                  <button className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{v}</p>
              </div>
            ))}
            <Button variant="outline" className="border-border text-muted-foreground gap-2">
              <Sparkles className="w-4 h-4" />Regenerate Summary
            </Button>
          </TabsContent>

          <TabsContent value="flags" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
            {demoFlags.map((f, i) => (
              <div key={i} className={`glass-card p-5 ${f.class} ${flagStatuses[i] ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <span className={`status-badge text-[10px] ${f.severity === "critical" ? "bg-destructive/20 text-destructive" : f.severity === "important" ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary"}`}>
                    {f.severity.toUpperCase()}
                  </span>
                  {flagStatuses[i] && <Check className="w-4 h-4 text-accent" />}
                </div>
                <h3 className="text-sm font-medium text-foreground mt-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{f.detail}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{f.source}</p>
                {!flagStatuses[i] && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setFlagStatuses(s => ({ ...s, [i]: "reviewed" }))} className="text-xs border-border text-foreground">
                      <Eye className="w-3 h-3 mr-1" />Reviewed
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setFlagStatuses(s => ({ ...s, [i]: "dismissed" }))} className="text-xs text-muted-foreground">Dismiss</Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="forward" className="flex-1 overflow-y-auto p-4 mt-0">
            <div className="space-y-3 mb-6">
              {[
                { category: "Diagnosis", title: "Idiopathic Intracranial Hypertension", color: "bg-primary/20 text-primary" },
                { category: "Medication", title: "Acetazolamide 250mg", color: "bg-accent/20 text-accent" },
                { category: "Procedure", title: "Urgent Fundoscopy", color: "bg-warning/20 text-warning" },
                { category: "Referral", title: "Ophthalmology Referral", color: "bg-purple-500/20 text-purple-400" },
                { category: "Referral", title: "Neurology Referral", color: "bg-purple-500/20 text-purple-400" },
                { category: "Follow-up", title: "2-week review appointment", color: "bg-secondary text-muted-foreground" },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedItems(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                  className={`suggestion-card ${selectedItems.includes(i) ? "suggestion-card-selected" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`status-badge ${item.color} text-[10px]`}>{item.category}</span>
                    {selectedItems.includes(i) && <Check className="w-4 h-4 text-accent" />}
                  </div>
                  <p className="text-sm font-medium text-foreground mt-2">{item.title}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Panel */}
      <div className="w-80 border-l border-border flex flex-col bg-surface">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Ask your Knowledge Base</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Ask anything about this session</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 && (
            <>
              <div className="glass-card p-3 text-xs text-muted-foreground">
                I have full context from this session. Ask me anything — drug interactions, treatment protocols, or ask me to draft documents.
              </div>
              <div className="space-y-2">
                {suggestions.map(s => (
                  <button key={s} onClick={() => handleChat(s)} className="w-full text-left text-xs px-3 py-2 rounded-md bg-secondary text-foreground hover:bg-primary/10 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`${m.role === "user" ? "ml-8" : "mr-4"}`}>
              <div className={`rounded-lg p-3 text-xs ${m.role === "user" ? "bg-primary/20 text-foreground" : "glass-card text-foreground"}`}>
                <p className="whitespace-pre-line">{m.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && chatInput && handleChat(chatInput)}
              placeholder="Ask a question..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-xs"
            />
            <Button size="sm" onClick={() => chatInput && handleChat(chatInput)} disabled={!chatInput}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
