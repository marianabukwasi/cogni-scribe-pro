import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Globe, Bell, Shield, User, CreditCard, Palette, Building2, Users,
  Lock, Upload, Mail, Key, Trash2, Plus, Check, Crown, Loader2,
  AlertTriangle, Sparkles, FileText, Stethoscope, RefreshCw, Handshake
} from "lucide-react";
import { Link } from "react-router-dom";

// ─── Types & Helpers ────────────────────────────────────
type ProfKey = "medical" | "legal" | "ngo" | "therapy" | "generic";

function getProfKey(profession?: string): ProfKey {
  if (!profession) return "medical";
  if (profession === "medical_doctor") return "medical";
  if (profession === "lawyer") return "legal";
  if (["ngo_caseworker", "refugee_support", "social_worker"].includes(profession)) return "ngo";
  if (profession === "therapist") return "therapy";
  return "generic";
}

// Summary fields per profession
const summaryFieldOptions: Record<ProfKey, string[]> = {
  medical: ["Chief Complaint", "Duration & History", "Current Medications Mentioned", "Allergies Mentioned", "Key Clinical Findings", "Patient's Own Words"],
  legal: ["Nature of Issue", "Key Facts Stated", "Relevant Dates Mentioned", "Documents Referenced", "Client's Priorities"],
  ngo: ["Chronological Timeline of Events", "Immediate Needs Identified", "Vulnerability Factors Mentioned", "Languages Used in Session", "Key Statements (verbatim)"],
  therapy: ["Presenting Concerns", "Mood and Affect Observed", "Key Themes", "Risk Factors Mentioned", "Client's Goals Expressed"],
  generic: ["Session Overview", "Key Points Discussed", "Action Items", "Client's Perspective"],
};

const professionOptions = [
  { v: "medical_doctor", l: "Medical Doctor" },
  { v: "therapist", l: "Therapist" },
  { v: "lawyer", l: "Lawyer" },
  { v: "financial_advisor", l: "Financial Advisor" },
  { v: "hr_professional", l: "HR Professional" },
  { v: "ngo_caseworker", l: "NGO Caseworker" },
  { v: "social_worker", l: "Social Worker" },
  { v: "refugee_support", l: "Refugee Support" },
  { v: "other", l: "Other" },
];

const langOptions = [
  { v: "en", l: "English" },
  { v: "fr", l: "Français" },
  { v: "de", l: "Deutsch" },
  { v: "lb", l: "Lëtzebuergesch" },
  { v: "hu", l: "Magyar" },
];

const rxCountryOptions = [
  { v: "luxembourg", l: "Luxembourg / eSanté" },
  { v: "hungary", l: "Hungary / NEAK" },
  { v: "france", l: "France" },
  { v: "germany", l: "Germany" },
  { v: "belgium", l: "Belgium" },
  { v: "austria", l: "Austria" },
  { v: "eu_standard", l: "EU Standard" },
];

// ─── Component ──────────────────────────────────────────
export default function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { isDemo } = useDemo();
  const pk = getProfKey(profile?.profession);
  const [saving, setSaving] = useState(false);

  // Language
  const [uiLang, setUiLang] = useState(profile?.ui_language || "en");
  const [sessionLang, setSessionLang] = useState(profile?.primary_session_language || "en");
  const [docLang, setDocLang] = useState(profile?.document_output_language || "en");
  const [rxFormat, setRxFormat] = useState(profile?.prescription_country_format || "luxembourg");
  const [referralLang, setReferralLang] = useState(profile?.referral_letter_language || "en");

  // Summary
  const [summaryFields, setSummaryFields] = useState<string[]>(() => summaryFieldOptions[pk] || []);

  // Alerts
  const [alertStyles, setAlertStyles] = useState<string[]>(profile?.alert_style || ["silent_flash"]);
  const [alertSensitivity, setAlertSensitivity] = useState(profile?.alert_sensitivity || "all");

  // Retention
  const [retention, setRetention] = useState(profile?.default_retention || "ask_each_time");
  const [purge, setPurge] = useState(String(profile?.auto_purge_minutes || 10));

  // Profile
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [profession, setProfession] = useState(profile?.profession || "medical_doctor");
  const [specialty, setSpecialty] = useState(profile?.specialty || "");
  const [country, setCountry] = useState(profile?.country_of_practice || "Luxembourg");
  const [regNumber, setRegNumber] = useState(profile?.registration_number || "");
  const [org, setOrg] = useState(profile?.organisation || "");

  // Account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // White Label
  const isWhiteLabel = profile?.account_tier === "white_label" || profile?.account_tier === "enterprise";
  const [wlOrgName, setWlOrgName] = useState(profile?.organisation || "");
  const [wlPrimaryColor, setWlPrimaryColor] = useState("#4A90E2");
  const [wlFooterText, setWlFooterText] = useState("");
  const [wlTeamMembers] = useState([
    { name: "Dr. Sarah Chen", email: "sarah@clinic.lu", profession: "Medical Doctor", lastActive: "Today", role: "Admin" },
    { name: "Dr. Marc Weber", email: "marc@clinic.lu", profession: "Medical Doctor", lastActive: "Yesterday", role: "Member" },
    { name: "Julie Schmit", email: "julie@clinic.lu", profession: "Therapist", lastActive: "3 days ago", role: "Member" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [ngoLicenceName, setNgoLicenceName] = useState("");
  const [ngoLicenceEmail, setNgoLicenceEmail] = useState("");

  const toggleAlert = (v: string) => setAlertStyles(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleSummaryField = (f: string) => setSummaryFields(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);

  const save = async () => {
    setSaving(true);
    if (!isDemo && profile) {
      await supabase.from("profiles").update({
        full_name: fullName,
        ui_language: uiLang,
        primary_session_language: sessionLang,
        document_output_language: docLang,
        prescription_country_format: rxFormat,
        referral_letter_language: referralLang,
        alert_style: alertStyles,
        alert_sensitivity: alertSensitivity,
        default_retention: retention as any,
        auto_purge_minutes: parseInt(purge),
        specialty,
        registration_number: regNumber,
        country_of_practice: country,
        organisation: org,
        summary_fields: summaryFields as any,
      }).eq("user_id", profile.user_id);
      await refreshProfile();
    }
    setSaving(false);
    toast.success("Settings saved");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    if (!isDemo) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast.error(error.message); setChangingPassword(false); return; }
    }
    setChangingPassword(false);
    setShowChangePassword(false);
    setNewPassword("");
    toast.success("Password updated");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-3xl text-foreground mb-6">Settings</h1>

      <Tabs defaultValue="language">
        <TabsList className="bg-surface border border-border mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="language" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5 text-xs"><Globe className="w-3.5 h-3.5" />Language</TabsTrigger>
          <TabsTrigger value="summary" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" />Summary</TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5 text-xs"><Bell className="w-3.5 h-3.5" />Alerts</TabsTrigger>
          <TabsTrigger value="retention" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5 text-xs"><Shield className="w-3.5 h-3.5" />Retention</TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5 text-xs"><User className="w-3.5 h-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" />Account</TabsTrigger>
          <TabsTrigger value="whitelabel" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5 text-xs"><Palette className="w-3.5 h-3.5" />White Label</TabsTrigger>
          <TabsTrigger value="partnerships" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-1.5 text-xs"><Handshake className="w-3.5 h-3.5" />Partnerships</TabsTrigger>
        </TabsList>

        {/* ─── Language Tab ────────────────────────────── */}
        <TabsContent value="language">
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">App Interface Language</Label>
              <p className="text-[10px] text-muted-foreground">Changing this switches the full UI language</p>
              <Select value={uiLang} onValueChange={setUiLang}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-64"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {langOptions.map(o => <SelectItem key={o.v} value={o.v} className="text-foreground">{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Default Session Language</Label>
              <p className="text-[10px] text-muted-foreground">Can be changed per session</p>
              <Select value={sessionLang} onValueChange={setSessionLang}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-64"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {langOptions.map(o => <SelectItem key={o.v} value={o.v} className="text-foreground">{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Default Document Output Language</Label>
              <p className="text-[10px] text-muted-foreground">Can be changed per session and per document</p>
              <Select value={docLang} onValueChange={setDocLang}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-64"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {langOptions.map(o => <SelectItem key={o.v} value={o.v} className="text-foreground">{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Prescription Country Format</Label>
              <Select value={rxFormat} onValueChange={setRxFormat}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-64"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {rxCountryOptions.map(o => <SelectItem key={o.v} value={o.v} className="text-foreground">{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Referral Letter Language Default</Label>
              <Select value={referralLang} onValueChange={setReferralLang}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-64"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {langOptions.map(o => <SelectItem key={o.v} value={o.v} className="text-foreground">{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes</Button>
          </div>
        </TabsContent>

        {/* ─── Summary Tab ─────────────────────────────── */}
        <TabsContent value="summary">
          <div className="glass-card p-6 space-y-5">
            <div>
              <Label className="text-foreground">Summary Fields to Include</Label>
              <p className="text-xs text-muted-foreground mt-1">Choose which fields appear in your session Summary tab. These adapt to your profession.</p>
            </div>
            <div className="space-y-3">
              {summaryFieldOptions[pk].map(field => (
                <div key={field} className="flex items-center gap-3">
                  <Checkbox checked={summaryFields.includes(field)} onCheckedChange={() => toggleSummaryField(field)} className="border-border" />
                  <span className="text-sm text-foreground">{field}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSummaryFields(summaryFieldOptions[pk])} className="text-xs text-primary hover:underline">Restore defaults</button>
            <div><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes</Button></div>
          </div>
        </TabsContent>

        {/* ─── Alerts Tab ──────────────────────────────── */}
        <TabsContent value="alerts">
          <div className="glass-card p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-foreground">Alert Style</Label>
              {[{ v: "silent_flash", l: "Silent corner flash", desc: "Subtle visual indicator — always available. Cannot be disabled." },
                { v: "phone_vibration", l: "Phone vibration", desc: "Vibrate connected device when critical warnings detected" },
                { v: "smartwatch_haptic", l: "Smartwatch haptic", desc: "Haptic feedback on connected smartwatch" }].map(a => (
                <div key={a.v} className="flex items-start gap-3">
                  <Checkbox checked={a.v === "silent_flash" ? true : alertStyles.includes(a.v)} onCheckedChange={() => toggleAlert(a.v)} disabled={a.v === "silent_flash"} className="mt-0.5" />
                  <div>
                    <span className="text-sm text-foreground">{a.l}</span>
                    <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                    {a.v === "phone_vibration" && !("vibrate" in navigator) && (
                      <p className="text-[10px] text-warning mt-1">⚠ Phone vibration not supported on this device. Corner flash is active.</p>
                    )}
                    {a.v === "smartwatch_haptic" && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">⌚ Smartwatch alerts coming soon — corner flash and phone vibration are active. To enable smartwatch alerts in future, install the Kloer.ai companion app on your Apple Watch or Wear OS watch.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Alert Sensitivity</Label>
              <p className="text-xs text-muted-foreground">What triggers an alert during sessions</p>
              <Select value={alertSensitivity} onValueChange={setAlertSensitivity}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-64"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="all" className="text-foreground">All warnings</SelectItem>
                  <SelectItem value="important_critical" className="text-foreground">Important and Critical only</SelectItem>
                  <SelectItem value="critical" className="text-foreground">Critical only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="border-border text-foreground gap-2" onClick={() => {
              // Trigger real vibration test if supported
              if (alertStyles.includes("phone_vibration") && "vibrate" in navigator) {
                navigator.vibrate([200, 100, 200, 100, 200]);
              }
              toast.warning("⚠ Test Alert — Drug interaction: St. John's Wort detected. This is how critical alerts appear during sessions.", { duration: 5000 });
            }}>
              <Bell className="w-4 h-4" />Test Alerts
            </Button>
            <div><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes</Button></div>
          </div>
        </TabsContent>

        {/* ─── Retention Tab ───────────────────────────── */}
        <TabsContent value="retention">
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Default Decision Gate Choice</Label>
              <p className="text-xs text-muted-foreground">What happens to session data after ending a session</p>
              <Select value={retention} onValueChange={setRetention}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-72"><SelectValue /></SelectTrigger>
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
              <p className="text-xs text-muted-foreground">If no selection is made at the Decision Gate, audio and transcript are auto-deleted after this time</p>
              <Select value={purge} onValueChange={setPurge}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-40"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="5" className="text-foreground">5 minutes</SelectItem>
                  <SelectItem value="10" className="text-foreground">10 minutes</SelectItem>
                  <SelectItem value="15" className="text-foreground">15 minutes</SelectItem>
                  <SelectItem value="0" className="text-foreground">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes</Button>
          </div>
        </TabsContent>

        {/* ─── Profile Tab ─────────────────────────────── */}
        <TabsContent value="profile">
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-secondary border-border text-foreground w-72" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Profession</Label>
              <Select value={profession} onValueChange={setProfession}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-72"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {professionOptions.map(o => <SelectItem key={o.v} value={o.v} className="text-foreground">{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Specialty</Label>
              <Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. General Practice, Family Law" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-72" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Country of Practice</Label>
              <Input value={country} onChange={e => setCountry(e.target.value)} className="bg-secondary border-border text-foreground w-72" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Organisation</Label>
              <Input value={org} onChange={e => setOrg(e.target.value)} placeholder="Your practice or organisation" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-72" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Professional Registration Number</Label>
              <p className="text-[10px] text-muted-foreground">Used in generated documents and prescriptions</p>
              <Input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="e.g. LU-MD-2024-001" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-72" />
            </div>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes</Button>
          </div>
        </TabsContent>

        {/* ─── Account Tab ─────────────────────────────── */}
        <TabsContent value="account">
          <div className="space-y-4">
            {/* Plan */}
            <div className="glass-card p-6">
              <Label className="text-foreground">Current Plan</Label>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-foreground font-heading text-xl capitalize">{profile?.account_tier || "Starter"}</span>
                <Badge variant="secondary" className="text-xs capitalize">{profile?.account_tier || "starter"}</Badge>
              </div>
              {profile?.account_tier === "starter" && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Upgrade for more sessions, team features, and white label branding.</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1"><Crown className="w-3 h-3" />Upgrade to Professional</Button>
                    <Button size="sm" variant="outline" className="border-border text-foreground gap-1"><Building2 className="w-3 h-3" />White Label</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Email & Password */}
            <div className="glass-card p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={profile?.email || ""} readOnly className="bg-secondary border-border text-foreground w-72" />
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowChangePassword(true)} className="border-border text-foreground gap-2">
                <Key className="w-4 h-4" />Change Password
              </Button>
            </div>

            {/* Danger */}
            <div className="glass-card p-6 border-destructive/30">
              <h3 className="text-sm font-medium text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Danger Zone</h3>
              <p className="text-xs text-muted-foreground mt-2">Deleting your account removes all data permanently. You can export your data first.</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="border-border text-foreground gap-1 text-xs"><FileText className="w-3 h-3" />Export Data</Button>
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="border-destructive text-destructive gap-1 text-xs"><Trash2 className="w-3 h-3" />Delete Account</Button>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <Button variant="outline" onClick={signOut} className="border-destructive/50 text-destructive gap-2">Sign Out</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── White Label Tab ─────────────────────────── */}
        <TabsContent value="whitelabel">
          {!isWhiteLabel ? (
            <div className="glass-card p-8 text-center">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h2 className="font-heading text-xl text-foreground mb-2">White Label Branding</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Customise the interface with your organisation's branding, manage team members, and share knowledge bases across your team.
              </p>
              <Button className="gap-2"><Crown className="w-4 h-4" />Upgrade to White Label</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Branding */}
              <div className="glass-card p-6 space-y-5">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />Branding</h3>
                <div className="space-y-2">
                  <Label className="text-foreground">Organisation Name</Label>
                  <p className="text-[10px] text-muted-foreground">Replaces 'kloer.ai' in the interface</p>
                  <Input value={wlOrgName} onChange={e => setWlOrgName(e.target.value)} className="bg-secondary border-border text-foreground w-72" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Logo</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 w-72 text-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Upload logo (PNG, SVG)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Primary Colour</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={wlPrimaryColor} onChange={e => setWlPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" />
                    <Input value={wlPrimaryColor} onChange={e => setWlPrimaryColor(e.target.value)} className="bg-secondary border-border text-foreground w-32 font-mono text-sm" />
                  </div>
                </div>
                <div className="glass-card p-3 bg-primary/5">
                  <p className="text-xs text-muted-foreground">
                    <Globe className="w-3 h-3 inline mr-1" />
                    Your app is available at: <span className="text-primary font-medium">ai.{wlOrgName.toLowerCase().replace(/\s/g, "") || "yourorg"}.com</span>
                  </p>
                </div>
              </div>

              {/* Document Branding */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Document Branding</h3>
                <div className="space-y-2">
                  <Label className="text-foreground">Letterhead</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 w-72 text-center cursor-pointer hover:border-primary/50">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Upload letterhead (PDF or image)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Document Footer Text</Label>
                  <Input value={wlFooterText} onChange={e => setWlFooterText(e.target.value)} placeholder="e.g. Confidential — Luxembourg Health Clinic" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-full" />
                </div>
              </div>

              {/* Team Management */}
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Team Management</h3>
                  <span className="text-xs text-muted-foreground">{wlTeamMembers.length} of 10 seats used</span>
                </div>
                <div className="space-y-2">
                  {wlTeamMembers.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                          {m.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm text-foreground font-medium">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.email} · {m.profession} · {m.lastActive}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{m.role}</Badge>
                        {m.role !== "Admin" && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm" />
                  <Button size="sm" onClick={() => { if (inviteEmail) { toast.success(`Invitation sent to ${inviteEmail}`); setInviteEmail(""); } }} disabled={!inviteEmail} className="gap-1">
                    <Mail className="w-3 h-3" />Invite
                  </Button>
                </div>
              </div>

              {/* Shared Knowledge Base */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />Shared Knowledge Base</h3>
                <p className="text-xs text-muted-foreground">Upload documents that all team members can access. Set a firm-wide style guide.</p>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Upload to shared knowledge base</p>
                </div>
              </div>

              {/* NGO Sponsored Licence */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-accent" />NGO Sponsored Licence</h3>
                <p className="text-xs text-muted-foreground">Your plan includes 1 sponsored NGO licence. Assign it to an NGO that will receive free access.</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">NGO Organisation Name</Label>
                    <Input value={ngoLicenceName} onChange={e => setNgoLicenceName(e.target.value)} placeholder="e.g. Red Cross Luxembourg" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-72" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Contact Email</Label>
                    <Input value={ngoLicenceEmail} onChange={e => setNgoLicenceEmail(e.target.value)} placeholder="contact@ngo.org" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-72" />
                  </div>
                  <Button size="sm" disabled={!ngoLicenceName || !ngoLicenceEmail} onClick={() => toast.success("Sponsored licence assigned")} className="gap-1">
                    <Check className="w-3 h-3" />Assign Sponsored Licence
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="status-badge bg-secondary text-muted-foreground text-[10px]">Status: Unassigned</span>
                </div>
              </div>

              <Button onClick={save} disabled={saving} className="mt-2">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save All Changes</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Change Password Dialog ──────────────────── */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="bg-surface border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground text-sm">New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="bg-secondary border-border text-foreground mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePassword(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Account Dialog ───────────────────── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-surface border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive font-heading flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Delete Account</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              This action is permanent and cannot be undone. All your data, sessions, clients, and documents will be permanently deleted. We recommend exporting your data first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-border text-foreground">Cancel</Button>
            <Button variant="destructive" onClick={() => { setShowDeleteConfirm(false); toast.error("Account deletion is disabled in demo mode"); }}>
              <Trash2 className="w-4 h-4 mr-2" />Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Partnerships Tab ──────────────────────── */}
      <TabsContent value="partnerships">
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-heading text-xl text-foreground">Partnerships</h2>
          <p className="text-sm text-muted-foreground">Generate pilot agreements to share Kloer.ai with partner organisations for testing.</p>
          <Link to="/settings/pilot-agreement">
            <Button className="gap-2"><Handshake className="w-4 h-4" />Create Pilot Agreement</Button>
          </Link>
        </div>
      </TabsContent>
    </div>
  );
}
