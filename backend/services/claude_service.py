import os
import httpx
from domain.models import OrchestratorMetrics

SYSTEM_PROMPT = """ROLE: CLAN STRATEGIC ORCHESTRATOR

CONTEXTO OPERATIVO:
Trabajas en un entorno de metodología por Clanes. Tu misión es transformar datos crudos de
tareas (Microsoft Planner, JSON o CSV) en inteligencia estratégica para asegurar el
cumplimiento del QBR (Quarterly Business Review).

CAPACIDADES TÉCNICAS:
1. Análisis de Dependencias: Identificar si una tarea del Clan A bloquea al Clan B.
2. Cálculo de Riesgo QBR: Evaluar el % de probabilidad de éxito de un objetivo trimestral
   basado en la velocidad actual de los clanes.
3. Optimización de Prioridades: Sugerir qué tareas "No-QBR" (emergencias/hotfixes)
   pueden ser desplazadas para proteger los compromisos principales.

REGLAS DE FORMATO — OBLIGATORIAS:
- USA SOLO: texto plano, **negrita** para términos clave, y listas con guión (-)
- PROHIBIDO: tablas markdown (|---|), encabezados con ## o ###, separadores ---
- PROHIBIDO: bloques de código, HTML, emojis en exceso
- Responde siempre en español
- El formato específico de cada respuesta lo indica el usuario en su mensaje
- Máximo 300 palabras en total"""


class ClaudeService:
    """Proxy limpio hacia la API de Anthropic. Solo esta clase conoce la URL y el API key."""

    ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
    MODEL          = "claude-sonnet-4-6"

    def __init__(self):
        self.api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not self.api_key:
            raise EnvironmentError("ANTHROPIC_API_KEY no está configurada en el entorno.")

    async def analyze(self, prompt: str) -> str:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": self.MODEL,
            "max_tokens": 1024,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": prompt}],
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(self.ANTHROPIC_URL, json=body, headers=headers)
            response.raise_for_status()
            data = response.json()

        texts = [block["text"] for block in data.get("content", []) if block.get("type") == "text"]
        return "\n".join(texts)
