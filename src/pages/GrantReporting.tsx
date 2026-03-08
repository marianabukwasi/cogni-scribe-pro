import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, FileText, Globe, ArrowUpRight, Heart, BarChart3 } from "lucide-react";
import { generateGrantReportPDF } from "@/lib/pdfExport";

const demoStats = {
  totalBeneficiaries: { month: 47, quarter: 142, year: 518 },
  casesByType: [
    { type: "Asylum Application", count: 23, pct: 32 },
    { type: "Housing", count: 18, pct: 25 },
    { type: "Social Services", count: 15, pct: 21 },
    { type: "Medical Needs", count: 9, pct: 13 },
    { type: "Emergency Support", count: 6, pct: 9 },
  ],
  languages: ["English", "French", "Arabic", "Tigrinya", "Dari", "Somali", "Pashto", "German"],
  needsCategories: [
    { category: "Housing", count: 34 },
    { category: "Legal Representation", count: 28 },
    { category: "Healthcare", count: 22 },
    { category: "Employment", count: 19 },
    { category: "Education", count: 15 },
    { category: "Mental Health", count: 12 },
  ],
  referralsMade: 87,
};

export default function GrantReporting() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("quarter");

  const isNgo = ["ngo_caseworker", "social_worker", "refugee_support"].includes(profile?.profession || "") ||
    profile?.account_tier === "ngo";

  if (!isNgo) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-20">
        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading text-2xl text-foreground mb-2">Grant Reporting</h1>
        <p className="text-muted-foreground">This feature is available for NGO and public service accounts.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Grant Reporting</h1>
          <p className="text-muted-foreground text-sm mt-1">All data is anonymised. No personal information is included.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={v => setPeriod(v as any)}>
            <SelectTrigger className="w-36 bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface border-border">
              <SelectItem value="month" className="text-foreground">This Month</SelectItem>
              <SelectItem value="quarter" className="text-foreground">This Quarter</SelectItem>
              <SelectItem value="year" className="text-foreground">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> Export PDF</Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Beneficiaries Supported", value: demoStats.totalBeneficiaries[period], icon: Users },
          { label: "Cases Managed", value: demoStats.casesByType.reduce((s, c) => s + c.count, 0), icon: FileText },
          { label: "Languages Supported", value: demoStats.languages.length, icon: Globe },
          { label: "Referrals Made", value: demoStats.referralsMade, icon: ArrowUpRight },
        ].map(s => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-xs">{s.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cases by type */}
        <div className="glass-card p-6">
          <h2 className="text-foreground font-medium mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Cases by Type
          </h2>
          <div className="space-y-3">
            {demoStats.casesByType.map(c => (
              <div key={c.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{c.type}</span>
                  <span className="text-muted-foreground">{c.count} ({c.pct}%)</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs categories */}
        <div className="glass-card p-6">
          <h2 className="text-foreground font-medium mb-4">Needs Identified</h2>
          <div className="space-y-3">
            {demoStats.needsCategories.map(n => (
              <div key={n.category} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                <span className="text-foreground text-sm">{n.category}</span>
                <Badge variant="outline" className="border-border text-muted-foreground">{n.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Languages */}
      <div className="glass-card p-6">
        <h2 className="text-foreground font-medium mb-4">Languages Supported</h2>
        <div className="flex flex-wrap gap-2">
          {demoStats.languages.map(l => (
            <Badge key={l} className="bg-primary/10 text-primary border-0">{l}</Badge>
          ))}
        </div>
      </div>

      <div className="text-center pt-4">
        <p className="text-muted-foreground text-xs">
          This report contains only anonymised, aggregated data suitable for grant applications and donor reporting.
        </p>
      </div>
    </div>
  );
}
