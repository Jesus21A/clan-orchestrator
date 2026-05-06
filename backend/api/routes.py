from fastapi import APIRouter, HTTPException, Header
from api.schemas import (
    TaskSchema, TaskCreateSchema, TaskUpdateSchema,
    AnalyzeRequestSchema, AnalyzeResponseSchema,
    MetricsOnlyResponseSchema, MetricsSchema, BlockedTaskSchema,
    LoginSchema, LoginResponseSchema,
)
from services.orchestrator_service import OrchestratorService
from services.claude_service import ClaudeService
from services.task_store import TaskStore
from services import auth_service
from domain.models import Task, TaskStatus
from typing import List, Optional

router = APIRouter()
orchestrator = OrchestratorService()
store = TaskStore()


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _get_clan(authorization: str = Header(default="")) -> str:
    token = authorization.replace("Bearer ", "").strip()
    clan = auth_service.get_clan(token)
    if not clan:
        raise HTTPException(status_code=401, detail="No autenticado. Inicia sesión.")
    return clan


def _dict_to_task(d: dict) -> Task:
    from domain.models import ProgressSnapshot
    return Task(
        id=d["id"],
        title=d["title"],
        clan_owner=d["clan_owner"],
        status=TaskStatus(d.get("status", "Not Started")),
        is_qbr=d.get("is_qbr", False),
        priority=d.get("priority", 1),
        progress_pct=d.get("progress_pct", 0),
        dependency_id=d.get("dependency_id"),
        assignee=d.get("assignee"),
        due_date=d.get("due_date"),
        effort_estimated=d.get("effort_estimated"),
        effort_actual=d.get("effort_actual"),
        notes=d.get("notes"),
        qbr_period=d.get("qbr_period"),
        history=[
            ProgressSnapshot(date=h["date"], progress_pct=h["progress_pct"], status=h["status"])
            for h in d.get("history", [])
        ],
    )


def _map_metrics(metrics) -> MetricsSchema:
    return MetricsSchema(
        total_tasks=metrics.total_tasks,
        qbr_alignment_pct=metrics.qbr_alignment_pct,
        blocked_count=metrics.blocked_count,
        blocked_tasks=[
            BlockedTaskSchema(
                task_title=b.task_title, clan=b.clan,
                blocked_by_id=b.blocked_by_id, blocked_by_title=b.blocked_by_title,
                severity=b.severity,
            ) for b in metrics.blocked_tasks
        ],
    )


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=LoginResponseSchema)
def login(body: LoginSchema):
    token = auth_service.login(body.clan, body.password)
    if not token:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return LoginResponseSchema(token=token, clan=body.clan, is_admin=auth_service.is_admin(body.clan))


# ── Task CRUD ─────────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=List[TaskSchema])
def get_tasks(authorization: str = Header(default="")):
    _get_clan(authorization)
    return store.get_all()


@router.post("/tasks", response_model=TaskSchema, status_code=201)
def create_task(body: TaskCreateSchema, authorization: str = Header(default="")):
    clan = _get_clan(authorization)
    if not auth_service.is_admin(clan) and body.clan_owner != clan:
        raise HTTPException(status_code=403, detail=f"Solo puedes crear tareas para '{clan}'")
    return store.create(body.model_dump())


@router.put("/tasks/{task_id}", response_model=TaskSchema)
def update_task(task_id: str, body: TaskUpdateSchema, authorization: str = Header(default="")):
    clan = _get_clan(authorization)
    existing = store.get_by_id(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if not auth_service.is_admin(clan) and existing["clan_owner"] != clan:
        raise HTTPException(status_code=403, detail="No puedes editar tareas de otro clan")
    updated = store.update(task_id, {k: v for k, v in body.model_dump().items() if v is not None})
    return updated


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, authorization: str = Header(default="")):
    clan = _get_clan(authorization)
    existing = store.get_by_id(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if not auth_service.is_admin(clan) and existing["clan_owner"] != clan:
        raise HTTPException(status_code=403, detail="No puedes eliminar tareas de otro clan")
    store.delete(task_id)


@router.post("/tasks/import", status_code=200)
def import_tasks(tasks: List[TaskSchema], authorization: str = Header(default="")):
    clan = _get_clan(authorization)
    if not auth_service.is_admin(clan):
        raise HTTPException(status_code=403, detail="Solo el admin puede hacer importación masiva")
    store.replace_all([t.model_dump() for t in tasks])
    return {"imported": len(tasks)}


# ── Metrics & Analysis ────────────────────────────────────────────────────────

@router.get("/metrics", response_model=MetricsOnlyResponseSchema)
def get_metrics(authorization: str = Header(default=""), qbr_period: Optional[str] = None):
    _get_clan(authorization)
    all_tasks = [_dict_to_task(d) for d in store.get_all()]
    tasks = [t for t in all_tasks if not qbr_period or t.qbr_period == qbr_period or not t.qbr_period]
    return MetricsOnlyResponseSchema(metrics=_map_metrics(orchestrator.compute_metrics(tasks)))


@router.post("/analyze", response_model=AnalyzeResponseSchema)
async def analyze(body: AnalyzeRequestSchema, authorization: str = Header(default="")):
    _get_clan(authorization)
    try:
        claude = ClaudeService()
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=str(e))

    all_tasks = [_dict_to_task(d) for d in store.get_all()]
    tasks = all_tasks
    if body.qbr_period:
        tasks = [t for t in all_tasks if t.qbr_period == body.qbr_period or not t.qbr_period]
    if not tasks:
        raise HTTPException(status_code=400, detail="No hay tareas cargadas.")

    metrics = orchestrator.compute_metrics(tasks)
    prompt  = orchestrator.build_prompt(tasks, body.analysis_type.value, metrics)

    try:
        content = await claude.analyze(prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al contactar Claude API: {str(e)}")

    return AnalyzeResponseSchema(
        analysis_type=body.analysis_type.value,
        content=content,
        metrics=_map_metrics(metrics),
    )
