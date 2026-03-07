import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Mic, FileText, StickyNote } from "lucide-react";

export default function ClientProfile() {
  const { id } = useParams();
  const [client, setClient] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [cRes, sRes, dRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("sessions").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      ]);
      setClient(cRes.data);
      setSessions(sRes.data || []);
      setDocuments(dRes.data || []);
    };
    load();
  }, [id]);

  if (!client) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const age = client.date_of_birth ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / (365.25 * 86400000)) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/clients" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Clients
      </Link>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-lg font-medium">{client.first_name[0]}{client.last_name[0]}</span>
          </div>
          <div>
            <h1 className="font-heading text-2xl text-foreground">{client.first_name} {client.last_name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {age && <span>{age} years old</span>}
              {client.case_reference && <span>Ref: {client.case_reference}</span>}
              <span className={`status-badge ${client.case_status === 'active' ? 'bg-accent/20 text-accent' : 'bg-secondary text-muted-foreground'}`}>
                {client.case_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-surface border border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Overview</TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Sessions</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Documents</TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-heading text-lg text-foreground">Key Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Language:</span> <span className="text-foreground ml-2">{client.preferred_language || "Not set"}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground ml-2">{client.contact_email || "—"}</span></div>
              {client.gender && <div><span className="text-muted-foreground">Gender:</span> <span className="text-foreground ml-2">{client.gender}</span></div>}
              {client.blood_type && <div><span className="text-muted-foreground">Blood Type:</span> <span className="text-foreground ml-2">{client.blood_type}</span></div>}
            </div>
            {client.allergies?.length > 0 && (
              <div>
                <p className="text-muted-foreground text-sm mb-1">Allergies</p>
                <div className="flex flex-wrap gap-2">{client.allergies.map((a: string) => <span key={a} className="status-badge bg-destructive/20 text-destructive">{a}</span>)}</div>
              </div>
            )}
            {client.vulnerability_flags?.length > 0 && (
              <div>
                <p className="text-muted-foreground text-sm mb-1">Vulnerability Flags</p>
                <div className="flex flex-wrap gap-2">{client.vulnerability_flags.map((f: string) => <span key={f} className="status-badge bg-purple-500/20 text-purple-400">{f}</span>)}</div>
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
                  <Mic className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.session_type || "Session"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="status-badge bg-primary/20 text-primary">{s.status}</span>
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
                  <FileText className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.document_type} — {new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-primary">Download</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="glass-card p-6">
            <p className="text-muted-foreground">{client.notes || "No notes added yet."}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
