from dataclasses import dataclass, field
from typing import Optional, List
from enum import Enum


class TaskStatus(str, Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS  = "In Progress"
    BLOCKED      = "Blocked"
    COMPLETED    = "Completed"


class AnalysisType(str, Enum):
    QBR         = "qbr"
    BOTTLENECK  = "bottleneck"
    ACTION_PLAN = "plan"


@dataclass
class ProgressSnapshot:
    date: str
    progress_pct: int
    status: str


@dataclass
class Task:
    id: str
    title: str
    clan_owner: str
    status: TaskStatus
    is_qbr: bool = False
    priority: int = 1
    progress_pct: int = 0
    dependency_id: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    effort_estimated: Optional[float] = None
    effort_actual: Optional[float] = None
    notes: Optional[str] = None
    qbr_period: Optional[str] = None          # e.g. "Q2-2025"
    history: List[ProgressSnapshot] = field(default_factory=list)


@dataclass
class BlockedTask:
    task_title: str
    clan: str
    blocked_by_id: str
    blocked_by_title: str
    severity: str


@dataclass
class OrchestratorMetrics:
    total_tasks: int
    qbr_alignment_pct: float
    blocked_count: int
    blocked_tasks: List[BlockedTask] = field(default_factory=list)
