from fastapi import APIRouter

from app.api.export import router as export_router
from app.api.health import router as health_router
from app.api.segment import router as segment_router
from app.api.tasks import router as tasks_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(segment_router)
api_router.include_router(export_router)
api_router.include_router(tasks_router)
