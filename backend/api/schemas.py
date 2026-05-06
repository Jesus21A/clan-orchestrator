from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TaskStatusSchema(str, Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS  = "In Progress"
    BLOCKED      = "Blocked"
    COMPLETED    = "Completed"


class LeaderStatusSchema(str, Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS  = "In Progress"
    COMPLETED    = "Completed"


class AnalysisTypeSchema(str, Enum):
    QBR         = "qbr"
    BOTTLENECK  = "bottleneck"
    ACTION_PLAN = "plan"


class ProgressSnapshotSchema(BaseModel):
    date: str
    progress_pct: int
    status: str


class TaskSchema(BaseModel):
    id: str
    title: str
    clan_owner: str
    status: TaskStatusSchema
    is_qbr: bool = False
    priority: int = Field(default=1, ge=1, le=5)
    progress_pct: int = Field(default=0, ge=0, le=100)
    dependency_id: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    effort_estimated: Optional[float] = None
    effort_actual: Optional[float] = None
    notes: Optional[str] = None
    qbr_period: Optional[str] = None
    history: List[ProgressSnapshotSchema] = Field(default_factory=list)


class TaskCreateSchema(BaseModel):
    title: str
    clan_owner: str
    status: LeaderStatusSchema = LeaderStatusSchema.NOT_STARTED
    is_qbr: bool = False
    priority: int = Field(default=1, ge=1, le=5)
    progress_pct: int = Field(default=0, ge=0, le=100)
    dependency_id: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    effort_estimated: Optional[float] = None
    effort_actual: Optional[float] = None
    notes: Optional[str] = None
    qbr_period: Optional[str] = None


class TaskUpdateSchema(BaseModel):
    title: Optional[str] = None
    clan_owner: Optional[str] = None
    status: Optional[LeaderStatusSchema] = None
    is_qbr: Optional[bool] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    progress_pct: Optional[int] = Field(default=None, ge=0, le=100)
    dependency_id: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    effort_estimated: Optional[float] = None
    effort_actual: Optional[float] = None
    notes: Optional[str] = None
    qbr_period: Optional[str] = None


class AnalyzeRequestSchema(BaseModel):
    analysis_type: AnalysisTypeSchema = AnalysisTypeSchema.QBR
    qbr_period: Optional[str] = None


class BlockedTaskSchema(BaseModel):
    task_title: str
    clan: str
    blocked_by_id: str
    blocked_by_title: str
    severity: str


class MetricsSchema(BaseModel):
    total_tasks: int
    qbr_alignment_pct: float
    blocked_count: int
    blocked_tasks: List[BlockedTaskSchema]


class AnalyzeResponseSchema(BaseModel):
    analysis_type: str
    content: str
    metrics: MetricsSchema


class MetricsOnlyResponseSchema(BaseModel):
    metrics: MetricsSchema


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginSchema(BaseModel):
    clan: str
    password: str


class LoginResponseSchema(BaseModel):
    token: str
    clan: str
    is_admin: bool
