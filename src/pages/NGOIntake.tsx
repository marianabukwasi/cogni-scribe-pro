import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Shield, Check, X, Globe, Plus, Trash2, Clock, ChevronRight,
  MessageSquare, Mic, Pause, Square, GripVertical, Edit2, AlertTriangle
} from "lucide-react";

// ─── NGO-specific languages (extended set) ────────────────
const ngoLanguages = [
  "English", "French", "German", "Arabic", "Tigrinya", "Somali",
  "Dari", "Pashto", "Amharic", "Luxembourgish", "Hungarian",
  "Spanish", "Dutch", "Italian", "Farsi", "Swahili", "Kurdish",
];

const interviewPurposes = [
  "Asylum Application", "Housing Application", "Social Services",
  "Medical Needs Assessment", "Emergency Support", "General Intake",
];

// ─── NGO consent (simpler, warmer) ────────────────────────
const ngoConsent: Record<string, { title: string; body: string; agree: string; disagree: string }> = {
  English: {
    title: "Before We Begin",
    body: "We are going to have a conversation to understand how we can help you. We will use a tool to help us remember what you tell us. You can ask us to stop at any time. Is that okay?",
    agree: "Yes, that's okay",
    disagree: "No, I don't want that",
  },
  French: {
    title: "Avant de commencer",
    body: "Nous allons avoir une conversation pour comprendre comment nous pouvons vous aider. Nous utilisons un outil pour nous aider à nous souvenir de ce que vous nous dites. Vous pouvez nous demander d'arrêter à tout moment. Est-ce que c'est d'accord ?",
    agree: "Oui, c'est d'accord",
    disagree: "Non, je ne veux pas",
  },
  German: {
    title: "Bevor wir beginnen",
    body: "Wir werden ein Gespräch führen, um zu verstehen, wie wir Ihnen helfen können. Wir verwenden ein Werkzeug, das uns hilft, sich zu erinnern, was Sie uns erzählen. Sie können uns jederzeit bitten aufzuhören. Ist das in Ordnung?",
    agree: "Ja, das ist in Ordnung",
    disagree: "Nein, das möchte ich nicht",
  },
  Arabic: {
    title: "قبل أن نبدأ",
    body: "سنجري محادثة لفهم كيف يمكننا مساعدتك. سنستخدم أداة لمساعدتنا في تذكر ما تخبرنا به. يمكنك أن تطلب منا التوقف في أي وقت. هل هذا مقبول؟",
    agree: "نعم، موافق",
    disagree: "لا، لا أريد ذلك",
  },
  Tigrinya: {
    title: "ቅድሚ ምጅማር",
    body: "ከመይ ክንሕግዘኩም ከም እንኽእል ንምርዳእ ዝርርብ ክንገብር ኢና። ዝነገርኩምና ንምዝካር ዝሕግዘና መሳርሒ ክንጥቀም ኢና። ኣብ ዝኾነ እዋን ክነቋርጽ ክትሓቱ ትኽእሉ ኢኹም። ሓራይ ድዩ?",
    agree: "እወ ሓራይ",
    disagree: "ኣይፋል",
  },
  Somali: {
    title: "Kahor intaynan bilaabin",
    body: "Waxaynu yeelan doonaa sheeko si aan u fahanno sida aan kugu caawin karno. Waxaynu isticmaali doonaa qalab inoo caawinaya inaan xasuusanno waxa aad noo sheegto. Waqti kasta waad na weydiin kartaa inaan joojinno. Ma habboon tahay?",
    agree: "Haa, waa habboon tahay",
    disagree: "Maya, ma rabo",
  },
  Dari: {
    title: "قبل از شروع",
    body: "ما یک گفتگو خواهیم داشت تا بفهمیم چگونه می‌توانیم به شما کمک کنیم. ما از ابزاری استفاده می‌کنیم که به ما کمک می‌کند آنچه را به ما می‌گویید به خاطر بسپاریم. شما می‌توانید هر زمان از ما بخواهید که متوقف شویم. آیا موافقید؟",
    agree: "بله، موافقم",
    disagree: "نه، نمی‌خواهم",
  },
  Pashto: {
    title: "د پیل دمخه",
    body: "موږ به یوه خبرداره وکړو چې پوه شو چې څنګه مو مرسته کولی شو. موږ به یوه وسیله وکاروو چې مو سره مرسته وکړي هغه څه چې تاسو موږ ته وایاست په یاد وساتو. تاسو هر وخت کولی شئ له موږ څخه وغواړئ چې ودریږو. ایا دا سم دی؟",
    agree: "هو، سم دی",
    disagree: "نه، نه غواړم",
  },
  Amharic: {
    title: "ከመጀመራችን በፊት",
    body: "እንዴት ልንረዳህ እንደምንችል ለመረዳት ውይይት እናደርጋለን። የነገርከንን ለማስታወስ የሚረዳን መሳሪያ እንጠቀማለን። በማንኛውም ጊዜ እንዲያቆሙ መጠየቅ ይችላሉ። ይስማማሉ?",
    agree: "አዎ ይስማማሉ",
    disagree: "አይ አልፈልግም",
  },
};

// ─── Demo timeline events ──────────────────────────────────
const demoTimeline = [
  { year: "2019", event: "Left home country — reason: conflict", transcript_idx: 0 },
  { year: "2020", event: "Arrived in transit country (Libya)", transcript_idx: 2 },
  { year: "2021", event: "Crossed Mediterranean — rescued at sea", transcript_idx: 4 },
  { year: "2022", event: "Arrived in Italy — temporary camp", transcript_idx: 6 },
  { year: "2023", event: "Relocated to Luxembourg", transcript_idx: 8 },
  { year: "2024", event: "Filed asylum application", transcript_idx: 10 },
];

const demoTranscript = [
  { speaker: "Caseworker", text: "Can you tell me a bit about when you first left your home?" },
  { speaker: "Beneficiary", text: "I left in 2019. There was fighting in my city. We had to leave quickly." },
  { speaker: "Caseworker", text: "Where did you go after that?" },
  { speaker: "Beneficiary", text: "First to a neighbouring country, then to Libya in 2020. It was very difficult there." },
  { speaker: "Caseworker", text: "I understand. What happened next?" },
  { speaker: "Beneficiary", text: "We tried to cross the sea in 2021. A boat rescued us. I was very scared." },
  { speaker: "Caseworker", text: "I'm glad you were rescued. Then you went to Italy?" },
  { speaker: "Beneficiary", text: "Yes, I was in a camp in Italy for about a year in 2022." },
  { speaker: "Caseworker", text: "And when did you come to Luxembourg?" },
  { speaker: "Beneficiary", text: "In 2023. A programme helped me relocate here." },
  { speaker: "Caseworker", text: "And your asylum application?" },
  { speaker: "Beneficiary", text: "I applied in early 2024. I'm still waiting for a decision." },
];

type Step = "setup" | "consent" | "session" | "decision" | "case-file";

export default function NGOIntake() {
  const { profile } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("setup");
  const [beneficiaryLang, setBeneficiaryLang] = useState("English");
  const [purpose, setPurpose] = useState("");
  const [caseRef, setCaseRef] = useState(`NGO-${Date.now().toString(36).toUpperCase()}`);
  const [anonymous, setAnonymous] = useState(true);
  const [notes, setNotes] = useState("");
  const [consentLang, setConsentLang] = useState("English");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState(isDemo ? demoTimeline : []);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [anonymiseOnSave, setAnonymiseOnSave] = useState(false);
  const [retentionChoice, setRetentionChoice] = useState("summary_only");

  const consent = ngoConsent[consentLang] || ngoConsent.English;

  // ─── Setup ───────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="font-heading text-3xl text-foreground mb-6">Intake Interview</h1>
        <div className="glass-card p-8 space-y-5">
          {/* Language first — prominent */}
          <div className="space-y-2">
            <Label className="text-foreground text-base font-medium">Beneficiary's Language</Label>
            <p className="text-muted-foreground text-xs">Select the language the beneficiary is most comfortable with</p>
            <Select value={beneficiaryLang} onValueChange={v => { setBeneficiaryLang(v); setConsentLang(v); }}>
              <SelectTrigger className="bg-secondary border-border text-foreground text-lg h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border">
                {ngoLanguages.map(l => <SelectItem key={l} value={l} className="text-foreground">{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Interview Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Select purpose" /></SelectTrigger>
              <SelectContent className="bg-surface border-border">
                {interviewPurposes.map(p => <SelectItem key={p} value={p} className="text-foreground">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
            <div>
              <p className="text-foreground text-sm">Anonymous beneficiary</p>
              <p className="text-muted-foreground text-xs">No name required — case reference number assigned</p>
            </div>
            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground text-xs">Case Reference</Label>
            <Input value={caseRef} onChange={e => setCaseRef(e.target.value)}
              className="bg-secondary border-border text-foreground font-mono" />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Context for this interview..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[60px]" />
          </div>

          <Button onClick={() => setStep("consent")} className="w-full" disabled={!purpose}>
            Proceed to Consent
          </Button>
        </div>
      </div>
    );
  }

  // ─── Consent (NGO) ──────────────────────────────────────
  if (step === "consent") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-2xl text-center">
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-8">
            <Shield className="w-10 h-10 text-accent" />
          </div>
          <h1 className="font-heading text-4xl text-foreground mb-6">{consent.title}</h1>
          <div className="glass-card p-10 text-left mb-8">
            <p className="text-foreground text-xl leading-relaxed">{consent.body}</p>
          </div>
          <div className="flex gap-6 justify-center mb-8">
            <Button variant="outline" size="lg" onClick={() => { toast.info("Interview cancelled"); navigate("/dashboard"); }}
              className="gap-2 border-border text-muted-foreground px-10 py-6 text-lg rounded-xl">
              <X className="w-6 h-6" />{consent.disagree}
            </Button>
            <Button size="lg" onClick={() => { setStep("session"); setIsRecording(true); }}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-10 py-6 text-lg rounded-xl">
              <Check className="w-6 h-6" />{consent.agree}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1 flex-wrap justify-center">
              {Object.keys(ngoConsent).map(lang => (
                <button key={lang} onClick={() => setConsentLang(lang)}
                  className={`px-2 py-1 rounded-md text-xs transition-colors ${consentLang === lang ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"}`}>
                  {lang.length > 3 ? lang.slice(0, 2).toUpperCase() : lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Session — Chaos to Chronology ───────────────────────
  if (step === "session") {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Top bar */}
        <div className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Badge className="bg-accent/20 text-accent border-0">{purpose}</Badge>
            <span className="text-muted-foreground text-sm font-mono">{caseRef}</span>
          </div>
          <div className="flex items-center gap-2">
            {isRecording && !isPaused && (
              <span className="flex items-center gap-1.5 text-destructive text-sm">
                <span className="w-2 h-2 rounded-full bg-destructive pulse-recording" />
                Recording
              </span>
            )}
            {isPaused && <Badge variant="outline" className="text-warning border-warning/30">Paused</Badge>}
            <Button variant="ghost" size="icon" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <Mic className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button variant="destructive" size="sm" className="gap-1"
              onClick={() => setStep("decision")}>
              <Square className="w-3 h-3" /> End Interview
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Transcript */}
          <div className="flex-1 flex flex-col border-r border-border">
            <div className="px-4 py-2 border-b border-border">
              <h2 className="text-foreground text-sm font-medium">Transcript</h2>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {(isDemo ? demoTranscript : []).map((t, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg transition-colors ${
                      highlightedIdx === i ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50"
                    }`}
                  >
                    <span className={`text-xs font-medium ${t.speaker === "Caseworker" ? "text-primary" : "text-accent"}`}>
                      {t.speaker}
                    </span>
                    <p className="text-foreground text-sm mt-1">{t.text}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border">
              <Textarea value={manualNotes} onChange={e => setManualNotes(e.target.value)}
                placeholder="Add manual notes..."
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm min-h-[40px]" />
            </div>
          </div>

          {/* Timeline panel */}
          <div className="w-80 flex flex-col bg-surface">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <h2 className="text-foreground text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Chronological Timeline
              </h2>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-4">
                  {timelineEvents.map((evt, i) => (
                    <button
                      key={i}
                      onClick={() => setHighlightedIdx(evt.transcript_idx)}
                      className="relative flex items-start gap-3 w-full text-left group"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shrink-0 z-10">
                        <span className="text-[8px] text-primary font-bold">{evt.year.slice(-2)}</span>
                      </div>
                      <div className="flex-1 p-2 rounded-lg group-hover:bg-secondary/50 transition-colors">
                        <span className="text-primary text-xs font-medium">{evt.year}</span>
                        <p className="text-foreground text-sm">{evt.event}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  }

  // ─── Decision Gate (NGO) ─────────────────────────────────
  if (step === "decision") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg">
          <h1 className="font-heading text-3xl text-foreground text-center mb-8">Data Retention Decision</h1>
          <div className="glass-card p-8 space-y-4">
            {[
              { value: "summary_only", label: "Keep Summary Only", desc: "Most protective — recommended for vulnerable beneficiaries", recommended: true },
              { value: "transcript_summary", label: "Keep Transcript + Summary", desc: "Full record retained securely" },
              { value: "keep_everything", label: "Keep Everything", desc: "Audio reference, transcript, and summary" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setRetentionChoice(opt.value)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  retentionChoice === opt.value
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-medium text-sm">{opt.label}</span>
                  {opt.recommended && <Badge className="bg-accent/20 text-accent border-0 text-xs">Recommended</Badge>}
                </div>
                <p className="text-muted-foreground text-xs mt-1">{opt.desc}</p>
              </button>
            ))}

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary mt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-foreground text-sm">Anonymise before saving</span>
              </div>
              <Switch checked={anonymiseOnSave} onCheckedChange={setAnonymiseOnSave} />
            </div>
            <p className="text-muted-foreground text-xs px-1">
              Replaces all names with case reference numbers in the saved record.
            </p>

            <Button onClick={() => setStep("case-file")} className="w-full mt-4">
              Continue to Case File
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Case File ───────────────────────────────────────────
  if (step === "case-file") {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl text-foreground">Draft Case File</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {anonymous ? `Case ${caseRef}` : "Beneficiary"} — {purpose}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">Edit</Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              <Check className="w-4 h-4" /> Approve & Save
            </Button>
          </div>
        </div>

        <div className="glass-card p-8 space-y-8">
          {/* Chronological Account */}
          <section>
            <h2 className="text-foreground font-heading text-xl mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Chronological Account
            </h2>
            <div className="border-l-2 border-primary/30 pl-4 space-y-3">
              {demoTimeline.map(evt => (
                <div key={evt.year}>
                  <span className="text-primary text-sm font-medium">{evt.year}</span>
                  <p className="text-foreground text-sm">{evt.event}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Needs */}
          <section>
            <h2 className="text-foreground font-heading text-xl mb-3">Needs Identified</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { urgency: "Immediate", items: ["Safe accommodation", "Legal representation"] },
                { urgency: "Short-term", items: ["Language classes", "Mental health support"] },
                { urgency: "Long-term", items: ["Employment training", "Family reunification"] },
              ].map(n => (
                <div key={n.urgency} className="p-3 rounded-lg bg-secondary">
                  <p className="text-foreground text-sm font-medium mb-2">{n.urgency}</p>
                  <ul className="space-y-1">
                    {n.items.map(i => (
                      <li key={i} className="text-muted-foreground text-xs flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />{i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Vulnerability */}
          <section>
            <h2 className="text-foreground font-heading text-xl mb-3">Vulnerability Factors</h2>
            <div className="flex flex-wrap gap-2">
              {["Unaccompanied minor — no", "Survivor of violence — possible (requires follow-up)", "Medical needs — none reported", "Mental health — anxiety symptoms noted"].map(v => (
                <Badge key={v} variant="outline" className="border-warning/30 text-warning text-xs">{v}</Badge>
              ))}
            </div>
          </section>

          {/* Referrals */}
          <section>
            <h2 className="text-foreground font-heading text-xl mb-3">Referrals Needed</h2>
            <div className="space-y-2">
              {[
                { to: "OLAI — Housing Service", urgency: "Urgent" },
                { to: "Luxembourg Bar Association — Pro Bono Legal", urgency: "Urgent" },
                { to: "Mental Health Services — Trauma Counselling", urgency: "Routine" },
              ].map(r => (
                <div key={r.to} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-foreground text-sm">{r.to}</span>
                  <Badge className={`border-0 text-xs ${
                    r.urgency === "Urgent" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                  }`}>{r.urgency}</Badge>
                </div>
              ))}
            </div>
          </section>

          {/* Draft Application */}
          <section>
            <h2 className="text-foreground font-heading text-xl mb-3">Draft Application Section</h2>
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-foreground text-sm leading-relaxed">
                The beneficiary (Case Ref: {caseRef}) is a {anonymous ? "[nationality redacted]" : ""} national who fled their home country
                in 2019 due to armed conflict. After transiting through multiple countries, they arrived in Luxembourg in 2023
                and filed an asylum application in early 2024, which is currently pending. The beneficiary requires immediate
                assistance with housing and legal representation. A mental health referral for trauma counselling has also been
                recommended. The case is assessed as requiring urgent attention for the housing and legal components.
              </p>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Save as Draft</Button>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            onClick={() => { toast.success("Case file approved and saved"); navigate("/dashboard"); }}>
            <Check className="w-4 h-4" /> Approve & Save
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
