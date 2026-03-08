import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Shield, Search, FileText, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const sessionTypes: Record<string, string[]> = {
  medical_doctor: ["Initial Consultation", "Follow-up", "Emergency"],
  therapist: ["Initial Assessment", "Follow-up", "Crisis"],
  lawyer: ["Initial Consultation", "Case Review", "Signing"],
  ngo_caseworker: ["Intake Interview", "Follow-up", "Crisis Support"],
  refugee_support: ["Intake Interview", "Follow-up", "Crisis Support"],
  social_worker: ["Initial Assessment", "Follow-up", "Home Visit"],
  financial_advisor: ["Initial Consultation", "Review", "Planning"],
  hr_professional: ["Interview", "Review", "Disciplinary"],
  default: ["Consultation", "Follow-up", "Review"],
};

const langOptions = ["English", "French", "German", "Luxembourgish", "Hungarian", "Spanish", "Dutch", "Italian", "Arabic"];

const consentTranslations: Record<string, { title: string; body: string; agree: string; disagree: string; question: string }> = {
  English: {
    title: "Session Recording Consent",
    body: "This session will be transcribed by AI to help with note-taking. The audio is processed on this device and deleted by default when we finish. You can ask us to stop recording at any time. Your information is kept private and secure.",
    question: "Do you agree to continue?",
    agree: "Yes, I agree",
    disagree: "No, I do not agree",
  },
  French: {
    title: "Consentement à l'enregistrement",
    body: "Cette session sera transcrite par l'IA pour faciliter la prise de notes. L'audio est traité sur cet appareil et supprimé par défaut à la fin. Vous pouvez demander l'arrêt de l'enregistrement à tout moment. Vos informations restent privées et sécurisées.",
    question: "Acceptez-vous de continuer ?",
    agree: "Oui, j'accepte",
    disagree: "Non, je n'accepte pas",
  },
  German: {
    title: "Einwilligung zur Sitzungsaufzeichnung",
    body: "Diese Sitzung wird von KI transkribiert, um bei der Protokollierung zu helfen. Das Audio wird auf diesem Gerät verarbeitet und standardmäßig nach Abschluss gelöscht. Sie können jederzeit darum bitten, die Aufzeichnung zu stoppen. Ihre Daten bleiben privat und sicher.",
    question: "Stimmen Sie zu, fortzufahren?",
    agree: "Ja, ich stimme zu",
    disagree: "Nein, ich stimme nicht zu",
  },
  Luxembourgish: {
    title: "Zoustëmmung fir d'Opnam",
    body: "Dës Sëtzung gëtt vun der KI transkribéiert fir bei der Notiztmaachen ze hëllefen. Den Audio gëtt op dësem Apparat veraarbecht a gëtt standardméisseg geläscht wann mir fäerdeg sinn. Dir kënnt zu all Moment froen d'Opnam ze stoppen. Är Informatiounen bleiwe privat a sécher.",
    question: "Stëmmt Dir zou fir weiderzemaachen?",
    agree: "Jo, ech stëmmen zou",
    disagree: "Nee, ech stëmmen net zou",
  },
  Hungarian: {
    title: "Hozzájárulás a felvételhez",
    body: "Ezt a beszélgetést mesterséges intelligencia segítségével rögzítjük a jegyzetelés érdekében. A hangfelvétel ezen az eszközön kerül feldolgozásra, és alapértelmezés szerint törlődik a befejezéskor. Bármikor kérheti a felvétel leállítását. Az Ön adatai bizalmasan és biztonságosan kezeltek.",
    question: "Hozzájárul a folytatáshoz?",
    agree: "Igen, hozzájárulok",
    disagree: "Nem, nem járulok hozzá",
  },
};

export default function SessionNew() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get("client");

  const [step, setStep] = useState<"setup" | "consent">("setup");
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState(preselectedClientId || "anonymous");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [sessionType, setSessionType] = useState("");
  const [sessionLang, setSessionLang] = useState(profile?.primary_session_language || "English");
  const [docLang, setDocLang] = useState(profile?.document_output_language || "English");
  const [notes, setNotes] = useState("");
  const [hasIntake, setHasIntake] = useState(false);
  const [loadIntake, setLoadIntake] = useState(false);
  const [consentLang, setConsentLang] = useState("English");

  useEffect(() => {
    if (!profile) return;
    supabase.from("clients").select("id, first_name, last_name, preferred_language")
      .eq("professional_id", profile.user_id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setClients(data || []));
  }, [profile]);

  // Check if selected client has completed intake
  useEffect(() => {
    if (clientId === "anonymous" || !profile) { setHasIntake(false); return; }
    supabase.from("intake_responses")
      .select("id")
      .eq("client_id", clientId)
      .eq("professional_id", profile.user_id)
      .eq("completed", true)
      .limit(1)
      .then(({ data }) => {
        setHasIntake((data || []).length > 0);
        if ((data || []).length > 0) setLoadIntake(true);
      });
  }, [clientId, profile]);

  // Set consent language based on selected client
  useEffect(() => {
    if (clientId === "anonymous") return;
    const client = clients.find(c => c.id === clientId);
    if (client?.preferred_language && consentTranslations[client.preferred_language]) {
      setConsentLang(client.preferred_language);
    }
  }, [clientId, clients]);

  const types = sessionTypes[profile?.profession || ""] || sessionTypes.default;

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const s = clientSearch.toLowerCase();
    return clients.filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(s));
  }, [clients, clientSearch]);

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedLabel = selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : "Anonymous / New Client";

  const handleConsent = async (agreed: boolean) => {
    if (!agreed) {
      // Log refusal
      await supabase.from("sessions").insert({
        professional_id: profile!.user_id,
        client_id: clientId === "anonymous" ? null : clientId,
        client_name: selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : "Anonymous",
        session_type: sessionType,
        session_language: sessionLang,
        document_output_language: docLang,
        special_notes: notes,
        status: "ended" as any,
        consent_given: false,
        consent_timestamp: new Date().toISOString(),
      });
      toast.info("Session cancelled — consent was not given");
      navigate("/dashboard");
      return;
    }

    const { data, error } = await supabase.from("sessions").insert({
      professional_id: profile!.user_id,
      client_id: clientId === "anonymous" ? null : clientId,
      client_name: selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : "Anonymous",
      session_type: sessionType,
      session_language: sessionLang,
      document_output_language: docLang,
      special_notes: notes,
      status: "active" as any,
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      start_time: new Date().toISOString(),
    }).select().single();

    if (error) { toast.error(error.message); return; }
    navigate(`/session/${data.id}/live`);
  };

  const consent = consentTranslations[consentLang] || consentTranslations.English;

  // ─── Consent Screen ─────────────────────────────────
  if (step === "consent") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-2xl text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-8">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-heading text-4xl text-foreground mb-6">{consent.title}</h1>
          <div className="glass-card p-10 text-left mb-8">
            <p className="text-foreground text-lg leading-relaxed">{consent.body}</p>
            <p className="text-foreground text-xl mt-6 font-semibold">{consent.question}</p>
          </div>
          <div className="flex gap-6 justify-center mb-8">
            <Button variant="outline" size="lg" onClick={() => handleConsent(false)}
              className="gap-2 border-border text-muted-foreground px-10 py-6 text-lg rounded-xl">
              <X className="w-6 h-6" />{consent.disagree}
            </Button>
            <Button size="lg" onClick={() => handleConsent(true)}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-10 py-6 text-lg rounded-xl">
              <Check className="w-6 h-6" />{consent.agree}
            </Button>
          </div>

          {/* Language selector */}
          <div className="flex items-center justify-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {Object.keys(consentTranslations).map(lang => (
                <button key={lang} onClick={() => setConsentLang(lang)}
                  className={`px-3 py-1 rounded-md text-xs transition-colors ${consentLang === lang ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {lang === "Luxembourgish" ? "LU" : lang.slice(0, 2).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Setup Screen ───────────────────────────────────
  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="font-heading text-3xl text-foreground mb-6">New Session</h1>
      <div className="glass-card p-8 space-y-5">
        {/* Client search picker */}
        <div className="space-y-2">
          <Label className="text-foreground">Client</Label>
          <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between bg-secondary border-border text-foreground hover:bg-secondary/80">
                <span className="truncate">{selectedLabel}</span>
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-surface border-border" align="start">
              <div className="p-2 border-b border-border">
                <Input
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <ScrollArea className="max-h-48">
                <button
                  onClick={() => { setClientId("anonymous"); setClientPickerOpen(false); setClientSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${clientId === "anonymous" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}>
                  Anonymous / New Client
                </button>
                {filteredClients.map(c => (
                  <button key={c.id}
                    onClick={() => { setClientId(c.id); setClientPickerOpen(false); setClientSearch(""); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${clientId === c.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}>
                    {c.first_name} {c.last_name}
                  </button>
                ))}
                {filteredClients.length === 0 && clientSearch && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No clients found</p>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Session Type</Label>
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent className="bg-surface border-border">
              {types.map(t => <SelectItem key={t} value={t} className="text-foreground">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-foreground text-xs">Session Language</Label>
            <Select value={sessionLang} onValueChange={setSessionLang}>
              <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface border-border">
                {langOptions.map(l => <SelectItem key={l} value={l} className="text-foreground">{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground text-xs">Document Output Language</Label>
            <Select value={docLang} onValueChange={setDocLang}>
              <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface border-border">
                {langOptions.map(l => <SelectItem key={l} value={l} className="text-foreground">{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Intake toggle */}
        {hasIntake && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">Load intake form responses</span>
            </div>
            <Switch checked={loadIntake} onCheckedChange={setLoadIntake} />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-foreground">Special Notes (optional)</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for this session..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[60px]" />
        </div>

        <Button onClick={() => setStep("consent")} className="w-full" disabled={!sessionType}>
          Proceed to Consent
        </Button>
      </div>
    </div>
  );
}
