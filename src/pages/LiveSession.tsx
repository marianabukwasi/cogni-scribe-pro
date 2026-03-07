import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mic, Pause, Play, Square, Clock, Shield, AlertTriangle, Check, X, Sparkles } from "lucide-react";

const demoTranscript = [
  { speaker: "Professional", lang: "EN", time: "00:00:12", text: "Good morning. How have you been feeling since our last visit?" },
  { speaker: "Client", lang: "EN", time: "00:00:18", text: "The headaches have been getting worse. Especially in the mornings when I wake up." },
  { speaker: "Professional", lang: "EN", time: "00:00:28", text: "I see. Can you describe the quality of the pain? Is it throbbing, sharp, or more of a pressure feeling?" },
  { speaker: "Client", lang: "FR", time: "00:00:38", text: "C'est plutôt une pression... comme si ma tête allait exploser. Et ma vision devient floue parfois." },
  { speaker: "Professional", lang: "EN", time: "00:00:52", text: "Visual disturbances with the headache — that's important. How long have you been experiencing the visual changes?" },
  { speaker: "Client", lang: "EN", time: "00:01:05", text: "About two weeks now. Sometimes I see double, especially when looking to the side." },
  { speaker: "Professional", lang: "EN", time: "00:01:18", text: "Have you noticed any new medications or changes in your routine recently?" },
  { speaker: "Client", lang: "EN", time: "00:01:28", text: "I started taking some new supplements. And I've been under a lot of stress at work." },
];

const demoSuggestions = [
  { category: "Warning", color: "destructive", title: "Drug Interaction Alert", detail: "Patient mentioned supplements — verify no interaction with existing prescriptions. Certain herbal supplements can increase intracranial pressure.", confidence: "" },
  { category: "Diagnosis", color: "primary", title: "Idiopathic Intracranial Hypertension (IIH)", detail: "Headache with visual disturbances, pressure-type pain, bilateral papilledema pattern. Consider urgent fundoscopy.", confidence: "High match" },
  { category: "Diagnosis", color: "primary", title: "Migraine with Aura", detail: "Visual disturbances preceding/accompanying headache. Less likely given pressure quality and progressive course.", confidence: "Possible" },
  { category: "Medication", color: "accent", title: "Acetazolamide (Diamox) 250mg", detail: "First-line for IIH. Reduces CSF production. Start 250mg twice daily, titrate up.", confidence: "" },
  { category: "Procedure", color: "warning", title: "Urgent Fundoscopy", detail: "Required to assess papilledema. If papilledema confirmed, consider lumbar puncture with opening pressure.", confidence: "" },
  { category: "Referral", color: "purple", title: "Ophthalmology Referral", detail: "Visual field assessment and OCT to document any optic disc swelling.", confidence: "" },
];

export default function LiveSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [recording, setRecording] = useState(true);
  const [timer, setTimer] = useState(0);
  const [notes, setNotes] = useState("");
  const [visibleLines, setVisibleLines] = useState(0);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showScrubDialog, setShowScrubDialog] = useState(false);
  const [scrubText, setScrubText] = useState("");
  const [warnings, setWarnings] = useState(1);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).single().then(({ data }) => setSession(data));
  }, [id]);

  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [recording]);

  // Demo transcript animation
  useEffect(() => {
    if (visibleLines >= demoTranscript.length) return;
    const t = setTimeout(() => {
      setVisibleLines(v => v + 1);
      if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }, 3000 + Math.random() * 2000);
    return () => clearTimeout(t);
  }, [visibleLines]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const toggleItem = (i: number) => {
    if (demoSuggestions[i].category === "Warning") return;
    setSelectedItems(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleEndSession = async () => {
    if (!id) return;
    await supabase.from("sessions").update({
      status: "ended" as any,
      end_time: new Date().toISOString(),
      duration_seconds: timer,
      manual_notes: notes,
      selected_items: selectedItems.map(i => demoSuggestions[i]),
    }).eq("id", id);
    navigate(`/session/${id}/post`);
  };

  const categoryColors: Record<string, string> = {
    Warning: "bg-destructive/20 text-destructive",
    Diagnosis: "bg-primary/20 text-primary",
    Medication: "bg-accent/20 text-accent",
    Procedure: "bg-warning/20 text-warning",
    Referral: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">{session?.client_name || "Session"}</span>
          <span className="text-xs text-muted-foreground">{session?.session_type}</span>
        </div>
        <div className="flex items-center gap-4">
          {recording && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive pulse-recording" />
              <span className="text-xs font-medium text-destructive">LIVE</span>
            </div>
          )}
          <span className={`font-mono text-sm ${recording ? "text-destructive" : "text-muted-foreground"}`}>
            <Clock className="w-3.5 h-3.5 inline mr-1" />{formatTime(timer)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setRecording(!recording)} className="text-foreground">
            {recording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowScrubDialog(true)} className="text-destructive gap-1">
            <Shield className="w-4 h-4" />Scrub
          </Button>
          <Button size="sm" onClick={() => setShowEndDialog(true)} className="bg-destructive/20 text-destructive hover:bg-destructive/30 gap-1">
            <Square className="w-3 h-3" />End Session
          </Button>
        </div>
      </div>

      {/* Three Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Transcript */}
        <div className="w-[40%] border-r border-border flex flex-col">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Live Transcript</span>
            {recording && <span className="status-badge bg-destructive/20 text-destructive text-[10px]">LIVE</span>}
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {visibleLines === 0 && (
              <div className="text-center py-12">
                <Mic className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">Listening...</p>
              </div>
            )}
            {demoTranscript.slice(0, visibleLines).map((line, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${line.speaker === "Professional" ? "text-primary" : "text-accent"}`}>{line.speaker}</span>
                  <span className="status-badge bg-secondary text-muted-foreground text-[9px]">{line.lang}</span>
                  <span className="text-[10px] text-muted-foreground">{line.time}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{line.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Middle - AI Suggestions */}
        <div className="w-[35%] border-r border-border flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">AI Suggestions</span>
            </div>
            {warnings > 0 && (
              <span className="status-badge bg-warning/20 text-warning text-[10px]">
                <AlertTriangle className="w-3 h-3 mr-1" />{warnings} warning
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {demoSuggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => toggleItem(i)}
                className={`suggestion-card ${selectedItems.includes(i) ? "suggestion-card-selected" : ""} ${s.category === "Warning" ? "cursor-default" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`status-badge ${categoryColors[s.category] || "bg-secondary text-muted-foreground"} text-[10px]`}>{s.category}</span>
                  {selectedItems.includes(i) && <Check className="w-4 h-4 text-accent" />}
                  {s.confidence && <span className="text-[10px] text-muted-foreground">{s.confidence}</span>}
                </div>
                <p className="text-sm font-medium text-foreground mt-2">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
          {/* Generation Basket */}
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">{selectedItems.length} items selected</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedItems.map(i => (
                <span key={i} className="status-badge bg-accent/20 text-accent text-[10px] gap-1">
                  {demoSuggestions[i].title.slice(0, 20)}...
                  <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleItem(i); }} />
                </span>
              ))}
            </div>
            <Button size="sm" disabled className="w-full text-xs" variant="outline">Generate Documents (after session)</Button>
          </div>
        </div>

        {/* Right - Notes */}
        <div className="w-[25%] flex flex-col">
          <div className="p-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">My Notes</span>
          </div>
          <div className="flex-1 p-3">
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Type your notes here... timestamps auto-added on new paragraphs"
              className="h-full resize-none bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-sm"
            />
          </div>
          <div className="p-2 border-t border-border text-right">
            <span className="text-[10px] text-muted-foreground">{notes.length} chars</span>
          </div>
        </div>
      </div>

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader><DialogTitle className="text-foreground font-heading">End this session?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will stop the recording and move to the post-session review.</p>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowEndDialog(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleEndSession} className="bg-destructive text-destructive-foreground">Confirm End</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scrub Dialog */}
      <Dialog open={showScrubDialog} onOpenChange={setShowScrubDialog}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader><DialogTitle className="text-foreground font-heading">Privacy: Scrub Detail</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Describe the detail to permanently remove:</p>
          <Input value={scrubText} onChange={e => setScrubText(e.target.value)} className="bg-secondary border-border text-foreground" />
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowScrubDialog(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={() => { toast.success("Detail scrubbed from record"); setShowScrubDialog(false); setScrubText(""); }} className="bg-destructive text-destructive-foreground">Confirm Scrub</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
