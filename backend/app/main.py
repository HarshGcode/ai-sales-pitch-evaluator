from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, dashboard, evaluations, export, organizations, scripts, search, users

app = FastAPI(title="AI Sales Pitch Evaluator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(users.router)
app.include_router(scripts.router)
app.include_router(evaluations.router)
app.include_router(dashboard.router)
app.include_router(search.router)
app.include_router(export.router)


@app.get("/health")
def health():
    return {"status": "ok", "mock_mode": settings.mock_mode}
