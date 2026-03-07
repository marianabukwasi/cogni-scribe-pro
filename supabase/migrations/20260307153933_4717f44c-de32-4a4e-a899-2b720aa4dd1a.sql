
-- Create enums
CREATE TYPE public.account_tier AS ENUM ('starter', 'professional', 'white_label', 'ngo', 'enterprise');
CREATE TYPE public.profession_type AS ENUM ('medical_doctor', 'therapist', 'lawyer', 'financial_advisor', 'hr_professional', 'ngo_caseworker', 'social_worker', 'refugee_support', 'other');
CREATE TYPE public.retention_decision AS ENUM ('summary_only', 'transcript_summary', 'keep_everything', 'ask_each_time');
CREATE TYPE public.session_status AS ENUM ('setup', 'consent_pending', 'active', 'paused', 'ended', 'archived');
CREATE TYPE public.client_case_status AS ENUM ('active', 'pending', 'in_process', 'approved', 'rejected', 'appeal', 'archived', 'closed');

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  profession public.profession_type NOT NULL DEFAULT 'medical_doctor',
  profession_other TEXT,
  specialty TEXT,
  organisation TEXT,
  country_of_practice TEXT DEFAULT 'Luxembourg',
  registration_number TEXT,
  preferred_language TEXT DEFAULT 'en',
  ui_language TEXT DEFAULT 'en',
  primary_session_language TEXT DEFAULT 'en',
  document_output_language TEXT DEFAULT 'en',
  prescription_country_format TEXT DEFAULT 'luxembourg',
  referral_letter_language TEXT DEFAULT 'en',
  alert_style TEXT[] DEFAULT ARRAY['silent_flash'],
  alert_sensitivity TEXT DEFAULT 'all',
  default_retention public.retention_decision DEFAULT 'ask_each_time',
  auto_purge_minutes INTEGER DEFAULT 10,
  account_tier public.account_tier DEFAULT 'starter',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  summary_fields JSONB,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  preferred_language TEXT DEFAULT 'en',
  contact_email TEXT,
  contact_phone TEXT,
  case_reference TEXT,
  notes TEXT,
  case_status public.client_case_status DEFAULT 'active',
  gender TEXT,
  blood_type TEXT,
  allergies TEXT[] DEFAULT '{}',
  current_medications TEXT[] DEFAULT '{}',
  case_type TEXT,
  jurisdiction TEXT,
  opposing_party TEXT,
  country_of_origin TEXT,
  arrival_date DATE,
  languages_spoken TEXT[] DEFAULT '{}',
  vulnerability_flags TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals see own clients" ON public.clients FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own clients" ON public.clients FOR UPDATE USING (auth.uid() = professional_id);
CREATE POLICY "Professionals delete own clients" ON public.clients FOR DELETE USING (auth.uid() = professional_id);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  session_type TEXT,
  session_language TEXT DEFAULT 'en',
  document_output_language TEXT DEFAULT 'en',
  status public.session_status DEFAULT 'setup',
  consent_given BOOLEAN,
  consent_timestamp TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  transcript JSONB DEFAULT '[]',
  manual_notes TEXT,
  selected_items JSONB DEFAULT '[]',
  summary JSONB,
  points_to_note JSONB DEFAULT '[]',
  retention_decision public.retention_decision,
  decision_timestamp TIMESTAMPTZ,
  special_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals see own sessions" ON public.sessions FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = professional_id);
CREATE POLICY "Professionals delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = professional_id);

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB,
  language TEXT DEFAULT 'en',
  format TEXT,
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  audit_trail JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals see own documents" ON public.documents FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own documents" ON public.documents FOR UPDATE USING (auth.uid() = professional_id);

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Intake templates table
CREATE TABLE public.intake_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  use_case TEXT,
  language TEXT DEFAULT 'en',
  questions JSONB DEFAULT '[]',
  is_prebuilt BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals see own templates" ON public.intake_templates FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own templates" ON public.intake_templates FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own templates" ON public.intake_templates FOR UPDATE USING (auth.uid() = professional_id);
CREATE POLICY "Professionals delete own templates" ON public.intake_templates FOR DELETE USING (auth.uid() = professional_id);

-- Intake responses table
CREATE TABLE public.intake_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.intake_templates(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  access_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals see own responses" ON public.intake_responses FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own responses" ON public.intake_responses FOR INSERT WITH CHECK (auth.uid() = professional_id);

-- Knowledge base items
CREATE TABLE public.knowledge_base_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'ready',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals see own kb items" ON public.knowledge_base_items FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own kb items" ON public.knowledge_base_items FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own kb items" ON public.knowledge_base_items FOR UPDATE USING (auth.uid() = professional_id);
CREATE POLICY "Professionals delete own kb items" ON public.knowledge_base_items FOR DELETE USING (auth.uid() = professional_id);

CREATE TRIGGER update_kb_items_updated_at BEFORE UPDATE ON public.knowledge_base_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
