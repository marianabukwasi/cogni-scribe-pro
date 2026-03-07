import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const professions = [
  { value: "medical_doctor", label: "Medical Doctor" },
  { value: "therapist", label: "Therapist / Psychologist" },
  { value: "lawyer", label: "Lawyer" },
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "hr_professional", label: "HR Professional" },
  { value: "ngo_caseworker", label: "NGO Caseworker" },
  { value: "social_worker", label: "Social Worker" },
  { value: "refugee_support", label: "Refugee / Asylum Support" },
  { value: "other", label: "Other" },
];

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [profession, setProfession] = useState("");
  const [otherProfession, setOtherProfession] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profession) { toast.error("Please select a profession"); return; }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, profession);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/verify-email");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1 mb-2">
            <span className="font-heading text-4xl text-foreground">medic</span>
            <span className="w-3 h-3 rounded-full bg-primary inline-block mb-1" />
            <span className="font-heading text-4xl text-foreground">ai</span>
          </div>
          <p className="text-muted-foreground text-sm">Create your professional account</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Dr. Jane Smith" required className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@practice.com" required className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Profession</Label>
              <Select value={profession} onValueChange={setProfession}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select your profession" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {professions.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-foreground">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {profession === "other" && (
              <div className="space-y-2">
                <Label className="text-foreground">Specify Profession</Label>
                <Input value={otherProfession} onChange={e => setOtherProfession(e.target.value)} placeholder="Your profession" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account? <Link to="/sign-in" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
