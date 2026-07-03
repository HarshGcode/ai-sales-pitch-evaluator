export type Role = "admin" | "manager" | "sales_exec";

export type AIProvider = "groq" | "openai" | "anthropic" | "gemini";

export interface AISettings {
  provider: AIProvider | null;
  has_key: boolean;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface UserCreateResponse {
  user: User;
  initial_password: string;
}

export type ScriptStatus = "processing" | "ready" | "failed";

export interface ObjectionHandlingItem {
  objection: string;
  suggested_response: string;
}

export interface ScriptStructured {
  mandatory_points: string[];
  optional_points: string[];
  compliance_statements: string[];
  objection_handling: ObjectionHandlingItem[];
  closing: string[];
}

export interface ScriptSection {
  id: string;
  script_id: string;
  section_type:
    | "mandatory_point"
    | "optional_point"
    | "compliance_statement"
    | "objection_handling"
    | "closing";
  content: string;
  order_index: number;
}

export interface Script {
  id: string;
  organization_id: string;
  uploaded_by: string;
  title: string;
  original_filename: string;
  status: ScriptStatus;
  raw_text: string | null;
  structured_json: ScriptStructured | null;
  error_message: string | null;
  created_at: string;
}

export type EvaluationStatus =
  | "pending"
  | "transcribing"
  | "evaluating"
  | "completed"
  | "failed";

export interface EvaluationScores {
  tone: number;
  confidence: number;
  empathy: number;
  clarity: number;
  compliance: number;
  closing_quality: number;
  filler_word_count: number;
  // Null for evaluations created before these Gong-style metrics were added.
  talk_to_listen_ratio: number | null;
  interactivity_score: number | null;
  question_count: number | null;
  speaking_pace_wpm: number | null;
}

export interface Feedback {
  id: string;
  evaluation_id: string;
  script_adherence_pct: number;
  scores_json: EvaluationScores;
  missing_mandatory_points: string[];
  strengths: string[];
  weaknesses: string[];
  improvement_tips: string[];
}

export interface Evaluation {
  id: string;
  organization_id: string;
  script_id: string;
  script_title: string;
  sales_exec_id: string;
  sales_exec_name: string;
  status: EvaluationStatus;
  transcript_text: string | null;
  transcript_language: string | null;
  overall_score: number | null;
  error_message: string | null;
  mock_mode: boolean;
  created_at: string;
  completed_at: string | null;
  feedback: Feedback | null;
}

export interface DashboardStats {
  total_evaluations: number;
  average_score: number | null;
  best_performer: { name: string; score: number } | null;
  weakest_performer: { name: string; score: number } | null;
  script_compliance_rate: number | null;
  monthly_trend: { month: string; average_score: number }[];
  recent_evaluations: Evaluation[];
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  department: string | null;
  evaluation_count: number;
  average_score: number;
}
