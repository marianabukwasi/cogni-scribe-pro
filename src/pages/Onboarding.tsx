import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Check, Upload } from "lucide-react";

const steps = ["Your Practice", "Languages", "Preferences", "Upload Samples"];

const professions = [
  { value: "medical_doctor", label: "Medical Doctor" },
  { value: "therapist", label: "Therapist / Psychologist" },
  { value: "lawyer", label: "Lawyer" },
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "hr_professional", label: "HR Professional" },
  { value: "ngo_caseworker", label: "NGO Caseworker" },
  { value: "social_worker", label: "Social Worker" },
  { value: "refugee_support", label: "Refugee / Asylum Support" },
  { value: "other", label: "Other" },
];

const countries = ["Luxembourg", "Hungary", "Belgium", "France", "Germany", "Austria", "Other EU", "Other"];
const langOptions = ["English", "French", "German", "Luxembourgish", "Hungarian", "Spanish", "Dutch", "Italian", "Arabic", "Other"];
const rxFormats = ["Luxembourg / eSanté", "Hungary / NEAK", "France", "Germany", "Belgium", "Austria", "Other EU Standard"];
const uiLangs = [
  { value: "en", label: "English" }, { value: "fr", label: "Français" }, { value: "de", label: "Deutsch" },
  { value: "lu", label: "Lëtzebuergesch" }, { value: "hu", label: "Magyar" },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [profession, setProfession] = useState(profile?.profession || "medical_doctor");
  const [specialty, setSpecialty] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [country, setCountry] = useState("Luxembourg");
  const [sessionLang, setSessionLang] = useState("English");
  const [docLang, setDocLang] = useState("English");
  const [rxFormat, setRxFormat] = useState("Luxembourg / eSanté");
  const [uiLang, setUiLang] = useState("en");
  const [alertStyles, setAlertStyles] = useState<string[]>(["silent_flash"]);
  const [retention, setRetention] = useState("ask_each_time");
  const [purgeTimer, setPurgeTimer] = useState("10");

  const toggleAlert = (val: string) => {
    setAlertStyles(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const handleComplete = async () => {
    const { error } = await supabase.from("profiles").update({
      profession: profession as any, specialty, organisation, country_of_practice: country,
      primary_session_language: sessionLang, document_output_language: docLang,
      prescription_country_format: rxFormat, ui_language: uiLang,
      alert_style: alertStyles, default_retention: retention as any,
      auto_purge_minutes: parseInt(purgeTimer), onboarding_completed: true,
    }).eq("user_id", profile?.user_id ?? "");

    if (error) { toast.error("Failed to save preferences"); return; }
    await refreshProfile();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl text-foreground mb-2">Set up your workspace</h1>
          <p className="text-muted-foreground text-sm">Step {step + 1} of {steps.length}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < step ? "bg-accent text-accent-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-foreground">Full Name</Label>
                <Input value={profile?.full_name || ""} readOnly className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Specialty</Label>
                <Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. Neurology, Family Law" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Organisation (optional)</Label>
                <Input value={organisation} onChange={e => setOrganisation(e.target.value)} placeholder="Your clinic or firm" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Country of Practice</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    {countries.map(c => <SelectItem key={c} value={c} className="text-foreground">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-foreground">Primary Session Language</Label>
                <Select value={sessionLang} onValueChange={setSessionLang}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface border-border">{langOptions.map(l => <SelectItem key={l} value={l} className="text-foreground">{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Document Output Language</Label>
                <Select value={docLang} onValueChange={setDocLang}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface border-border">{langOptions.map(l => <SelectItem key={l} value={l} className="text-foreground">{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Prescription Country Format</Label>
                <Select value={rxFormat} onValueChange={setRxFormat}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface border-border">{rxFormats.map(f => <SelectItem key={f} value={f} className="text-foreground">{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">UI Language</Label>
                <Select value={uiLang} onValueChange={setUiLang}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface border-border">{uiLangs.map(l => <SelectItem key={l.value} value={l.value} className="text-foreground">{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-foreground">Alert Style</Label>
                {[
                  { value: "silent_flash", label: "Silent corner flash (default)" },
                  { value: "phone_vibration", label: "Phone vibration" },
                  { value: "smartwatch_haptic", label: "Smartwatch haptic" },
                ].map(a => (
                  <div key={a.value} className="flex items-center gap-3">
                    <Checkbox checked={alertStyles.includes(a.value)} onCheckedChange={() => toggleAlert(a.value)} />
                    <span className="text-sm text-foreground">{a.label}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Default Data Retention</Label>
                <Select value={retention} onValueChange={setRetention}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    <SelectItem value="summary_only" className="text-foreground">Keep Summary Only</SelectItem>
                    <SelectItem value="transcript_summary" className="text-foreground">Keep Transcript + Summary</SelectItem>
                    <SelectItem value="keep_everything" className="text-foreground">Keep Everything</SelectItem>
                    <SelectItem value="ask_each_time" className="text-foreground">Ask me each time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Auto-Purge Timer</Label>
                <Select value={purgeTimer} onValueChange={setPurgeTimer}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    <SelectItem value="5" className="text-foreground">5 minutes</SelectItem>
                    <SelectItem value="10" className="text-foreground">10 minutes</SelectItem>
                    <SelectItem value="15" className="text-foreground">15 minutes</SelectItem>
                    <SelectItem value="0" className="text-foreground">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-foreground">Upload a sample report (optional)</Label>
                <p className="text-xs text-muted-foreground">Upload one of your existing reports so the AI can learn your writing style</p>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drop PDF or DOCX here</p>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-foreground">Upload a prescription template (optional)</Label>
                <p className="text-xs text-muted-foreground">Upload a sample prescription so the AI knows your format</p>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drop PDF or DOCX here</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="border-border text-foreground">Back</Button>
            ) : <div />}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)}>Continue</Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleComplete} className="text-muted-foreground">Skip</Button>
                <Button onClick={handleComplete}>Complete Setup</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
