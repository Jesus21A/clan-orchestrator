# Clan Orchestrator

Dashboard de inteligencia estratégica para gestión de Clanes con análisis en tiempo real usando Claude AI.

## Arquitectura

```
clan-orchestrator/
├── backend/                   # FastAPI — proxy hacia Claude API
│   ├── main.py                # Entry point + CORS
│   ├── api/
│   │   ├── routes.py          # Endpoints HTTP (thin controllers)
│   │   └── schemas.py         # Validación Pydantic
│   ├── domain/
│   │   └── models.py          # Modelos de dominio puros (sin framework)
│   ├── services/
│   │   ├── orchestrator_service.py  # Lógica de negocio (métricas, prompts)
│   │   └── claude_service.py        # Cliente Anthropic API
│   └── requirements.txt
└── frontend/                  # Angular 18 con Signals
    └── src/app/
        ├── core/
        │   ├── models/        # Tipos TypeScript
        │   ├── services/      # ClanApiService, DashboardStateService
        │   └── interceptors/  # Error handling HTTP
        └── features/dashboard/
            ├── metrics-bar/
            ├── task-table/
            └── ai-panel/
```

## Por qué el error "Failed to fetch"

El navegador bloquea llamadas directas a `api.anthropic.com` por política CORS. **Nunca llames a la API de Anthropic desde el frontend**. El backend actúa como proxy seguro: la API Key vive solo en el servidor.

```
Angular (4200) → FastAPI (8000) → Anthropic API
     ✓ CORS ok          ✓ API Key segura
```

## Setup

### 1. Backend

```bash
cd backend

# Crea el archivo .env
cp .env.example .env
# Edita .env y pon tu ANTHROPIC_API_KEY real

# Instala dependencias
pip install -r requirements.txt

# Corre el servidor
uvicorn main:app --reload --port 8000
```

Verifica en: http://localhost:8000/health  
Documentación automática: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Abre: http://localhost:4200

## Endpoints del API

| Método | Ruta                  | Descripción                              |
|--------|-----------------------|------------------------------------------|
| GET    | /health               | Health check                             |
| POST   | /api/v1/metrics       | Calcula métricas sin llamar a Claude     |
| POST   | /api/v1/analyze       | Análisis con Claude (qbr/bottleneck/plan)|

### Ejemplo de request a /api/v1/analyze

```json
{
  "tasks": [
    {
      "id": "1",
      "title": "API de Autenticación",
      "clan_owner": "Core",
      "status": "Blocked",
      "is_qbr": true,
      "priority": 5,
      "dependency_id": "2"
    }
  ],
  "analysis_type": "qbr"
}
```

## Importar datos propios

El frontend acepta archivos CSV o JSON con estas columnas:

```
id, title, clan_owner, status, is_qbr, priority, dependency_id, effort_estimated
```

- `status`: `Not Started` | `In Progress` | `Blocked` | `Completed`
- `is_qbr`: `true` | `false`
- `priority`: `1`–`5` (5 = crítico para QBR)
- `dependency_id`: ID de la tarea que debe terminar antes (opcional)
