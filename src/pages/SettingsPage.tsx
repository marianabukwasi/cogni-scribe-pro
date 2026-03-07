import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Globe, Bell, Shield, User, CreditCard } from "lucide-react";

export default function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [saving, setSaving] = useState(false);

  const [uiLang, setUiLang] = useState(profile?.ui_language || "en");
  const [sessionLang, setSessionLang] = useState(profile?.primary_session_language || "English");
  const [docLang, setDocLang] = useState(profile?.document_output_language || "English");
  const [rxFormat, setRxFormat] = useState(profile?.prescription_country_format || "luxembourg");
  const [alertStyles, setAlertStyles] = useState<string[]>(profile?.alert_style || ["silent_flash"]);
  const [alertSensitivity, setAlertSensitivity] = useState(profile?.alert_sensitivity || "all");
  const [retention, setRetention] = useState(profile?.default_retention || "ask_each_time");
  const [purge, setPurge] = useState(String(profile?.auto_purge_minutes || 10));
  const [specialty, setSpecialty] = useState(profile?.specialty || "");
  const [regNumber, setRegNumber] = useState(profile?.registration_number || "");

  const toggleAlert = (v: string) => setAlertStyles(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const save = async () => {
    setSaving(true);
    await supabase.from("profiles").update({
      ui_language: uiLang, primary_session_language: sessionLang,
      document_output_language: docLang, prescription_country_format: rxFormat,
      alert_style: alertStyles, alert_sensitivity: alertSensitivity,
      default_retention: retention as any, auto_purge_minutes: parseInt(purge),
      specialty, registration_number: regNumber,
    }).eq("user_id", profile?.user_id ?? "");
    await refreshProfile();
    setSaving(false);
    toast.success("Settings saved");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-3xl text-foreground mb-6">Settings</h1>

      <Tabs defaultValue="language">
        <TabsList className="bg-surface border border-border mb-6">
          <TabsTrigger value="language" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2"><Globe className="w-4 h-4" />Language</TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2"><Bell className="w-4 h-4" />Alerts</TabsTrigger>
          <TabsTrigger value="retention" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2"><Shield className="w-4 h-4" />Data Retention</TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2"><User className="w-4 h-4" />Profile</TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2"><CreditCard className="w-4 h-4" />Account</TabsTrigger>
        </TabsList>

        <TabsContent value="language">
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">App Interface Language</Label>
              <Select value={uiLang} onValueChange={setUiLang}>
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {[{ v: "en", l: "English" }, { v: "fr", l: "Français" }, { v: "de", l: "Deutsch" }, { v: "lu", l: "Lëtzebuergesch" }, { v: "hu", l: "Magyar" }].map(o =>
                    <SelectItem key={o.v} value={o.v} className="text-foreground">{o.l}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Default Session Language</Label>
              <Input value={sessionLang} onChange={e => setSessionLang(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Default Document Output Language</Label>
              <Input value={docLang} onChange={e => setDocLang(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Prescription Country Format</Label>
              <Select value={rxFormat} onValueChange={setRxFormat}>
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {["luxembourg", "hungary", "france", "germany", "belgium", "austria", "eu_standard"].map(f =>
                    <SelectItem key={f} value={f} className="text-foreground">{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="glass-card p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-foreground">Alert Style</Label>
              {[{ v: "silent_flash", l: "Silent corner flash" }, { v: "phone_vibration", l: "Phone vibration" }, { v: "smartwatch_haptic", l: "Smartwatch haptic" }].map(a => (
                <div key={a.v} className="flex items-center gap-3">
                  <Checkbox checked={alertStyles.includes(a.v)} onCheckedChange={() => toggleAlert(a.v)} />
                  <span className="text-sm text-foreground">{a.l}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Alert Sensitivity</Label>
              <Select value={alertSensitivity} onValueChange={setAlertSensitivity}>
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="all" className="text-foreground">All warnings</SelectItem>
                  <SelectItem value="important_critical" className="text-foreground">Important and Critical only</SelectItem>
                  <SelectItem value="critical" className="text-foreground">Critical only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="border-border text-foreground" onClick={() => toast.info("Test alert sent!")}>Test Alert</Button>
            <Button onClick={save} disabled={saving}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="retention">
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Default Decision Gate Choice</Label>
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
              <Select value={purge} onValueChange={setPurge}>
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="5" className="text-foreground">5 minutes</SelectItem>
                  <SelectItem value="10" className="text-foreground">10 minutes</SelectItem>
                  <SelectItem value="15" className="text-foreground">15 minutes</SelectItem>
                  <SelectItem value="0" className="text-foreground">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Full Name</Label>
              <Input value={profile?.full_name || ""} readOnly className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Profession</Label>
              <Input value={profile?.profession?.replace(/_/g, " ") || ""} readOnly className="bg-secondary border-border text-foreground capitalize" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Specialty</Label>
              <Input value={specialty} onChange={e => setSpecialty(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Registration Number</Label>
              <Input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Professional registration number" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>
            <Button onClick={save} disabled={saving}>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="glass-card p-6 space-y-5">
            <div>
              <Label className="text-foreground">Current Plan</Label>
              <p className="text-foreground font-medium mt-1 capitalize">{profile?.account_tier || "Starter"}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <Input value={profile?.email || ""} readOnly className="bg-secondary border-border text-foreground" />
            </div>
            <Button variant="outline" className="border-border text-foreground">Change Password</Button>
            <div className="pt-4 border-t border-border">
              <Button variant="outline" onClick={signOut} className="border-destructive text-destructive">Sign Out</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
