import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Users, Calendar, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const professionLabel: Record<string, string> = {
  medical_doctor: "Patient", therapist: "Client", lawyer: "Client",
  financial_advisor: "Client", hr_professional: "Client",
  ngo_caseworker: "Beneficiary", social_worker: "Beneficiary",
  refugee_support: "Beneficiary", other: "Client",
};

const medicalProfessions = ["medical_doctor"];
const legalProfessions = ["lawyer"];
const ngoProfessions = ["ngo_caseworker", "social_worker", "refugee_support"];

const caseStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_process", label: "In Process" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "appeal", label: "Appeal" },
];

const vulnerabilityOptions = ["Minor", "Medical needs", "Trauma", "Domestic abuse", "Unaccompanied", "Other"];

const langOptions = ["English", "French", "German", "Luxembourgish", "Hungarian", "Spanish", "Dutch", "Italian", "Arabic", "Other"];

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) { onChange([...tags, val]); setInput(""); }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map(t => (
          <span key={t} className="status-badge bg-primary/20 text-primary gap-1">
            {t}
            <button onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-destructive"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <Input
        value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}

function MultiSelect({ selected, onChange, options, placeholder }: { selected: string[]; onChange: (v: string[]) => void; options: string[]; placeholder: string }) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`status-badge cursor-pointer transition-colors ${selected.includes(o) ? "bg-primary/20 text-primary border border-primary/40" : "bg-secondary text-muted-foreground border border-border hover:border-primary/30"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

interface ClientForm {
  first_name: string; last_name: string; date_of_birth: string; preferred_language: string;
  contact_email: string; contact_phone: string; case_reference: string; notes: string;
  gender: string; blood_type: string; allergies: string[]; current_medications: string[];
  case_type: string; jurisdiction: string; opposing_party: string;
  country_of_origin: string; arrival_date: string; case_status: string;
  languages_spoken: string[]; vulnerability_flags: string[];
}

const emptyForm: ClientForm = {
  first_name: "", last_name: "", date_of_birth: "", preferred_language: "English",
  contact_email: "", contact_phone: "", case_reference: "", notes: "",
  gender: "", blood_type: "", allergies: [], current_medications: [],
  case_type: "", jurisdiction: "", opposing_party: "",
  country_of_origin: "", arrival_date: "", case_status: "pending",
  languages_spoken: [], vulnerability_flags: [],
};

export default function Clients() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, { count: number; lastDate: string | null }>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClientForm>({ ...emptyForm });

  const profession = profile?.profession || "other";
  const isMedical = medicalProfessions.includes(profession);
  const isLegal = legalProfessions.includes(profession);
  const isNgo = ngoProfessions.includes(profession);
  const clientLabel = professionLabel[profession] || "Client";

  const load = async () => {
    if (!profile) return;
    let q = supabase.from("clients").select("*").eq("professional_id", profile.user_id).order("updated_at", { ascending: false });
    if (filter === "recent") q = q.gte("updated_at", new Date(Date.now() - 30 * 86400000).toISOString());
    if (filter === "active") q = q.eq("case_status", "active");
    if (filter === "archived") q = q.eq("case_status", "archived");
    const { data } = await q;
    setClients(data || []);

    // Load session counts for each client
    if (data && data.length > 0) {
      const { data: sessData } = await supabase
        .from("sessions")
        .select("client_id, created_at")
        .eq("professional_id", profile.user_id)
        .in("client_id", data.map(c => c.id))
        .order("created_at", { ascending: false });

      const counts: Record<string, { count: number; lastDate: string | null }> = {};
      (sessData || []).forEach(s => {
        if (!counts[s.client_id!]) counts[s.client_id!] = { count: 0, lastDate: s.created_at };
        counts[s.client_id!].count++;
      });
      setSessionCounts(counts);
    }
  };

  useEffect(() => { load(); }, [profile, filter]);

  const handleAdd = async () => {
    if (!form.first_name || !form.last_name) { toast.error("Name is required"); return; }
    const insertData: any = {
      first_name: form.first_name, last_name: form.last_name,
      professional_id: profile!.user_id,
      date_of_birth: form.date_of_birth || null,
      preferred_language: form.preferred_language || "English",
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      case_reference: form.case_reference || null,
      notes: form.notes || null,
    };

    if (isMedical) {
      insertData.gender = form.gender || null;
      insertData.blood_type = form.blood_type || null;
      insertData.allergies = form.allergies;
      insertData.current_medications = form.current_medications;
    }
    if (isLegal) {
      insertData.case_type = form.case_type || null;
      insertData.jurisdiction = form.jurisdiction || null;
      insertData.opposing_party = form.opposing_party || null;
    }
    if (isNgo) {
      insertData.country_of_origin = form.country_of_origin || null;
      insertData.arrival_date = form.arrival_date || null;
      insertData.case_status = form.case_status || "pending";
      insertData.languages_spoken = form.languages_spoken;
      insertData.vulnerability_flags = form.vulnerability_flags;
    }

    const { error } = await supabase.from("clients").insert(insertData);
    if (error) { toast.error(error.message); return; }
    toast.success(`${clientLabel} added`);
    setOpen(false);
    setForm({ ...emptyForm });
    load();
  };

  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.case_reference || ""} ${c.id}`.toLowerCase().includes(search.toLowerCase())
  );

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
  };

  const upd = (key: keyof ClientForm, val: any) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="font-heading text-2xl md:text-3xl text-foreground">Clients</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add New {clientLabel}</Button>
          </DialogTrigger>
          <DialogContent className="bg-surface border-border max-w-lg max-h-[85vh] p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-foreground font-heading">Add New {clientLabel}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="px-6 pb-6 max-h-[70vh]">
              <div className="space-y-4 pr-2">
                {/* Common fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">First Name *</Label>
                    <Input value={form.first_name} onChange={e => upd("first_name", e.target.value)} className="bg-secondary border-border text-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Last Name *</Label>
                    <Input value={form.last_name} onChange={e => upd("last_name", e.target.value)} className="bg-secondary border-border text-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Date of Birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={e => upd("date_of_birth", e.target.value)} className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Preferred Language</Label>
                  <Select value={form.preferred_language} onValueChange={v => upd("preferred_language", v)}>
                    <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-surface border-border">
                      {langOptions.map(l => <SelectItem key={l} value={l} className="text-foreground">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Email (optional)</Label>
                    <Input value={form.contact_email} onChange={e => upd("contact_email", e.target.value)} className="bg-secondary border-border text-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Phone (optional)</Label>
                    <Input value={form.contact_phone} onChange={e => upd("contact_phone", e.target.value)} className="bg-secondary border-border text-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Case Reference (optional)</Label>
                  <Input value={form.case_reference} onChange={e => upd("case_reference", e.target.value)} className="bg-secondary border-border text-foreground" />
                </div>

                {/* Medical-specific */}
                {isMedical && (
                  <>
                    <div className="border-t border-border pt-4 mt-2">
                      <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">Medical Information</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs">Gender</Label>
                        <Select value={form.gender} onValueChange={v => upd("gender", v)}>
                          <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-surface border-border">
                            {["Male", "Female", "Other", "Prefer not to say"].map(g => <SelectItem key={g} value={g} className="text-foreground">{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs">Blood Type</Label>
                        <Select value={form.blood_type} onValueChange={v => upd("blood_type", v)}>
                          <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-surface border-border">
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => <SelectItem key={b} value={b} className="text-foreground">{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Allergies</Label>
                      <TagInput tags={form.allergies} onChange={v => upd("allergies", v)} placeholder="Type allergy and press Enter" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Current Medications</Label>
                      <TagInput tags={form.current_medications} onChange={v => upd("current_medications", v)} placeholder="Type medication and press Enter" />
                    </div>
                  </>
                )}

                {/* Legal-specific */}
                {isLegal && (
                  <>
                    <div className="border-t border-border pt-4 mt-2">
                      <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">Legal Information</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Case Type</Label>
                      <Select value={form.case_type} onValueChange={v => upd("case_type", v)}>
                        <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Select case type" /></SelectTrigger>
                        <SelectContent className="bg-surface border-border">
                          {["Civil", "Criminal", "Family", "Immigration", "Corporate", "Employment", "Real Estate", "Other"].map(c => <SelectItem key={c} value={c} className="text-foreground">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Jurisdiction</Label>
                      <Input value={form.jurisdiction} onChange={e => upd("jurisdiction", e.target.value)} placeholder="e.g. Luxembourg District Court" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Opposing Party (optional)</Label>
                      <Input value={form.opposing_party} onChange={e => upd("opposing_party", e.target.value)} className="bg-secondary border-border text-foreground" />
                    </div>
                  </>
                )}

                {/* NGO-specific */}
                {isNgo && (
                  <>
                    <div className="border-t border-border pt-4 mt-2">
                      <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">Case Information</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Country of Origin</Label>
                      <Input value={form.country_of_origin} onChange={e => upd("country_of_origin", e.target.value)} className="bg-secondary border-border text-foreground" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Arrival Date</Label>
                      <Input type="date" value={form.arrival_date} onChange={e => upd("arrival_date", e.target.value)} className="bg-secondary border-border text-foreground" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Current Status</Label>
                      <Select value={form.case_status} onValueChange={v => upd("case_status", v)}>
                        <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-surface border-border">
                          {caseStatusOptions.map(s => <SelectItem key={s.value} value={s.value} className="text-foreground">{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Languages Spoken</Label>
                      <MultiSelect selected={form.languages_spoken} onChange={v => upd("languages_spoken", v)} options={langOptions} placeholder="Select languages" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Vulnerability Flags</Label>
                      <MultiSelect selected={form.vulnerability_flags} onChange={v => upd("vulnerability_flags", v)} options={vulnerabilityOptions} placeholder="Select flags" />
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Notes (optional)</Label>
                  <Textarea value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Any additional notes..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[60px]" />
                </div>

                <Button onClick={handleAdd} className="w-full">Add {clientLabel}</Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, or reference..." className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-surface border-border">
            <SelectItem value="all" className="text-foreground">All</SelectItem>
            <SelectItem value="recent" className="text-foreground">Recent (30d)</SelectItem>
            <SelectItem value="active" className="text-foreground">Active</SelectItem>
            <SelectItem value="archived" className="text-foreground">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && !search ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-foreground font-medium mb-1">No {clientLabel.toLowerCase()}s yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add your first {clientLabel.toLowerCase()} to get started.</p>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add First {clientLabel}</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No results for "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const age = getAge(c.date_of_birth);
            const sessInfo = sessionCounts[c.id];
            return (
              <Link key={c.id} to={`/clients/${c.id}`} className="glass-card p-5 hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary text-sm font-medium">{c.first_name[0]}{c.last_name[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {clientLabel}{age !== null ? ` · ${age}y` : ""}
                    </p>
                    {c.case_reference && <p className="text-xs text-muted-foreground mt-0.5">Ref: {c.case_reference}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className={`status-badge ${c.case_status === "active" ? "bg-accent/20 text-accent" : c.case_status === "archived" ? "bg-secondary text-muted-foreground" : "bg-warning/20 text-warning"}`}>
                    {c.case_status}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {sessInfo && <span>{sessInfo.count} session{sessInfo.count !== 1 ? "s" : ""}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {sessInfo?.lastDate ? new Date(sessInfo.lastDate).toLocaleDateString() : new Date(c.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
