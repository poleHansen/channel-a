from fastapi import APIRouter, Request

router = APIRouter()

@router.get("/health")
def health(request: Request) -> dict[str, object]:
    return {
        "status": "ok",
        **request.app.state.startup_checks,
    }
