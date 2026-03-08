import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, Star, Building2, Heart, ArrowRight } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: 149,
    annual: null,
    icon: null,
    badge: null,
    features: [
      "1 profession",
      "50 sessions/month",
      "Core features",
      "2 languages",
      "Email support",
    ],
    cta: "Start Free 30-Day Trial",
    action: "trial",
  },
  {
    name: "Professional",
    price: 249,
    annual: 2999,
    icon: Star,
    badge: "Recommended",
    features: [
      "All professions",
      "Unlimited sessions",
      "All languages",
      "Full knowledge base",
      "Clickable suggestions",
      "Prescription generation",
      "Persistent AI chat",
    ],
    cta: "Start Free 30-Day Trial",
    action: "trial",
  },
  {
    name: "White Label",
    price: 499,
    annual: null,
    icon: Building2,
    badge: null,
    setup: 2000,
    features: [
      "Everything in Professional",
      "Custom branding & domain",
      "Team management",
      "Shared knowledge base",
      "1 sponsored NGO licence",
    ],
    cta: "Contact Us",
    action: "contact",
  },
  {
    name: "NGO / Public Service",
    price: 49,
    annual: null,
    icon: Heart,
    badge: "or sponsored",
    features: [
      "Full platform access",
      "NGO case templates",
      "Grant reporting",
      "Privacy Kill Switch",
      "Rare language support",
    ],
    cta: "Apply for NGO Access",
    action: "ngo",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const navigate = useNavigate();

  const handleAction = (action: string) => {
    if (action === "trial") navigate("/sign-up");
    else if (action === "ngo") navigate("/ngo-apply");
    else if (action === "contact") navigate("/sign-up");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1">
            <span className="font-heading text-2xl text-foreground">kloer</span>
            <span className="w-2 h-2 rounded-full bg-primary inline-block mb-1" />
            <span className="font-heading text-2xl text-foreground">ai</span>
          </button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/sign-in")}>Sign In</Button>
            <Button onClick={() => navigate("/sign-up")}>Get Started</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="font-heading text-5xl text-foreground mb-4">Simple, transparent pricing</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start with a free 30-day trial. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={`text-sm ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual <span className="text-accent text-xs ml-1">Save up to €989</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => {
            const highlighted = tier.name === "Professional";
            return (
              <div
                key={tier.name}
                className={`glass-card p-6 flex flex-col relative ${
                  highlighted ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                    {tier.badge}
                  </span>
                )}
                <div className="mb-4">
                  {tier.icon && <tier.icon className="w-6 h-6 text-primary mb-2" />}
                  <h3 className="font-heading text-2xl text-foreground">{tier.name}</h3>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    €{annual && tier.annual ? Math.round(tier.annual / 12) : tier.price}
                  </span>
                  <span className="text-muted-foreground text-sm">/month</span>
                  {annual && tier.annual && (
                    <p className="text-accent text-xs mt-1">€{tier.annual}/year (save €{tier.price * 12 - tier.annual})</p>
                  )}
                  {tier.setup && (
                    <p className="text-muted-foreground text-xs mt-1">+ €{tier.setup.toLocaleString()} setup</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleAction(tier.action)}
                  variant={highlighted ? "default" : "outline"}
                  className={`w-full gap-2 ${highlighted ? "bg-primary hover:bg-primary/90" : ""}`}
                >
                  {tier.cta} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground text-sm">
            All plans include end-to-end encryption, GDPR compliance, and data residency in the EU.
          </p>
        </div>
      </div>
    </div>
  );
}
