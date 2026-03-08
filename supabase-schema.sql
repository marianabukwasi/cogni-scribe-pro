-- ============================================================
-- Kloer.ai — Complete Supabase Database Schema
-- Generated: 2026-03-08
-- Use this file to recreate the database in a new Supabase project.
-- ============================================================

-- ─── Enums ──────────────────────────────────────────────

CREATE TYPE public.account_tier AS ENUM (
  'starter', 'professional', 'white_label', 'ngo', 'enterprise'
);

CREATE TYPE public.client_case_status AS ENUM (
  'active', 'pending', 'in_process', 'approved', 'rejected', 'appeal', 'archived', 'closed'
);

CREATE TYPE public.profession_type AS ENUM (
  'medical_doctor', 'therapist', 'lawyer', 'financial_advisor',
  'hr_professional', 'ngo_caseworker', 'social_worker', 'refugee_support', 'other'
);

CREATE TYPE public.retention_decision AS ENUM (
  'summary_only', 'transcript_summary', 'keep_everything', 'ask_each_time'
);

CREATE TYPE public.session_status AS ENUM (
  'setup', 'consent_pending', 'active', 'paused', 'ended', 'archived'
);

-- ─── Tables ─────────────────────────────────────────────

-- Profiles (created automatically on user signup via trigger)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  email text,
  profession profession_type NOT NULL DEFAULT 'medical_doctor',
  profession_other text,
  specialty text,
  organisation text,
  country_of_practice text DEFAULT 'Luxembourg',
  registration_number text,
  preferred_language text DEFAULT 'en',
  ui_language text DEFAULT 'en',
  primary_session_language text DEFAULT 'en',
  document_output_language text DEFAULT 'en',
  prescription_country_format text DEFAULT 'luxembourg',
  referral_letter_language text DEFAULT 'en',
  alert_style text[] DEFAULT ARRAY['silent_flash'],
  alert_sensitivity text DEFAULT 'all',
  auto_purge_minutes integer DEFAULT 10,
  default_retention retention_decision DEFAULT 'ask_each_time',
  avatar_url text,
  account_tier account_tier DEFAULT 'starter',
  onboarding_completed boolean DEFAULT false,
  summary_fields jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  preferred_language text DEFAULT 'en',
  contact_email text,
  contact_phone text,
  case_reference text,
  notes text,
  gender text,
  blood_type text,
  allergies text[] DEFAULT '{}',
  current_medications text[] DEFAULT '{}',
  case_type text,
  jurisdiction text,
  opposing_party text,
  country_of_origin text,
  arrival_date date,
  case_status client_case_status DEFAULT 'active',
  languages_spoken text[] DEFAULT '{}',
  vulnerability_flags text[] DEFAULT '{}',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  client_name text,
  session_type text,
  session_language text DEFAULT 'en',
  document_output_language text DEFAULT 'en',
  special_notes text,
  status session_status DEFAULT 'setup',
  consent_given boolean,
  consent_timestamp timestamptz,
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds integer,
  transcript jsonb DEFAULT '[]',
  summary jsonb,
  points_to_note jsonb DEFAULT '[]',
  selected_items jsonb DEFAULT '[]',
  manual_notes text,
  retention_decision retention_decision,
  decision_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  session_id uuid REFERENCES public.sessions(id),
  title text NOT NULL,
  document_type text NOT NULL,
  content jsonb,
  format text,
  language text DEFAULT 'en',
  approved boolean DEFAULT false,
  approved_at timestamptz,
  audit_trail jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Intake Templates
CREATE TABLE public.intake_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  name text NOT NULL,
  questions jsonb DEFAULT '[]',
  use_case text,
  language text DEFAULT 'en',
  is_prebuilt boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Intake Responses
CREATE TABLE public.intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.intake_templates(id),
  professional_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  access_token text DEFAULT gen_random_uuid()::text,
  responses jsonb DEFAULT '{}',
  completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Knowledge Base Items
CREATE TABLE public.knowledge_base_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  content text,
  file_url text,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'ready',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Functions ──────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Get professional info (used in edge functions)
CREATE OR REPLACE FUNCTION public.get_professional_info(p_user_id uuid)
RETURNS TABLE(full_name text, organisation text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT full_name, organisation FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
$$;

-- ─── Triggers ───────────────────────────────────────────

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Row Level Security ─────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_items ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Clients
CREATE POLICY "Professionals see own clients" ON public.clients FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own clients" ON public.clients FOR UPDATE USING (auth.uid() = professional_id);
CREATE POLICY "Professionals delete own clients" ON public.clients FOR DELETE USING (auth.uid() = professional_id);

-- Sessions
CREATE POLICY "Professionals see own sessions" ON public.sessions FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = professional_id);
CREATE POLICY "Professionals delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = professional_id);

-- Documents
CREATE POLICY "Professionals see own documents" ON public.documents FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own documents" ON public.documents FOR UPDATE USING (auth.uid() = professional_id);

-- Intake Templates
CREATE POLICY "Professionals see own templates" ON public.intake_templates FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Public can read intake templates" ON public.intake_templates FOR SELECT USING (true);
CREATE POLICY "Professionals insert own templates" ON public.intake_templates FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own templates" ON public.intake_templates FOR UPDATE USING (auth.uid() = professional_id);
CREATE POLICY "Professionals delete own templates" ON public.intake_templates FOR DELETE USING (auth.uid() = professional_id);

-- Intake Responses
CREATE POLICY "Professionals see own responses" ON public.intake_responses FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Public can read intake response by token" ON public.intake_responses FOR SELECT USING (true);
CREATE POLICY "Professionals insert own responses" ON public.intake_responses FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Public can submit intake response by token" ON public.intake_responses FOR UPDATE USING (completed = false) WITH CHECK (completed = true);

-- Knowledge Base Items
CREATE POLICY "Professionals see own kb items" ON public.knowledge_base_items FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Professionals insert own kb items" ON public.knowledge_base_items FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Professionals update own kb items" ON public.knowledge_base_items FOR UPDATE USING (auth.uid() = professional_id);
CREATE POLICY "Professionals delete own kb items" ON public.knowledge_base_items FOR DELETE USING (auth.uid() = professional_id);
