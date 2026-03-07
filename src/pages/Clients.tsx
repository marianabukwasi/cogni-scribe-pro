import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Users, Calendar } from "lucide-react";

const professionLabel: Record<string, string> = {
  medical_doctor: "Patient", therapist: "Client", lawyer: "Client",
  ngo_caseworker: "Beneficiary", social_worker: "Beneficiary",
  refugee_support: "Beneficiary",
};

export default function Clients() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", date_of_birth: "", preferred_language: "en", contact_email: "", case_reference: "", notes: "" });

  const load = async () => {
    if (!profile) return;
    let q = supabase.from("clients").select("*").eq("professional_id", profile.user_id).order("updated_at", { ascending: false });
    if (filter === "recent") q = q.gte("updated_at", new Date(Date.now() - 30 * 86400000).toISOString());
    if (filter === "active") q = q.eq("case_status", "active");
    if (filter === "archived") q = q.eq("case_status", "archived");
    const { data } = await q;
    setClients(data || []);
  };

  useEffect(() => { load(); }, [profile, filter]);

  const handleAdd = async () => {
    if (!form.first_name || !form.last_name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("clients").insert({
      ...form, professional_id: profile!.user_id,
      date_of_birth: form.date_of_birth || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Client added");
    setOpen(false);
    setForm({ first_name: "", last_name: "", date_of_birth: "", preferred_language: "en", contact_email: "", case_reference: "", notes: "" });
    load();
  };

  const clientLabel = professionLabel[profile?.profession || ""] || "Client";
  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.case_reference || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl text-foreground">Clients</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add New {clientLabel}</Button>
          </DialogTrigger>
          <DialogContent className="bg-surface border-border max-w-md">
            <DialogHeader><DialogTitle className="text-foreground font-heading">Add New {clientLabel}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">First Name*</Label>
                  <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Last Name*</Label>
                  <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="bg-secondary border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Email</Label>
                <Input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Case Reference</Label>
                <Input value={form.case_reference} onChange={e => setForm(f => ({ ...f, case_reference: e.target.value }))} className="bg-secondary border-border text-foreground" />
              </div>
              <Button onClick={handleAdd} className="w-full">Add {clientLabel}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 mb-6">
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

      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No clients found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Link key={c.id} to={`/clients/${c.id}`} className="glass-card p-5 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary text-sm font-medium">{c.first_name[0]}{c.last_name[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-muted-foreground">{clientLabel}</p>
                  {c.case_reference && <p className="text-xs text-muted-foreground mt-1">Ref: {c.case_reference}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className={`status-badge ${c.case_status === 'active' ? 'bg-accent/20 text-accent' : 'bg-secondary text-muted-foreground'}`}>
                  {c.case_status}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
