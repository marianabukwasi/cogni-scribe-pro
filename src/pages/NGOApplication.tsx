import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Check } from "lucide-react";
import { toast } from "sonner";

export default function NGOApplication() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    orgName: "",
    regNumber: "",
    country: "",
    contactName: "",
    email: "",
    description: "",
  });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orgName || !form.email || !form.contactName) {
      toast.error("Please fill in required fields");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <h1 className="font-heading text-3xl text-foreground mb-3">Application Received</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for applying. We'll review your application and get back to you within 5 business days.
            A confirmation email has been sent to {form.email}.
          </p>
          <Button onClick={() => navigate("/sign-in")}>Return to Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <button onClick={() => navigate("/")} className="flex items-center gap-1">
            <span className="font-heading text-2xl text-foreground">kloer</span>
            <span className="w-2 h-2 rounded-full bg-primary inline-block mb-1" />
            <span className="font-heading text-2xl text-foreground">ai</span>
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="w-6 h-6 text-accent" />
          <h1 className="font-heading text-3xl text-foreground">Apply for NGO Access</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Full platform access at €49/month, or free with a White Label sponsor. Tell us about your organisation.
        </p>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground">Organisation Name *</Label>
            <Input value={form.orgName} onChange={e => update("orgName", e.target.value)}
              className="bg-secondary border-border text-foreground" required />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Registration Number</Label>
            <Input value={form.regNumber} onChange={e => update("regNumber", e.target.value)}
              className="bg-secondary border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Country</Label>
            <Select value={form.country} onValueChange={v => update("country", v)}>
              <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent className="bg-surface border-border">
                {["Luxembourg", "France", "Germany", "Belgium", "Hungary", "Austria", "Netherlands", "Other"].map(c =>
                  <SelectItem key={c} value={c} className="text-foreground">{c}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-foreground">Contact Name *</Label>
              <Input value={form.contactName} onChange={e => update("contactName", e.target.value)}
                className="bg-secondary border-border text-foreground" required />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Email *</Label>
              <Input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                className="bg-secondary border-border text-foreground" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Brief description of use case</Label>
            <Textarea value={form.description} onChange={e => update("description", e.target.value)}
              placeholder="How will your organisation use kloer.ai?"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[100px]" />
          </div>
          <Button type="submit" className="w-full gap-2">
            <Heart className="w-4 h-4" /> Submit Application
          </Button>
        </form>
      </div>
    </div>
  );
}
