import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download, ArrowUpRight, Check, Calendar, AlertTriangle } from "lucide-react";

const plans = [
  { id: "starter", name: "Starter", price: 149, annual: null },
  { id: "professional", name: "Professional", price: 249, annual: 2999 },
  { id: "white_label", name: "White Label", price: 499, annual: null },
  { id: "ngo", name: "NGO / Public Service", price: 49, annual: null },
];

const demoInvoices = [
  { id: "INV-2026-003", date: "2026-03-01", amount: 249, status: "paid" },
  { id: "INV-2026-002", date: "2026-02-01", amount: 249, status: "paid" },
  { id: "INV-2026-001", date: "2026-01-01", amount: 249, status: "paid" },
];

export default function Billing() {
  const { profile } = useAuth();
  const [annual, setAnnual] = useState(false);
  const currentPlan = profile?.account_tier || "starter";
  const trialActive = true; // demo
  const trialDays = 23;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="font-heading text-3xl text-foreground">Billing & Subscription</h1>

      {/* Trial banner */}
      {trialActive && (
        <div className="glass-card p-4 flex items-center gap-3 border-warning/30 bg-warning/5">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div className="flex-1">
            <p className="text-foreground text-sm font-medium">Free trial — {trialDays} days remaining</p>
            <p className="text-muted-foreground text-xs">Add a payment method to continue after your trial ends.</p>
          </div>
          <Button size="sm" className="bg-warning text-warning-foreground hover:bg-warning/90">Add Payment Method</Button>
        </div>
      )}

      {/* Current plan */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-foreground font-medium text-lg">Current Plan</h2>
            <p className="text-muted-foreground text-sm">
              {plans.find(p => p.id === currentPlan)?.name || "Starter"} — renews April 8, 2026
            </p>
          </div>
          <Badge className="bg-accent/20 text-accent border-0 text-sm">
            {plans.find(p => p.id === currentPlan)?.name}
          </Badge>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-muted-foreground">Monthly</span>
          <Switch checked={annual} onCheckedChange={setAnnual} />
          <span className="text-sm text-muted-foreground">
            Annual <span className="text-accent text-xs ml-1">Save up to €989</span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {plans.map(p => (
            <button
              key={p.id}
              className={`p-4 rounded-lg border text-left transition-colors ${
                p.id === currentPlan
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <p className="text-foreground text-sm font-medium">{p.name}</p>
              <p className="text-foreground text-xl font-bold mt-1">
                €{annual && p.annual ? Math.round(p.annual / 12) : p.price}
                <span className="text-muted-foreground text-xs font-normal">/mo</span>
              </p>
              {p.id === currentPlan && (
                <div className="flex items-center gap-1 mt-2 text-accent text-xs">
                  <Check className="w-3 h-3" /> Current
                </div>
              )}
            </button>
          ))}
        </div>
        <Button className="mt-4 gap-2" variant="outline">
          <ArrowUpRight className="w-4 h-4" /> Change Plan
        </Button>
      </div>

      {/* Payment method */}
      <div className="glass-card p-6">
        <h2 className="text-foreground font-medium text-lg mb-4">Payment Method</h2>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <span className="text-foreground text-sm">•••• •••• •••• 4242</span>
          <span className="text-muted-foreground text-xs">Expires 12/28</span>
          <Button variant="ghost" size="sm" className="ml-auto text-xs">Update</Button>
        </div>
      </div>

      {/* Invoice history */}
      <div className="glass-card p-6">
        <h2 className="text-foreground font-medium text-lg mb-4">Invoice History</h2>
        <div className="space-y-2">
          {demoInvoices.map(inv => (
            <div key={inv.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground text-sm flex-1">{inv.id}</span>
              <span className="text-muted-foreground text-sm">{inv.date}</span>
              <span className="text-foreground text-sm font-medium">€{inv.amount}</span>
              <Badge variant="outline" className="text-accent border-accent/30 text-xs">{inv.status}</Badge>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
