import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Clock, Calendar } from "lucide-react";

export default function Sessions() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("sessions").select("*").eq("professional_id", profile.user_id)
      .order("created_at", { ascending: false }).then(({ data }) => setSessions(data || []));
  }, [profile]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-heading text-3xl text-foreground mb-6">Sessions</h1>
      <div className="glass-card divide-y divide-border">
        {sessions.length === 0 ? (
          <div className="p-10 text-center">
            <Mic className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No sessions yet</p>
          </div>
        ) : sessions.map(s => (
          <Link key={s.id} to={`/session/${s.id}`} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.client_name || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground">{s.session_type || "Session"}</p>
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
