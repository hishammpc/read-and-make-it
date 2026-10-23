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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      annual_evaluation_cycles: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          start_date: string
          status: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "annual_evaluation_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_evaluations: {
        Row: {
          created_at: string | null
          cycle_id: string
          id: string
          staff_answers: Json | null
          staff_submitted_at: string | null
          status: string | null
          supervisor_answers: Json | null
          supervisor_id: string | null
          supervisor_submitted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id: string
          id?: string
          staff_answers?: Json | null
          staff_submitted_at?: string | null
          status?: string | null
          supervisor_answers?: Json | null
          supervisor_id?: string | null
          supervisor_submitted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string
          id?: string
          staff_answers?: Json | null
          staff_submitted_at?: string | null
          status?: string | null
          supervisor_answers?: Json | null
          supervisor_id?: string | null
          supervisor_submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_evaluations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "annual_evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_evaluations_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_uploads: {
        Row: {
          created_at: string | null
          errors: Json | null
          failed_count: number
          file_name: string
          id: string
          status: string | null
          success_count: number
          total_rows: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          errors?: Json | null
          failed_count: number
          file_name: string
          id?: string
          status?: string | null
          success_count: number
          total_rows: number
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          errors?: Json | null
          failed_count?: number
          file_name?: string
          id?: string
          status?: string | null
          success_count?: number
          total_rows?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          created_at: string | null
          file_url: string
          id: string
          issued_at: string | null
          program_id: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_url: string
          id?: string
          issued_at?: string | null
          program_id: string
          uploaded_by: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_url?: string
          id?: string
          issued_at?: string | null
          program_id?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_templates: {
        Row: {
          created_at: string | null
          id: string
          program_id: string | null
          questions: Json
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          questions?: Json
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          questions?: Json
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          answers: Json
          id: string
          program_id: string
          submitted_at: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          program_id: string
          submitted_at?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          id?: string
          program_id?: string
          submitted_at?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          grade: string | null
          id: string
          name: string
          position: string | null
          status: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          grade?: string | null
          id: string
          name: string
          position?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          grade?: string | null
          id?: string
          name?: string
          position?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_assignments: {
        Row: {
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          certificate_id: string | null
          created_at: string | null
          id: string
          program_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          certificate_id?: string | null
          created_at?: string | null
          id?: string
          program_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          certificate_id?: string | null
          created_at?: string | null
          id?: string
          program_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_assignments_attendance_marked_by_fkey"
            columns: ["attendance_marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          end_date_time: string
          hours: number
          id: string
          location: string | null
          notify_for_evaluation: boolean | null
          organizer: string | null
          start_date_time: string
          status: string | null
          title: string
          trainer: string | null
          training_type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          end_date_time: string
          hours?: number
          id?: string
          location?: string | null
          notify_for_evaluation?: boolean | null
          organizer?: string | null
          start_date_time: string
          status?: string | null
          title: string
          trainer?: string | null
          training_type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          end_date_time?: string
          hours?: number
          id?: string
          location?: string | null
          notify_for_evaluation?: boolean | null
          organizer?: string | null
          start_date_time?: string
          status?: string | null
          title?: string
          trainer?: string | null
          training_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposed_trainings: {
        Row: {
          created_at: string | null
          entertained_at: string | null
          entertained_by: string | null
          entertained_proposal: number | null
          id: string
          is_entertained: boolean | null
          notes: string | null
          proposal_1: string | null
          proposal_1_entertained: boolean | null
          proposal_2: string | null
          proposal_2_entertained: boolean | null
          training_details: string | null
          training_title: string | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          entertained_at?: string | null
          entertained_by?: string | null
          entertained_proposal?: number | null
          id?: string
          is_entertained?: boolean | null
          notes?: string | null
          proposal_1?: string | null
          proposal_1_entertained?: boolean | null
          proposal_2?: string | null
          proposal_2_entertained?: boolean | null
          training_details?: string | null
          training_title?: string | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          entertained_at?: string | null
          entertained_by?: string | null
          entertained_proposal?: number | null
          id?: string
          is_entertained?: boolean | null
          notes?: string | null
          proposal_1?: string | null
          proposal_1_entertained?: boolean | null
          proposal_2?: string | null
          proposal_2_entertained?: boolean | null
          training_details?: string | null
          training_title?: string | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposed_trainings_entertained_by_fkey"
            columns: ["entertained_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposed_trainings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders_log: {
        Row: {
          id: string
          program_id: string
          sent_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          program_id: string
          sent_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          id?: string
          program_id?: string
          sent_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_log_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "employee"],
    },
  },
} as const
