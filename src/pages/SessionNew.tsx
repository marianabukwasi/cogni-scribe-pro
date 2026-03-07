import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Shield } from "lucide-react";

const sessionTypes: Record<string, string[]> = {
  medical_doctor: ["Initial Consultation", "Follow-up", "Emergency"],
  therapist: ["Initial Assessment", "Follow-up", "Crisis"],
  lawyer: ["Initial Consultation", "Case Review", "Signing"],
  ngo_caseworker: ["Intake Interview", "Follow-up", "Crisis Support"],
  refugee_support: ["Intake Interview", "Follow-up", "Crisis Support"],
  social_worker: ["Initial Assessment", "Follow-up", "Home Visit"],
  default: ["Consultation", "Follow-up", "Review"],
};

export default function SessionNew() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"setup" | "consent">("setup");
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("anonymous");
  const [sessionType, setSessionType] = useState("");
  const [sessionLang, setSessionLang] = useState(profile?.primary_session_language || "English");
  const [docLang, setDocLang] = useState(profile?.document_output_language || "English");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase.from("clients").select("id, first_name, last_name").eq("professional_id", profile.user_id)
      .then(({ data }) => setClients(data || []));
  }, [profile]);

  const types = sessionTypes[profile?.profession || ""] || sessionTypes.default;

  const handleConsent = async (agreed: boolean) => {
    if (!agreed) { toast.info("Session cancelled — consent was not given"); navigate("/dashboard"); return; }

    const client = clients.find(c => c.id === clientId);
    const { data, error } = await supabase.from("sessions").insert({
      professional_id: profile!.user_id,
      client_id: clientId === "anonymous" ? null : clientId,
      client_name: client ? `${client.first_name} ${client.last_name}` : "Anonymous",
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

  if (step === "consent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-3xl text-foreground mb-4">Session Recording Consent</h1>
          <div className="glass-card p-8 text-left mb-6">
            <p className="text-foreground leading-relaxed">
              This session will be transcribed by AI to help with note-taking. The audio is processed on this device and deleted by default when we finish. You can ask us to stop recording at any time. Your information is kept private and secure.
            </p>
            <p className="text-foreground mt-4 font-medium">Do you agree to continue?</p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" size="lg" onClick={() => handleConsent(false)} className="gap-2 border-border text-muted-foreground px-8">
              <X className="w-5 h-5" />No, I do not agree
            </Button>
            <Button size="lg" onClick={() => handleConsent(true)} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-8">
              <Check className="w-5 h-5" />Yes, I agree
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="font-heading text-3xl text-foreground mb-6">New Session</h1>
      <div className="glass-card p-8 space-y-5">
        <div className="space-y-2">
          <Label className="text-foreground">Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface border-border">
              <SelectItem value="anonymous" className="text-foreground">Anonymous / New Client</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id} className="text-foreground">{c.first_name} {c.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
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
            <Input value={sessionLang} onChange={e => setSessionLang(e.target.value)} className="bg-secondary border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground text-xs">Output Language</Label>
            <Input value={docLang} onChange={e => setDocLang(e.target.value)} className="bg-secondary border-border text-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Special Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for this session..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
        </div>

        <Button onClick={() => setStep("consent")} className="w-full">Proceed to Consent</Button>
      </div>
    </div>
  );
}
