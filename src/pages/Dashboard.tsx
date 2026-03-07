import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, Users, Clock, Calendar, Plus } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalSessions: 0, totalClients: 0, weekSessions: 0 });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    const load = async () => {
      const [sessRes, clientRes, weekRes, recentRes] = await Promise.all([
        supabase.from("sessions").select("id", { count: "exact", head: true }).eq("professional_id", profile.user_id),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("professional_id", profile.user_id),
        supabase.from("sessions").select("id", { count: "exact", head: true }).eq("professional_id", profile.user_id).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("sessions").select("*").eq("professional_id", profile.user_id).order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({
        totalSessions: sessRes.count || 0,
        totalClients: clientRes.count || 0,
        weekSessions: weekRes.count || 0,
      });
      setRecentSessions(recentRes.data || []);
    };
    load();
  }, [profile]);

  const statCards = [
    { label: "Total Sessions", value: stats.totalSessions, icon: Mic, color: "text-primary" },
    { label: "Total Clients", value: stats.totalClients, icon: Users, color: "text-accent" },
    { label: "This Week", value: stats.weekSessions, icon: Calendar, color: "text-warning" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's your practice overview</p>
        </div>
        <Button onClick={() => navigate("/session/new")} className="gap-2">
          <Plus className="w-4 h-4" />
          Start New Session
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{s.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
              <s.icon className={`w-8 h-8 ${s.color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card">
        <div className="p-5 border-b border-border">
          <h2 className="font-heading text-xl text-foreground">Recent Sessions</h2>
        </div>
        {recentSessions.length === 0 ? (
          <div className="p-10 text-center">
            <Mic className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No sessions yet. Start your first session to get going.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentSessions.map(s => (
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
                  <span className={`status-badge ${s.status === 'ended' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'}`}>
                    {s.status}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
