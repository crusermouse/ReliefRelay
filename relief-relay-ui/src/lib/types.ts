export type TriageLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED";
export type MedicalUrgency = "none" | "low" | "medium" | "high" | "critical";

export interface IntakeRecord {
  name?: string;
  age?: number;
  gender?: string;
  location_found?: string;
  presenting_issues: string[];
  medical_urgency: MedicalUrgency;
  shelter_needed: boolean;
  food_needed: boolean;
  water_needed: boolean;
  medication_needed?: string;
  family_members: number;
  special_needs?: string;
  language_preference: string;
  missing_information: string[];
  extraction_confidence: "low" | "medium" | "high";
  raw_transcription?: string;
}

export interface EvidenceChunk {
  content: string;
  source: string;
}

export interface WorkflowEvent {
  stage: string;
  status: string;
}

export interface IntakeResponse {
  intake_record: IntakeRecord;
  case_id: string;
  action_plan: string;
  resources: Record<string, unknown>;
  evidence: EvidenceChunk[];
  tools_used: string[];
  workflow_events?: WorkflowEvent[];
  operational_mode?: "full" | "degraded";
}

export interface Case {
  case_id: string;
  triage_level: TriageLevel;
  intake_data: IntakeRecord;
  action_plan?: string;
  created_at: string;
  updated_at: string;
}

export interface CasesResponse {
  cases: Case[];
  total: number;
}

export interface ServiceHealth {
  backend: string;
  vector_store: string;
  ollama: string;
  mode: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  services: ServiceHealth;
}
