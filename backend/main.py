from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from api.routes import router

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(
    title="Clan Orchestrator API",
    description="Backend proxy para Claude AI - Gestión estratégica de Clanes",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "service": "clan-orchestrator"}

# Serve Angular assets (JS, CSS, etc.)
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets") if (STATIC_DIR / "assets").exists() else None

# Catch-all: serve index.html for Angular routing
@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    file = STATIC_DIR / full_path
    if file.exists() and file.is_file():
        return FileResponse(file)
    return FileResponse(STATIC_DIR / "index.html")
