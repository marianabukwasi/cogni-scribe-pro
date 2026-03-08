import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, Clock, Calendar, Plus, AlertTriangle } from "lucide-react";

const demoSessions = [
  { id: "demo-1", client_name: "Jean Müller", session_type: "Follow-up", status: "ended", created_at: new Date(Date.now() - 86400000).toISOString(), duration_seconds: 1800 },
  { id: "demo-2", client_name: "Anonymous", session_type: "Intake Interview", status: "ended", created_at: new Date(Date.now() - 3 * 86400000).toISOString(), duration_seconds: 2700 },
  { id: "demo-3", client_name: "Maria Kovács", session_type: "Initial Consultation", status: "ended", created_at: new Date(Date.now() - 5 * 86400000).toISOString(), duration_seconds: 2100 },
];

export default function Sessions() {
  const { profile } = useAuth();
  const { isDemo } = useDemo();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (isDemo) {
      setSessions(demoSessions);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase.from("sessions").select("*").eq("professional_id", profile.user_id)
      .order("created_at", { ascending: false }).then(({ data, error: err }) => {
        setSessions(data || []);
        if (err) setError("Unable to load sessions — please check your connection.");
        setLoading(false);
      });
  }, [profile, isDemo]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl text-foreground">Sessions</h1>
        <Link to="/sessions/new">
          <Button className="gap-2"><Plus className="w-4 h-4" />New Session</Button>
        </Link>
      </div>

      {error && (
        <div className="glass-card p-4 mb-4 border-destructive/30 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={() => { setError(null); setLoading(true); supabase.from("sessions").select("*").eq("professional_id", profile!.user_id).order("created_at", { ascending: false }).then(({ data }) => { setSessions(data || []); setLoading(false); }); }} className="ml-auto border-border text-foreground">Retry</Button>
        </div>
      )}

      <div className="glass-card divide-y divide-border">
        {loading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <Mic className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-foreground font-medium mb-1">No sessions yet</p>
            <p className="text-sm text-muted-foreground mb-4">Start your first session with a client to see it here.</p>
            <Link to="/sessions/new">
              <Button className="gap-2"><Plus className="w-4 h-4" />Start First Session</Button>
            </Link>
          </div>
        ) : sessions.map(s => (
          <Link key={s.id} to={s.status === "ended" ? `/session/${s.id}/post` : `/session/${s.id}`} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.client_name || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground">{s.session_type || "Session"}{s.duration_seconds ? ` · ${Math.floor(s.duration_seconds / 60)}m` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`status-badge ${s.status === 'ended' ? 'bg-accent/20 text-accent' : s.status === 'active' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                {s.status}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(s.created_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
