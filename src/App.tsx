import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DemoProvider, useDemo } from "@/contexts/DemoContext";
import AppLayout from "@/components/layout/AppLayout";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Sessions from "./pages/Sessions";
import SessionNew from "./pages/SessionNew";
import LiveSession from "./pages/LiveSession";
import PostSession from "./pages/PostSession";
import DocumentReview from "./pages/DocumentReview";
import KnowledgeBase from "./pages/KnowledgeBase";
import SettingsPage from "./pages/SettingsPage";
import IntakeTemplates from "./pages/IntakeTemplates";
import IntakeForm from "./pages/IntakeForm";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import NGOApplication from "./pages/NGOApplication";
import NGOIntake from "./pages/NGOIntake";
import GrantReporting from "./pages/GrantReporting";
import PilotAgreement from "./pages/PilotAgreement";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground">Loading...</span></div>;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute() {
  const { user, loading, profile } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;
  return <Onboarding />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DemoProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/sign-in" element={<AuthRoute><SignIn /></AuthRoute>} />
            <Route path="/sign-up" element={<AuthRoute><SignUp /></AuthRoute>} />
            <Route path="/intake" element={<IntakeForm />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/ngo-apply" element={<NGOApplication />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientProfile />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/session/new" element={<SessionNew />} />
              <Route path="/session/:id/live" element={<LiveSession />} />
              <Route path="/session/:id/post" element={<PostSession />} />
              <Route path="/session/:id/documents" element={<DocumentReview />} />
              <Route path="/session/:id" element={<PostSession />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/intake-templates" element={<IntakeTemplates />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/ngo-intake" element={<NGOIntake />} />
              <Route path="/grant-reporting" element={<GrantReporting />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </DemoProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
