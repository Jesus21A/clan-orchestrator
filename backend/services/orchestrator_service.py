from typing import List
from domain.models import Task, TaskStatus, BlockedTask, OrchestratorMetrics


class OrchestratorService:

    def _effective_status(self, task: Task, status_map: dict) -> str:
        """Deriva el estado real: si la dependencia no está Completed, es Blocked automáticamente."""
        if task.status == TaskStatus.COMPLETED:
            return "Completed"
        if task.dependency_id:
            dep = status_map.get(task.dependency_id)
            if dep and dep.status != TaskStatus.COMPLETED:
                return "Blocked"
        return task.status.value

    def compute_metrics(self, tasks: List[Task]) -> OrchestratorMetrics:
        status_map = {t.id: t for t in tasks}

        blocked_tasks = []
        for task in tasks:
            if task.dependency_id:
                dep = status_map.get(task.dependency_id)
                if dep and dep.status != TaskStatus.COMPLETED:
                    severity = "Critical" if task.priority == 5 else (
                        "High" if task.priority >= 3 else "Medium"
                    )
                    blocked_tasks.append(BlockedTask(
                        task_title=task.title,
                        clan=task.clan_owner,
                        blocked_by_id=task.dependency_id,
                        blocked_by_title=dep.title,
                        severity=severity,
                    ))

        qbr_tasks = [t for t in tasks if t.is_qbr]
        completed  = [t for t in qbr_tasks if t.status == TaskStatus.COMPLETED]
        alignment  = (len(completed) / len(qbr_tasks) * 100) if qbr_tasks else 0.0

        return OrchestratorMetrics(
            total_tasks=len(tasks),
            qbr_alignment_pct=round(alignment, 1),
            blocked_count=len(blocked_tasks),
            blocked_tasks=blocked_tasks,
        )

    def build_prompt(self, tasks: List[Task], analysis_type: str, metrics: OrchestratorMetrics) -> str:
        status_map = {t.id: t for t in tasks}

        tasks_context = []
        for t in tasks:
            eff_status = self._effective_status(t, status_map)
            dep_title = status_map[t.dependency_id].title if t.dependency_id and t.dependency_id in status_map else None
            tasks_context.append({
                "id": t.id,
                "title": t.title,
                "clan": t.clan_owner,
                "responsable": t.assignee or "Sin asignar",
                "estado": eff_status,
                "avance_pct": t.progress_pct,
                "es_qbr": t.is_qbr,
                "prioridad": t.priority,
                "fecha_limite": t.due_date or "Sin fecha",
                "esfuerzo_estimado_h": t.effort_estimated,
                "esfuerzo_real_h": t.effort_actual,
                "bloqueada_por": dep_title,
            })

        context = (
            f"TAREAS DEL SISTEMA ({len(tasks)} total):\n{tasks_context}\n\n"
            f"MÉTRICAS:\n"
            f"- Alineación QBR: {metrics.qbr_alignment_pct}%\n"
            f"- Tareas bloqueadas (auto-detectadas): {metrics.blocked_count}\n"
            f"- Bloqueos en cadena: {[{'tarea': b.task_title, 'clan': b.clan, 'bloqueada_por': b.blocked_by_title, 'severidad': b.severity} for b in metrics.blocked_tasks]}"
        )

        prompts = {
            "qbr": (
                f"{context}\n\n"
                "Responde SOLO con:\n"
                "1. **Estado QBR**\n"
                "Un párrafo ejecutivo sobre salud del trimestre. Menciona avance real (%) de tareas críticas y riesgo de cumplimiento.\n\n"
                "2. **Riesgo Principal**\n"
                "- Un bullet por cada riesgo crítico (máximo 3). Incluye clan responsable.\n\n"
                "3. **Próximo paso clave**\n"
                "Una sola acción prioritaria con clan responsable y plazo concreto."
            ),
            "bottleneck": (
                f"{context}\n\n"
                "Responde SOLO con:\n"
                "1. **Bloqueos Detectados**\n"
                "- Por cada bloqueo: **tarea bloqueada** (clan) → bloqueada por **dependencia** → impacto en QBR.\n"
                "- Si no hay bloqueos: 'Sin bloqueos críticos detectados.'\n\n"
                "2. **Impacto en Cascada**\n"
                "Explica en un párrafo cómo los bloqueos se propagan entre clanes y qué tareas QBR están en riesgo."
            ),
            "plan": (
                f"{context}\n\n"
                "Responde SOLO con:\n"
                "1. **Plan de Acción — 5 días**\n"
                "- Día 1-2: acción concreta (clan responsable, responsable si aplica)\n"
                "- Día 3-4: acción concreta (clan responsable)\n"
                "- Día 5: acción concreta (clan responsable)\n\n"
                "2. **Resultado esperado**\n"
                "Una frase con el estado del QBR si se ejecuta el plan correctamente."
            ),
        }
        return prompts.get(analysis_type, prompts["qbr"])
