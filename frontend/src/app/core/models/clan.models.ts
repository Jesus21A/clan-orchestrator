export type TaskStatus   = 'Not Started' | 'In Progress' | 'Blocked' | 'Completed';
export type LeaderStatus = 'Not Started' | 'In Progress' | 'Completed';
export type AnalysisType = 'qbr' | 'bottleneck' | 'plan';

export interface ProgressSnapshot {
  date: string;
  progress_pct: number;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  clan_owner: string;
  status: TaskStatus;
  is_qbr: boolean;
  priority: number;
  progress_pct: number;
  dependency_id?: string | null;
  assignee?: string | null;
  due_date?: string | null;
  effort_estimated?: number | null;
  effort_actual?: number | null;
  notes?: string | null;
  qbr_period?: string | null;
  history?: ProgressSnapshot[];
}

export interface TaskCreate {
  title: string;
  clan_owner: string;
  status: LeaderStatus;
  is_qbr: boolean;
  priority: number;
  progress_pct: number;
  dependency_id?: string | null;
  assignee?: string | null;
  due_date?: string | null;
  effort_estimated?: number | null;
  effort_actual?: number | null;
  notes?: string | null;
  qbr_period?: string | null;
}

export interface TaskUpdate extends Partial<TaskCreate> {}

export interface BlockedTask {
  task_title: string;
  clan: string;
  blocked_by_id: string;
  blocked_by_title: string;
  severity: 'Critical' | 'High' | 'Medium';
}

export interface OrchestratorMetrics {
  total_tasks: number;
  qbr_alignment_pct: number;
  blocked_count: number;
  blocked_tasks: BlockedTask[];
}

export interface AnalyzeRequest {
  analysis_type: AnalysisType;
  qbr_period?: string | null;
}

export interface AnalyzeResponse {
  analysis_type: AnalysisType;
  content: string;
  metrics: OrchestratorMetrics;
}

export const CLANS = [
  'Microfinanzas',
  'Productos y Otras Carteras',
  'Remesas',
  'Administrativo + Riesgo Legal',
  'Innovaciones Canales y Datos',
  'PETI',
] as const;

export const QBR_PERIODS = ['Q1-2025', 'Q2-2025', 'Q3-2025', 'Q4-2025', 'Q1-2026'] as const;
