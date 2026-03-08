import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Mic, FileText, StickyNote, Clock, Save } from "lucide-react";

const medicalProfessions = ["medical_doctor"];
const legalProfessions = ["lawyer"];
const ngoProfessions = ["ngo_caseworker", "social_worker", "refugee_support"];

export default function ClientProfile() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const profession = profile?.profession || "other";
  const isMedical = medicalProfessions.includes(profession);
  const isLegal = legalProfessions.includes(profession);
  const isNgo = ngoProfessions.includes(profession);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [cRes, sRes, dRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("sessions").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      ]);
      setClient(cRes.data);
      setNotes(cRes.data?.notes || "");
      setSessions(sRes.data || []);
      setDocuments(dRes.data || []);
    };
    load();
  }, [id]);

  const saveNotes = async () => {
    setNotesSaving(true);
    const timestamp = new Date().toLocaleString();
    const updatedNotes = notes.trim() ? `${notes}\n\n--- Updated ${timestamp} ---` : notes;
    const { error } = await supabase.from("clients").update({ notes: updatedNotes }).eq("id", id!);
    setNotesSaving(false);
    if (error) { toast.error("Failed to save notes"); return; }
    toast.success("Notes saved");
    setNotes(updatedNotes);
  };

  if (!client) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const age = client.date_of_birth ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / (365.25 * 86400000)) : null;
  const lastSession = sessions.length > 0 ? sessions[0] : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/clients" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Clients
      </Link>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-primary text-lg font-medium">{client.first_name[0]}{client.last_name[0]}</span>
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-2xl text-foreground">{client.first_name} {client.last_name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              {age !== null && <span>{age} years old</span>}
              {client.case_reference && <span>Ref: {client.case_reference}</span>}
              <span className={`status-badge ${client.case_status === "active" ? "bg-accent/20 text-accent" : client.case_status === "archived" ? "bg-secondary text-muted-foreground" : "bg-warning/20 text-warning"}`}>
                {client.case_status}
              </span>
              {lastSession && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Last seen {new Date(lastSession.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-surface border border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Overview</TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="glass-card p-6 space-y-5">
            <h2 className="font-heading text-lg text-foreground">Key Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Language:</span> <span className="text-foreground ml-2">{client.preferred_language || "Not set"}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground ml-2">{client.contact_email || "—"}</span></div>
              {client.contact_phone && <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground ml-2">{client.contact_phone}</span></div>}
              {client.date_of_birth && <div><span className="text-muted-foreground">DOB:</span> <span className="text-foreground ml-2">{new Date(client.date_of_birth).toLocaleDateString()}</span></div>}
            </div>

            {/* Medical-specific */}
            {isMedical && (
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Medical Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {client.gender && <div><span className="text-muted-foreground">Gender:</span> <span className="text-foreground ml-2">{client.gender}</span></div>}
                  {client.blood_type && <div><span className="text-muted-foreground">Blood Type:</span> <span className="text-foreground ml-2">{client.blood_type}</span></div>}
                </div>
                {client.allergies?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1.5">Allergies</p>
                    <div className="flex flex-wrap gap-1.5">{client.allergies.map((a: string) => <span key={a} className="status-badge bg-destructive/20 text-destructive">{a}</span>)}</div>
                  </div>
                )}
                {client.current_medications?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1.5">Current Medications</p>
                    <div className="flex flex-wrap gap-1.5">{client.current_medications.map((m: string) => <span key={m} className="status-badge bg-primary/20 text-primary">{m}</span>)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Legal-specific */}
            {isLegal && (client.case_type || client.jurisdiction || client.opposing_party) && (
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Legal Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {client.case_type && <div><span className="text-muted-foreground">Case Type:</span> <span className="text-foreground ml-2">{client.case_type}</span></div>}
                  {client.jurisdiction && <div><span className="text-muted-foreground">Jurisdiction:</span> <span className="text-foreground ml-2">{client.jurisdiction}</span></div>}
                  {client.opposing_party && <div><span className="text-muted-foreground">Opposing Party:</span> <span className="text-foreground ml-2">{client.opposing_party}</span></div>}
                </div>
              </div>
            )}

            {/* NGO-specific */}
            {isNgo && (
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Case Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {client.country_of_origin && <div><span className="text-muted-foreground">Country of Origin:</span> <span className="text-foreground ml-2">{client.country_of_origin}</span></div>}
                  {client.arrival_date && <div><span className="text-muted-foreground">Arrival Date:</span> <span className="text-foreground ml-2">{new Date(client.arrival_date).toLocaleDateString()}</span></div>}
                </div>
                {client.languages_spoken?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1.5">Languages Spoken</p>
                    <div className="flex flex-wrap gap-1.5">{client.languages_spoken.map((l: string) => <span key={l} className="status-badge bg-primary/20 text-primary">{l}</span>)}</div>
                  </div>
                )}
                {client.vulnerability_flags?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1.5">Vulnerability Flags</p>
                    <div className="flex flex-wrap gap-1.5">{client.vulnerability_flags.map((f: string) => <span key={f} className="status-badge bg-purple-500/20 text-purple-400">{f}</span>)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <div className="glass-card divide-y divide-border">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No sessions yet</div>
            ) : sessions.map(s => (
              <Link key={s.id} to={`/session/${s.id}`} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.session_type || "Session"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.duration_seconds && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(s.duration_seconds / 60)}m
                    </span>
                  )}
                  <span className={`status-badge ${s.status === "ended" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>{s.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="glass-card divide-y divide-border">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No documents yet</div>
            ) : documents.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.document_type} · {new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-primary">Download</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg text-foreground flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-muted-foreground" /> Notes
              </h2>
              <Button size="sm" onClick={saveNotes} disabled={notesSaving} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />Save
              </Button>
            </div>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add timestamped notes about this client..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[200px] font-mono text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
