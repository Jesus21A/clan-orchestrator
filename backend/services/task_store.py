import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Optional

DATA_FILE = Path(__file__).parent.parent / "data" / "tasks.json"

CLAN_PREFIXES = {
    "Microfinanzas": "MF",
    "Productos y Otras Carteras": "PROD",
    "Remesas": "REM",
    "Administrativo + Riesgo Legal": "ADM",
    "Innovaciones Canales y Datos": "INN",
    "PETI": "PETI",
}


class TaskStore:

    def _load(self) -> List[dict]:
        if not DATA_FILE.exists():
            return []
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save(self, tasks: List[dict]) -> None:
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2, default=str)

    def _generate_id(self, clan_owner: str, existing: List[dict]) -> str:
        prefix = CLAN_PREFIXES.get(clan_owner, "TASK")
        existing_ids = {t["id"] for t in existing}
        for n in range(1, 9999):
            candidate = f"{prefix}_{n:03d}"
            if candidate not in existing_ids:
                return candidate
        return f"{prefix}_{uuid.uuid4().hex[:4].upper()}"

    def _snapshot(self, task: dict, new_data: dict) -> list:
        """Adds a history entry if progress or status changed."""
        today = datetime.now().strftime("%Y-%m-%d")
        new_progress = new_data.get("progress_pct", task.get("progress_pct", 0))
        new_status   = new_data.get("status", task.get("status", "Not Started"))

        if (new_progress == task.get("progress_pct") and
                new_status == task.get("status")):
            return task.get("history", [])

        history = list(task.get("history", []))
        if history and history[-1]["date"] == today:
            history[-1]["progress_pct"] = new_progress
            history[-1]["status"]       = new_status
        else:
            history.append({"date": today, "progress_pct": new_progress, "status": new_status})
        return history

    def get_all(self) -> List[dict]:
        return self._load()

    def get_by_id(self, task_id: str) -> Optional[dict]:
        return next((t for t in self._load() if t["id"] == task_id), None)

    def create(self, data: dict) -> dict:
        tasks = self._load()
        today = datetime.now().strftime("%Y-%m-%d")
        task = {
            "id": self._generate_id(data.get("clan_owner", "TASK"), tasks),
            "title": data["title"],
            "clan_owner": data["clan_owner"],
            "assignee": data.get("assignee"),
            "status": data.get("status", "Not Started"),
            "progress_pct": data.get("progress_pct", 0),
            "is_qbr": data.get("is_qbr", False),
            "priority": data.get("priority", 1),
            "dependency_id": data.get("dependency_id"),
            "effort_estimated": data.get("effort_estimated"),
            "effort_actual": data.get("effort_actual"),
            "due_date": data.get("due_date"),
            "notes": data.get("notes"),
            "qbr_period": data.get("qbr_period"),
            "history": [{"date": today, "progress_pct": data.get("progress_pct", 0), "status": data.get("status", "Not Started")}],
        }
        tasks.append(task)
        self._save(tasks)
        return task

    def update(self, task_id: str, data: dict) -> Optional[dict]:
        tasks = self._load()
        idx = next((i for i, t in enumerate(tasks) if t["id"] == task_id), None)
        if idx is None:
            return None
        data["history"] = self._snapshot(tasks[idx], data)
        for key, val in data.items():
            tasks[idx][key] = val
        self._save(tasks)
        return tasks[idx]

    def delete(self, task_id: str) -> bool:
        tasks = self._load()
        new_tasks = [t for t in tasks if t["id"] != task_id]
        if len(new_tasks) == len(tasks):
            return False
        self._save(new_tasks)
        return True

    def replace_all(self, tasks: List[dict]) -> None:
        self._save(tasks)
