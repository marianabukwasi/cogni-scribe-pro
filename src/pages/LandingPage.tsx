import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: "🎙️", title: "Live Transcription", desc: "Real-time speech-to-text in 30+ languages. Your session is transcribed as it happens — no typing, no delays." },
  { icon: "✨", title: "Clickable Suggestions", desc: "AI-powered clinical suggestions appear in real time. Click to accept diagnoses, medications, and referrals." },
  { icon: "📄", title: "Document Generation", desc: "SOAP notes, prescriptions, referral letters — generated instantly in your country's format and language." },
  { icon: "🔒", title: "Privacy by Default", desc: "Choose what to keep after every session. Transcripts can be auto-purged. GDPR-compliant by design." },
  { icon: "🌍", title: "Multilingual", desc: "Speak in one language, generate documents in another. Full support for cross-language consultations." },
  { icon: "🏥", title: "NGO & Social Impact", desc: "Specialised workflows for asylum intake, casework, and grant reporting — at subsidised pricing." },
];

const plans = [
  { name: "Starter", price: "€149", period: "/month", features: ["Live transcription", "AI suggestions", "Document generation", "5 clients", "Email support"], highlighted: false },
  { name: "Professional", price: "€249", period: "/month", features: ["Everything in Starter", "Unlimited clients", "Knowledge base", "Custom templates", "Priority support"], highlighted: true },
  { name: "NGO", price: "€49", period: "/month", features: ["Everything in Professional", "Grant reporting dashboard", "Anonymised intake", "Pilot agreements", "Dedicated onboarding"], highlighted: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-0 text-xl font-bold tracking-tight font-body">
            <span className="text-foreground">kloer</span>
            <span className="mx-0.5 inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="text-primary">ai</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#footer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">Sign in</Link>
            <Button asChild size="sm">
              <Link to="/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="container mx-auto flex flex-col items-center px-4 pt-20 pb-16 text-center md:pt-32 md:pb-24">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Built for European professionals
        </div>
        <h1 className="max-w-3xl text-4xl font-heading leading-tight md:text-6xl lg:text-7xl">
          The AI that listens
          <br />
          <span className="text-primary">so you don't have to write</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
          Kloer.ai listens to your appointments in real time, transcribes every word, and generates your notes, prescriptions, and referral letters — in your language, in your style, ready to sign.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link to="/sign-up">Start free trial</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#features">See how it works</a>
          </Button>
        </div>
      </section>

      {/* TAGLINE */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <blockquote className="mx-auto max-w-2xl border-l-4 border-primary pl-6 text-lg italic text-muted-foreground md:text-xl">
          "The AI that listens to help you think, but forgets to protect your privacy."
        </blockquote>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-surface py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-heading md:text-4xl">Everything you need</h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">From live transcription to document generation, Kloer.ai handles the paperwork so you can focus on your client.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border bg-card hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="mb-2 text-3xl">{f.icon}</div>
                  <CardTitle className="text-lg font-body font-semibold">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{f.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-heading md:text-4xl">Simple, transparent pricing</h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">No hidden fees. Cancel anytime. All plans include a 14-day free trial.</p>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.name} className={`relative flex flex-col border-border bg-card ${p.highlighted ? "border-primary ring-1 ring-primary" : ""}`}>
                {p.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">RECOMMENDED</Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl font-body font-semibold">{p.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold font-body">{p.price}</span>
                    <span className="text-muted-foreground">{p.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-8 flex-1 space-y-3 text-sm text-muted-foreground">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <span className="mt-0.5 text-accent">✓</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={p.highlighted ? "default" : "outline"} className="w-full">
                    <Link to="/sign-up">Get started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="footer" className="border-t border-border py-10">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 text-center">
          <div className="flex items-center gap-0 text-lg font-bold font-body">
            <span className="text-foreground">kloer</span>
            <span className="mx-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-primary">ai</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Kloer.ai — Built in Luxembourg — Privacy by design</p>
        </div>
      </footer>
    </div>
  );
}
