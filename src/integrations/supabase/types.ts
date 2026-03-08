export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          allergies: string[] | null
          arrival_date: string | null
          avatar_url: string | null
          blood_type: string | null
          case_reference: string | null
          case_status: Database["public"]["Enums"]["client_case_status"] | null
          case_type: string | null
          contact_email: string | null
          contact_phone: string | null
          country_of_origin: string | null
          created_at: string
          current_medications: string[] | null
          date_of_birth: string | null
          first_name: string
          gender: string | null
          id: string
          jurisdiction: string | null
          languages_spoken: string[] | null
          last_name: string
          notes: string | null
          opposing_party: string | null
          preferred_language: string | null
          professional_id: string
          updated_at: string
          vulnerability_flags: string[] | null
        }
        Insert: {
          allergies?: string[] | null
          arrival_date?: string | null
          avatar_url?: string | null
          blood_type?: string | null
          case_reference?: string | null
          case_status?: Database["public"]["Enums"]["client_case_status"] | null
          case_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_of_origin?: string | null
          created_at?: string
          current_medications?: string[] | null
          date_of_birth?: string | null
          first_name: string
          gender?: string | null
          id?: string
          jurisdiction?: string | null
          languages_spoken?: string[] | null
          last_name: string
          notes?: string | null
          opposing_party?: string | null
          preferred_language?: string | null
          professional_id: string
          updated_at?: string
          vulnerability_flags?: string[] | null
        }
        Update: {
          allergies?: string[] | null
          arrival_date?: string | null
          avatar_url?: string | null
          blood_type?: string | null
          case_reference?: string | null
          case_status?: Database["public"]["Enums"]["client_case_status"] | null
          case_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_of_origin?: string | null
          created_at?: string
          current_medications?: string[] | null
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          jurisdiction?: string | null
          languages_spoken?: string[] | null
          last_name?: string
          notes?: string | null
          opposing_party?: string | null
          preferred_language?: string | null
          professional_id?: string
          updated_at?: string
          vulnerability_flags?: string[] | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          audit_trail: Json | null
          client_id: string | null
          content: Json | null
          created_at: string
          document_type: string
          format: string | null
          id: string
          language: string | null
          professional_id: string
          session_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          audit_trail?: Json | null
          client_id?: string | null
          content?: Json | null
          created_at?: string
          document_type: string
          format?: string | null
          id?: string
          language?: string | null
          professional_id: string
          session_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          audit_trail?: Json | null
          client_id?: string | null
          content?: Json | null
          created_at?: string
          document_type?: string
          format?: string | null
          id?: string
          language?: string | null
          professional_id?: string
          session_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_responses: {
        Row: {
          access_token: string | null
          client_id: string | null
          completed: boolean | null
          created_at: string
          id: string
          professional_id: string
          responses: Json | null
          template_id: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          completed?: boolean | null
          created_at?: string
          id?: string
          professional_id: string
          responses?: Json | null
          template_id: string
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          completed?: boolean | null
          created_at?: string
          id?: string
          professional_id?: string
          responses?: Json | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "intake_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_templates: {
        Row: {
          created_at: string
          id: string
          is_prebuilt: boolean | null
          language: string | null
          last_used_at: string | null
          name: string
          professional_id: string
          questions: Json | null
          updated_at: string
          use_case: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_prebuilt?: boolean | null
          language?: string | null
          last_used_at?: string | null
          name: string
          professional_id: string
          questions?: Json | null
          updated_at?: string
          use_case?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_prebuilt?: boolean | null
          language?: string | null
          last_used_at?: string | null
          name?: string
          professional_id?: string
          questions?: Json | null
          updated_at?: string
          use_case?: string | null
        }
        Relationships: []
      }
      knowledge_base_items: {
        Row: {
          category: string
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          metadata: Json | null
          professional_id: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          professional_id: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          professional_id?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_tier: Database["public"]["Enums"]["account_tier"] | null
          alert_sensitivity: string | null
          alert_style: string[] | null
          auto_purge_minutes: number | null
          avatar_url: string | null
          country_of_practice: string | null
          created_at: string
          default_retention:
            | Database["public"]["Enums"]["retention_decision"]
            | null
          document_output_language: string | null
          email: string | null
          full_name: string
          id: string
          onboarding_completed: boolean | null
          organisation: string | null
          preferred_language: string | null
          prescription_country_format: string | null
          primary_session_language: string | null
          profession: Database["public"]["Enums"]["profession_type"]
          profession_other: string | null
          referral_letter_language: string | null
          registration_number: string | null
          specialty: string | null
          summary_fields: Json | null
          ui_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_tier?: Database["public"]["Enums"]["account_tier"] | null
          alert_sensitivity?: string | null
          alert_style?: string[] | null
          auto_purge_minutes?: number | null
          avatar_url?: string | null
          country_of_practice?: string | null
          created_at?: string
          default_retention?:
            | Database["public"]["Enums"]["retention_decision"]
            | null
          document_output_language?: string | null
          email?: string | null
          full_name?: string
          id?: string
          onboarding_completed?: boolean | null
          organisation?: string | null
          preferred_language?: string | null
          prescription_country_format?: string | null
          primary_session_language?: string | null
          profession?: Database["public"]["Enums"]["profession_type"]
          profession_other?: string | null
          referral_letter_language?: string | null
          registration_number?: string | null
          specialty?: string | null
          summary_fields?: Json | null
          ui_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_tier?: Database["public"]["Enums"]["account_tier"] | null
          alert_sensitivity?: string | null
          alert_style?: string[] | null
          auto_purge_minutes?: number | null
          avatar_url?: string | null
          country_of_practice?: string | null
          created_at?: string
          default_retention?:
            | Database["public"]["Enums"]["retention_decision"]
            | null
          document_output_language?: string | null
          email?: string | null
          full_name?: string
          id?: string
          onboarding_completed?: boolean | null
          organisation?: string | null
          preferred_language?: string | null
          prescription_country_format?: string | null
          primary_session_language?: string | null
          profession?: Database["public"]["Enums"]["profession_type"]
          profession_other?: string | null
          referral_letter_language?: string | null
          registration_number?: string | null
          specialty?: string | null
          summary_fields?: Json | null
          ui_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          client_id: string | null
          client_name: string | null
          consent_given: boolean | null
          consent_timestamp: string | null
          created_at: string
          decision_timestamp: string | null
          document_output_language: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          manual_notes: string | null
          points_to_note: Json | null
          professional_id: string
          retention_decision:
            | Database["public"]["Enums"]["retention_decision"]
            | null
          selected_items: Json | null
          session_language: string | null
          session_type: string | null
          special_notes: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          summary: Json | null
          transcript: Json | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          consent_given?: boolean | null
          consent_timestamp?: string | null
          created_at?: string
          decision_timestamp?: string | null
          document_output_language?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          manual_notes?: string | null
          points_to_note?: Json | null
          professional_id: string
          retention_decision?:
            | Database["public"]["Enums"]["retention_decision"]
            | null
          selected_items?: Json | null
          session_language?: string | null
          session_type?: string | null
          special_notes?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          summary?: Json | null
          transcript?: Json | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          consent_given?: boolean | null
          consent_timestamp?: string | null
          created_at?: string
          decision_timestamp?: string | null
          document_output_language?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          manual_notes?: string | null
          points_to_note?: Json | null
          professional_id?: string
          retention_decision?:
            | Database["public"]["Enums"]["retention_decision"]
            | null
          selected_items?: Json | null
          session_language?: string | null
          session_type?: string | null
          special_notes?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          summary?: Json | null
          transcript?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_professional_info: {
        Args: { p_user_id: string }
        Returns: {
          full_name: string
          organisation: string
        }[]
      }
    }
    Enums: {
      account_tier:
        | "starter"
        | "professional"
        | "white_label"
        | "ngo"
        | "enterprise"
      client_case_status:
        | "active"
        | "pending"
        | "in_process"
        | "approved"
        | "rejected"
        | "appeal"
        | "archived"
        | "closed"
      profession_type:
        | "medical_doctor"
        | "therapist"
        | "lawyer"
        | "financial_advisor"
        | "hr_professional"
        | "ngo_caseworker"
        | "social_worker"
        | "refugee_support"
        | "other"
      retention_decision:
        | "summary_only"
        | "transcript_summary"
        | "keep_everything"
        | "ask_each_time"
      session_status:
        | "setup"
        | "consent_pending"
        | "active"
        | "paused"
        | "ended"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_tier: [
        "starter",
        "professional",
        "white_label",
        "ngo",
        "enterprise",
      ],
      client_case_status: [
        "active",
        "pending",
        "in_process",
        "approved",
        "rejected",
        "appeal",
        "archived",
        "closed",
      ],
      profession_type: [
        "medical_doctor",
        "therapist",
        "lawyer",
        "financial_advisor",
        "hr_professional",
        "ngo_caseworker",
        "social_worker",
        "refugee_support",
        "other",
      ],
      retention_decision: [
        "summary_only",
        "transcript_summary",
        "keep_everything",
        "ask_each_time",
      ],
      session_status: [
        "setup",
        "consent_pending",
        "active",
        "paused",
        "ended",
        "archived",
      ],
    },
  },
} as const
