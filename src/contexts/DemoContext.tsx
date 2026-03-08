import { createContext, useContext, useState, ReactNode } from "react";

interface DemoContextType {
  isDemo: boolean;
  enableDemo: () => void;
  disableDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({ isDemo: false, enableDemo: () => {}, disableDemo: () => {} });

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(() => sessionStorage.getItem("demo_mode") === "true");

  const enableDemo = () => {
    sessionStorage.setItem("demo_mode", "true");
    setIsDemo(true);
  };

  const disableDemo = () => {
    sessionStorage.removeItem("demo_mode");
    setIsDemo(false);
  };

  return (
    <DemoContext.Provider value={{ isDemo, enableDemo, disableDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => useContext(DemoContext);

export const DEMO_PROFILE = {
  id: "demo-profile-id",
  user_id: "demo-user-id",
  full_name: "Dr. Sarah Chen",
  email: "sarah.chen@demo.com",
  profession: "medical_doctor" as const,
  profession_other: null,
  specialty: "General Practice",
  organisation: "Luxembourg Health Clinic",
  country_of_practice: "Luxembourg",
  registration_number: "LU-MD-2024-001",
  preferred_language: "en",
  ui_language: "en",
  primary_session_language: "en",
  document_output_language: "en",
  prescription_country_format: "luxembourg",
  referral_letter_language: "en",
  alert_style: ["popup", "sound"],
  alert_sensitivity: "medium",
  default_retention: "transcript_summary" as const,
  auto_purge_minutes: 10,
  account_tier: "professional" as const,
  onboarding_completed: true,
  summary_fields: null,
  avatar_url: null,
};

export const DEMO_USER = {
  id: "demo-user-id",
  email: "sarah.chen@demo.com",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: { full_name: "Dr. Sarah Chen" },
  created_at: new Date().toISOString(),
};
