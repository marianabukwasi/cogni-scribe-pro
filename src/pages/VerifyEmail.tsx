import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="glass-card p-10">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-3xl text-foreground mb-3">Check your email</h1>
          <p className="text-muted-foreground mb-6">
            We've sent you a verification link. Please check your inbox and click the link to verify your account.
          </p>
          <Button asChild variant="outline" className="border-border text-foreground">
            <Link to="/sign-in">Back to Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
