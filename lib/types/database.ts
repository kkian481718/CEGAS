/**
 * Supabase 資料庫類型定義
 * 此檔案定義了資料庫表格的 TypeScript 類型
 * 可透過 `npx supabase gen types typescript` 自動生成更新
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role: "admin" | "ta";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          role?: "admin" | "ta";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          role?: "admin" | "ta";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          title: string;
          type: "exam" | "homework";
          semester: string;
          due_date: string | null;
          total_questions: number;
          points_per_question: number;
          created_by: string | null;
          status: "active" | "archived";
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: "exam" | "homework";
          semester: string;
          due_date?: string | null;
          total_questions?: number;
          points_per_question?: number;
          created_by?: string | null;
          status?: "active" | "archived";
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: "exam" | "homework";
          semester?: string;
          due_date?: string | null;
          total_questions?: number;
          points_per_question?: number;
          created_by?: string | null;
          status?: "active" | "archived";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          student_name: string;
          class_name: string | null;
          file_path: string;
          original_filename: string | null;
          assigned_to: string | null;
          status: "pending" | "analyzing" | "analyzed" | "graded";
          parse_completeness: number | null;
          unmatched_content: string | null;
          parse_warnings: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          student_name: string;
          class_name?: string | null;
          file_path: string;
          original_filename?: string | null;
          assigned_to?: string | null;
          status?: "pending" | "analyzing" | "analyzed" | "graded";
          parse_completeness?: number | null;
          unmatched_content?: string | null;
          parse_warnings?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          student_name?: string;
          class_name?: string | null;
          file_path?: string;
          original_filename?: string | null;
          assigned_to?: string | null;
          status?: "pending" | "analyzing" | "analyzed" | "graded";
          parse_completeness?: number | null;
          unmatched_content?: string | null;
          parse_warnings?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      code_snippets: {
        Row: {
          id: string;
          submission_id: string;
          question_number: number;
          raw_code: string | null;
          normalized_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          question_number: number;
          raw_code?: string | null;
          normalized_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          question_number?: number;
          raw_code?: string | null;
          normalized_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "code_snippets_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          }
        ];
      };
      analysis_results: {
        Row: {
          id: string;
          snippet_id: string;
          error_type: string | null;
          error_id: string | null;
          message: string | null;
          line_number: number | null;
          severity:
            | "error"
            | "warning"
            | "style"
            | "performance"
            | "portability"
            | "information"
            | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          snippet_id: string;
          error_type?: string | null;
          error_id?: string | null;
          message?: string | null;
          line_number?: number | null;
          severity?:
            | "error"
            | "warning"
            | "style"
            | "performance"
            | "portability"
            | "information"
            | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          snippet_id?: string;
          error_type?: string | null;
          error_id?: string | null;
          message?: string | null;
          line_number?: number | null;
          severity?:
            | "error"
            | "warning"
            | "style"
            | "performance"
            | "portability"
            | "information"
            | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_results_snippet_id_fkey";
            columns: ["snippet_id"];
            isOneToOne: false;
            referencedRelation: "code_snippets";
            referencedColumns: ["id"];
          }
        ];
      };
      grades: {
        Row: {
          id: string;
          submission_id: string;
          question_number: number;
          score: number | null;
          max_score: number;
          comment: string | null;
          annotations: Json | null;
          graded_by: string | null;
          graded_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          question_number: number;
          score?: number | null;
          max_score?: number;
          comment?: string | null;
          annotations?: Json | null;
          graded_by?: string | null;
          graded_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          question_number?: number;
          score?: number | null;
          max_score?: number;
          comment?: string | null;
          annotations?: Json | null;
          graded_by?: string | null;
          graded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grades_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_graded_by_fkey";
            columns: ["graded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

// 方便使用的類型別名
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type AssignmentInsert =
  Database["public"]["Tables"]["assignments"]["Insert"];
export type AssignmentUpdate =
  Database["public"]["Tables"]["assignments"]["Update"];

export type Submission = Database["public"]["Tables"]["submissions"]["Row"];
export type SubmissionInsert =
  Database["public"]["Tables"]["submissions"]["Insert"];
export type SubmissionUpdate =
  Database["public"]["Tables"]["submissions"]["Update"];

export type CodeSnippet = Database["public"]["Tables"]["code_snippets"]["Row"];
export type CodeSnippetInsert =
  Database["public"]["Tables"]["code_snippets"]["Insert"];
export type CodeSnippetUpdate =
  Database["public"]["Tables"]["code_snippets"]["Update"];

export type AnalysisResult =
  Database["public"]["Tables"]["analysis_results"]["Row"];
export type AnalysisResultInsert =
  Database["public"]["Tables"]["analysis_results"]["Insert"];
export type AnalysisResultUpdate =
  Database["public"]["Tables"]["analysis_results"]["Update"];

export type Grade = Database["public"]["Tables"]["grades"]["Row"];
export type GradeInsert = Database["public"]["Tables"]["grades"]["Insert"];
export type GradeUpdate = Database["public"]["Tables"]["grades"]["Update"];

// 使用者角色類型
export type UserRole = "admin" | "ta";

// Submission 狀態類型
export type SubmissionStatus = "pending" | "analyzing" | "analyzed" | "graded";

// Assignment 類型
export type AssignmentType = "exam" | "homework";

// Assignment 狀態
export type AssignmentStatus = "active" | "archived";

// 錯誤嚴重程度
export type ErrorSeverity =
  | "error"
  | "warning"
  | "style"
  | "performance"
  | "portability"
  | "information";

// 解析警告結構
export interface ParseWarnings {
  missing_questions?: number[];
  low_confidence_questions?: number[];
  unmatched_char_count?: number;
}

// 畫記資料結構
export interface AnnotationData {
  version: string;
  objects: unknown[];
}
