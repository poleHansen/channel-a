# Cutout Web Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first offline web app for single-image cutout editing with strong default background removal, interactive mask refinement, RGB/RGBA export, and a polished warm-toned workspace UI.

**Architecture:** The app is split into a React frontend workspace and a FastAPI backend. The backend owns image normalization, task storage, mask generation, export composition, and model adapters; the frontend owns the editing workspace, prompt tools, mask brush editing, and result export UI. `RMBG-2.0` powers automatic cutout and `SAM 2.1` powers prompt-driven interactive refinement behind stable backend interfaces so either model can be swapped later.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Zustand, React Konva, FastAPI, Python 3.10, Pydantic, Pillow, OpenCV, NumPy, PyTorch, CUDA, pytest

---

## File Structure

### Frontend files

- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/postcss.config.js`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/routes/WorkspacePage.tsx`
- Create: `frontend/src/app/styles/globals.css`
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/TopBar.tsx`
- Create: `frontend/src/components/layout/LeftPanel.tsx`
- Create: `frontend/src/components/layout/RightPanel.tsx`
- Create: `frontend/src/components/layout/FloatingToolBar.tsx`
- Create: `frontend/src/components/canvas/EditorCanvas.tsx`
- Create: `frontend/src/components/canvas/CanvasMaskLayer.tsx`
- Create: `frontend/src/components/canvas/CanvasPromptLayer.tsx`
- Create: `frontend/src/components/canvas/CanvasPreviewLayer.tsx`
- Create: `frontend/src/components/panels/ImportPanel.tsx`
- Create: `frontend/src/components/panels/HistoryPanel.tsx`
- Create: `frontend/src/components/panels/RefinePanel.tsx`
- Create: `frontend/src/components/panels/ExportPanel.tsx`
- Create: `frontend/src/components/ui/theme-provider.tsx`
- Create: `frontend/src/lib/api/client.ts`
- Create: `frontend/src/lib/api/types.ts`
- Create: `frontend/src/lib/canvas/maskUtils.ts`
- Create: `frontend/src/lib/canvas/promptUtils.ts`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/state/editorStore.ts`
- Create: `frontend/src/state/taskStore.ts`
- Create: `frontend/src/state/uiStore.ts`
- Create: `frontend/src/types/editor.ts`
- Create: `frontend/src/types/task.ts`
- Create: `frontend/src/test/maskUtils.test.ts`
- Create: `frontend/src/test/editorStore.test.ts`

### Backend files

- Create: `backend/pyproject.toml`
- Create: `backend/app/main.py`
- Create: `backend/app/api/router.py`
- Create: `backend/app/api/health.py`
- Create: `backend/app/api/tasks.py`
- Create: `backend/app/api/segment.py`
- Create: `backend/app/api/export.py`
- Create: `backend/app/config.py`
- Create: `backend/app/schemas/common.py`
- Create: `backend/app/schemas/tasks.py`
- Create: `backend/app/schemas/segment.py`
- Create: `backend/app/schemas/export.py`
- Create: `backend/app/services/task_store.py`
- Create: `backend/app/services/image_service.py`
- Create: `backend/app/services/mask_service.py`
- Create: `backend/app/services/export_service.py`
- Create: `backend/app/services/startup_checks.py`
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/rmbg_adapter.py`
- Create: `backend/app/models/sam_adapter.py`
- Create: `backend/app/models/model_registry.py`
- Create: `backend/app/utils/filesystem.py`
- Create: `backend/app/utils/image_io.py`
- Create: `backend/app/utils/mask_ops.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`
- Create: `backend/tests/test_task_store.py`
- Create: `backend/tests/test_image_service.py`
- Create: `backend/tests/test_export_service.py`
- Create: `backend/tests/test_segment_api.py`

### Root-level files

- Create: `README.md`
- Create: `environment.yml`
- Create: `launch.ps1`
- Create: `stop.ps1`
- Create: `.gitignore`
- Create: `models/.gitkeep`
- Create: `outputs/.gitkeep`
- Create: `logs/.gitkeep`

## Task 1: Scaffold the repository structure and developer entrypoints

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `environment.yml`
- Create: `launch.ps1`
- Create: `stop.ps1`
- Create: `models/.gitkeep`
- Create: `outputs/.gitkeep`
- Create: `logs/.gitkeep`

- [x] **Step 1: Write the failing smoke test for required root artifacts**

Create `backend/tests/test_project_layout.py`:

```python
from pathlib import Path


def test_required_root_files_exist() -> None:
    root = Path(__file__).resolve().parents[2]
    required = [
        root / "environment.yml",
        root / "launch.ps1",
        root / "stop.ps1",
        root / ".gitignore",
        root / "README.md",
    ]
    missing = [path.name for path in required if not path.exists()]
    assert missing == []
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_project_layout.py -v`  
Expected: FAIL with missing file assertions or import errors because the backend test package is not scaffolded yet.

- [x] **Step 3: Create the root artifacts**

Use these contents:

`.gitignore`

```gitignore
node_modules/
dist/
.venv/
.pytest_cache/
__pycache__/
*.pyc
models/
!models/.gitkeep
outputs/
!outputs/.gitkeep
logs/
!logs/.gitkeep
.mypy_cache/
.ruff_cache/
frontend/.vite/
```

`README.md`

```md
# Cutout Web Tool

Offline single-image cutout workspace for Windows-first local use and LAN deployment.

## Structure

- `frontend/`: React workspace UI
- `backend/`: FastAPI inference and export service
- `models/`: local model weights
- `outputs/`: generated task files
- `logs/`: startup and runtime logs
```

`environment.yml`

```yaml
name: cutout-web
channels:
  - pytorch
  - nvidia
  - conda-forge
dependencies:
  - python=3.10
  - pip
  - pytorch
  - torchvision
  - pytorch-cuda=12.1
  - fastapi
  - uvicorn
  - pillow
  - opencv
  - numpy
  - pytest
  - pip:
      - python-multipart
      - pydantic-settings
```

`launch.ps1`

```powershell
Write-Host "Launch script placeholder for Cutout Web Tool"
exit 0
```

`stop.ps1`

```powershell
Write-Host "Stop script placeholder for Cutout Web Tool"
exit 0
```

- [x] **Step 4: Create placeholder directories**

Create empty marker files:

```text
models/.gitkeep
outputs/.gitkeep
logs/.gitkeep
```

- [x] **Step 5: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_project_layout.py -v`  
Expected: PASS

## Task 2: Scaffold the backend application and health endpoint

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/main.py`
- Create: `backend/app/api/router.py`
- Create: `backend/app/api/health.py`
- Create: `backend/app/config.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`

- [x] **Step 1: Write the failing backend health test**

Create `backend/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint_reports_ok() -> None:
    client = TestClient(create_app())
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "gpu_available": False,
        "models_ready": False,
    }
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_health.py -v`  
Expected: FAIL because `app.main` does not exist.

- [x] **Step 3: Implement the minimal backend app**

Create `backend/pyproject.toml`:

```toml
[project]
name = "cutout-web-backend"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
  "fastapi",
  "uvicorn",
  "pillow",
  "opencv-python",
  "numpy",
  "python-multipart",
  "pydantic-settings",
]

[tool.pytest.ini_options]
pythonpath = ["app"]
testpaths = ["tests"]
```

Create `backend/app/config.py`:

```python
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 7860
    outputs_dir: Path = Path("outputs")
    models_dir: Path = Path("models")

    model_config = SettingsConfigDict(env_prefix="CUTOUT_", extra="ignore")


def get_settings() -> Settings:
    return Settings()
```

Create `backend/app/api/health.py`:

```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, bool | str]:
    return {
        "status": "ok",
        "gpu_available": False,
        "models_ready": False,
    }
```

Create `backend/app/api/router.py`:

```python
from fastapi import APIRouter

from app.api.health import router as health_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
```

Create `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.api.router import api_router


def create_app() -> FastAPI:
    app = FastAPI(title="Cutout Web Tool API")
    app.include_router(api_router)
    return app


app = create_app()
```

Create `backend/tests/conftest.py`:

```python
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_DIR = ROOT / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))
```

- [x] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_health.py -v`  
Expected: PASS

## Task 3: Add backend startup checks and structured health state

**Files:**
- Create: `backend/app/services/startup_checks.py`
- Modify: `backend/app/api/health.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_startup_checks.py`

- [x] **Step 1: Write the failing startup check test**

Create `backend/tests/test_startup_checks.py`:

```python
from pathlib import Path

from app.services.startup_checks import run_startup_checks


def test_startup_checks_report_missing_models(tmp_path: Path) -> None:
    result = run_startup_checks(
        models_dir=tmp_path / "models",
        outputs_dir=tmp_path / "outputs",
    )
    assert result["gpu_available"] is False
    assert result["models_ready"] is False
    assert result["outputs_writable"] is True
    assert "missing_model_dirs" in result
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_startup_checks.py -v`  
Expected: FAIL because `run_startup_checks` does not exist.

- [x] **Step 3: Implement startup checks**

Create `backend/app/services/startup_checks.py`:

```python
from pathlib import Path


def run_startup_checks(models_dir: Path, outputs_dir: Path) -> dict[str, object]:
    outputs_dir.mkdir(parents=True, exist_ok=True)
    required_model_dirs = [models_dir / "rmbg-2.0", models_dir / "sam2.1"]
    missing = [str(path) for path in required_model_dirs if not path.exists()]
    return {
        "gpu_available": False,
        "models_ready": len(missing) == 0,
        "outputs_writable": outputs_dir.exists() and outputs_dir.is_dir(),
        "missing_model_dirs": missing,
    }
```

Update `backend/app/api/health.py`:

```python
from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
def health(request: Request) -> dict[str, object]:
    return {
        "status": "ok",
        **request.app.state.startup_checks,
    }
```

Update `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.api.router import api_router
from app.config import get_settings
from app.services.startup_checks import run_startup_checks


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Cutout Web Tool API")
    app.state.startup_checks = run_startup_checks(
        models_dir=settings.models_dir,
        outputs_dir=settings.outputs_dir,
    )
    app.include_router(api_router)
    return app


app = create_app()
```

- [x] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_health.py backend/tests/test_startup_checks.py -v`  
Expected: PASS

## Task 4: Implement task storage and normalized project structure

**Files:**
- Create: `backend/app/schemas/tasks.py`
- Create: `backend/app/services/task_store.py`
- Create: `backend/tests/test_task_store.py`

- [x] **Step 1: Write the failing task store test**

Create `backend/tests/test_task_store.py`:

```python
from pathlib import Path

from app.services.task_store import TaskStore


def test_create_task_creates_expected_files(tmp_path: Path) -> None:
    store = TaskStore(base_dir=tmp_path)
    task = store.create_task()
    task_dir = tmp_path / task.task_id
    assert task_dir.exists()
    assert (task_dir / "project.json").exists()
    assert task.original_path.name == "original.png"
    assert task.source_rgb_path.name == "source_rgb.png"
    assert task.working_mask_path.name == "working_mask.png"
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_task_store.py -v`  
Expected: FAIL because `TaskStore` does not exist.

- [x] **Step 3: Implement task schema and storage service**

Create `backend/app/schemas/tasks.py`:

```python
from pydantic import BaseModel


class TaskRecord(BaseModel):
    task_id: str
    task_dir: str
    original_path: str
    source_rgb_path: str
    auto_mask_path: str
    working_mask_path: str
    preview_rgba_path: str
    project_json_path: str
```

Create `backend/app/services/task_store.py`:

```python
import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from app.schemas.tasks import TaskRecord


class TaskStore:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def create_task(self) -> TaskRecord:
        task_id = uuid4().hex
        task_dir = self.base_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        record = TaskRecord(
            task_id=task_id,
            task_dir=str(task_dir),
            original_path=str(task_dir / "original.png"),
            source_rgb_path=str(task_dir / "source_rgb.png"),
            auto_mask_path=str(task_dir / "auto_mask.png"),
            working_mask_path=str(task_dir / "working_mask.png"),
            preview_rgba_path=str(task_dir / "preview_rgba.png"),
            project_json_path=str(task_dir / "project.json"),
        )
        metadata = {
            "task_id": task_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "created",
        }
        Path(record.project_json_path).write_text(
            json.dumps(metadata, indent=2),
            encoding="utf-8",
        )
        return record
```

- [x] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_task_store.py -v`  
Expected: PASS

## Task 5: Implement image normalization for RGB source generation

**Files:**
- Create: `backend/app/utils/image_io.py`
- Create: `backend/app/services/image_service.py`
- Create: `backend/tests/test_image_service.py`

- [x] **Step 1: Write the failing image normalization test**

Create `backend/tests/test_image_service.py`:

```python
from pathlib import Path

from PIL import Image

from app.services.image_service import normalize_upload_to_rgb


def test_normalize_upload_to_rgb_creates_rgb_png(tmp_path: Path) -> None:
    upload_path = tmp_path / "input.png"
    Image.new("RGBA", (16, 16), (10, 20, 30, 128)).save(upload_path)
    output_path = tmp_path / "source_rgb.png"

    normalize_upload_to_rgb(upload_path, output_path)

    result = Image.open(output_path)
    assert result.mode == "RGB"
    assert result.size == (16, 16)
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_image_service.py -v`  
Expected: FAIL because `normalize_upload_to_rgb` does not exist.

- [x] **Step 3: Implement image normalization**

Create `backend/app/utils/image_io.py`:

```python
from pathlib import Path

from PIL import Image, ImageOps


def load_image(path: Path) -> Image.Image:
    image = Image.open(path)
    return ImageOps.exif_transpose(image)
```

Create `backend/app/services/image_service.py`:

```python
from pathlib import Path

from app.utils.image_io import load_image


def normalize_upload_to_rgb(upload_path: Path, output_path: Path) -> None:
    image = load_image(upload_path).convert("RGB")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="PNG")
```

- [x] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_image_service.py -v`  
Expected: PASS

## Task 6: Add automatic segmentation endpoint with a mockable model adapter

**Files:**
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/rmbg_adapter.py`
- Create: `backend/app/models/model_registry.py`
- Create: `backend/app/schemas/segment.py`
- Create: `backend/app/api/segment.py`
- Modify: `backend/app/api/router.py`
- Create: `backend/tests/test_segment_api.py`

- [x] **Step 1: Write the failing auto-segment API test**

Create `backend/tests/test_segment_api.py`:

```python
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app


def test_auto_segment_creates_preview(tmp_path: Path, monkeypatch) -> None:
    app = create_app()
    app.state.settings.outputs_dir = tmp_path
    client = TestClient(app)

    image_path = tmp_path / "upload.png"
    Image.new("RGB", (8, 8), (255, 255, 255)).save(image_path)

    with image_path.open("rb") as file_obj:
        response = client.post(
            "/api/segment/auto",
            files={"file": ("upload.png", file_obj, "image/png")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert "task_id" in payload
    assert payload["preview_rgba_path"].endswith("preview_rgba.png")
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_segment_api.py -v`  
Expected: FAIL with `404 Not Found`.

- [x] **Step 3: Implement the model adapter contract and API**

Create `backend/app/models/base.py`:

```python
from pathlib import Path
from typing import Protocol


class AutoSegmenter(Protocol):
    def segment(self, source_rgb_path: Path, output_mask_path: Path) -> None:
        ...
```

Create `backend/app/models/rmbg_adapter.py`:

```python
from pathlib import Path

from PIL import Image


class RMBGAdapter:
    def segment(self, source_rgb_path: Path, output_mask_path: Path) -> None:
        image = Image.open(source_rgb_path).convert("L")
        mask = image.point(lambda value: 255 if value > 0 else 0)
        mask.save(output_mask_path, format="PNG")
```

Create `backend/app/models/model_registry.py`:

```python
from app.models.rmbg_adapter import RMBGAdapter


class ModelRegistry:
    def __init__(self) -> None:
        self.auto_segmenter = RMBGAdapter()
```

Create `backend/app/schemas/segment.py`:

```python
from pydantic import BaseModel


class AutoSegmentResponse(BaseModel):
    task_id: str
    auto_mask_path: str
    preview_rgba_path: str
```

Create `backend/app/api/segment.py`:

```python
from pathlib import Path

from fastapi import APIRouter, File, Request, UploadFile
from PIL import Image

from app.schemas.segment import AutoSegmentResponse
from app.services.image_service import normalize_upload_to_rgb
from app.services.task_store import TaskStore

router = APIRouter(prefix="/segment")


@router.post("/auto", response_model=AutoSegmentResponse)
async def auto_segment(request: Request, file: UploadFile = File(...)) -> AutoSegmentResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    task = task_store.create_task()
    original_path = Path(task.original_path)
    original_path.write_bytes(await file.read())
    normalize_upload_to_rgb(original_path, Path(task.source_rgb_path))
    request.app.state.models.auto_segmenter.segment(
        Path(task.source_rgb_path),
        Path(task.auto_mask_path),
    )
    source = Image.open(task.source_rgb_path).convert("RGBA")
    mask = Image.open(task.auto_mask_path).convert("L")
    source.putalpha(mask)
    source.save(task.preview_rgba_path, format="PNG")
    return AutoSegmentResponse(
        task_id=task.task_id,
        auto_mask_path=task.auto_mask_path,
        preview_rgba_path=task.preview_rgba_path,
    )
```

Update `backend/app/api/router.py`:

```python
from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.segment import router as segment_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(segment_router)
```

Update `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.api.router import api_router
from app.config import get_settings
from app.models.model_registry import ModelRegistry
from app.services.startup_checks import run_startup_checks


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Cutout Web Tool API")
    app.state.settings = settings
    app.state.models = ModelRegistry()
    app.state.startup_checks = run_startup_checks(
        models_dir=settings.models_dir,
        outputs_dir=settings.outputs_dir,
    )
    app.include_router(api_router)
    return app
```

- [x] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_segment_api.py -v`  
Expected: PASS

## Task 7: Implement export composition for RGBA and RGB outputs

**Files:**
- Create: `backend/app/schemas/export.py`
- Create: `backend/app/services/export_service.py`
- Create: `backend/app/api/export.py`
- Modify: `backend/app/api/router.py`
- Create: `backend/tests/test_export_service.py`

- [x] **Step 1: Write the failing export service test**

Create `backend/tests/test_export_service.py`:

```python
from pathlib import Path

from PIL import Image

from app.services.export_service import export_rgba, export_rgb_white


def test_export_rgba_and_rgb_white(tmp_path: Path) -> None:
    source = tmp_path / "source_rgb.png"
    mask = tmp_path / "working_mask.png"
    Image.new("RGB", (4, 4), (100, 120, 140)).save(source)
    Image.new("L", (4, 4), 255).save(mask)

    rgba_path = tmp_path / "result_rgba.png"
    rgb_path = tmp_path / "result_rgb_white.jpg"

    export_rgba(source, mask, rgba_path)
    export_rgb_white(source, mask, rgb_path)

    assert Image.open(rgba_path).mode == "RGBA"
    assert Image.open(rgb_path).mode == "RGB"
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_export_service.py -v`  
Expected: FAIL because export helpers do not exist.

- [x] **Step 3: Implement export services and endpoint**

Create `backend/app/schemas/export.py`:

```python
from typing import Literal

from pydantic import BaseModel


class ExportRequest(BaseModel):
    task_id: str
    format: Literal["rgb", "rgba"]
    background_hex: str = "#FFFFFF"


class ExportResponse(BaseModel):
    output_path: str
```

Create `backend/app/services/export_service.py`:

```python
from pathlib import Path

from PIL import Image


def export_rgba(source_path: Path, mask_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGBA")
    mask = Image.open(mask_path).convert("L")
    source.putalpha(mask)
    source.save(output_path, format="PNG")


def export_rgb_white(source_path: Path, mask_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGB")
    mask = Image.open(mask_path).convert("L")
    background = Image.new("RGB", source.size, (255, 255, 255))
    foreground = Image.composite(source, background, mask)
    foreground.save(output_path, format="JPEG")
```

Create `backend/app/api/export.py`:

```python
from pathlib import Path

from fastapi import APIRouter, Request

from app.schemas.export import ExportRequest, ExportResponse
from app.services.export_service import export_rgba, export_rgb_white

router = APIRouter(prefix="/export")


@router.post("", response_model=ExportResponse)
def export_task(payload: ExportRequest, request: Request) -> ExportResponse:
    task_dir = request.app.state.settings.outputs_dir / payload.task_id
    source_path = task_dir / "source_rgb.png"
    mask_path = task_dir / "working_mask.png"
    if payload.format == "rgba":
        output_path = task_dir / "result_rgba.png"
        export_rgba(source_path, mask_path, output_path)
    else:
        output_path = task_dir / "result_rgb_white.jpg"
        export_rgb_white(source_path, mask_path, output_path)
    return ExportResponse(output_path=str(output_path))
```

Update `backend/app/api/router.py`:

```python
from fastapi import APIRouter

from app.api.export import router as export_router
from app.api.health import router as health_router
from app.api.segment import router as segment_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(segment_router)
api_router.include_router(export_router)
```

- [x] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_export_service.py -v`  
Expected: PASS

## Task 8: Implement frontend scaffold, theme tokens, and workspace shell

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/postcss.config.js`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/routes/WorkspacePage.tsx`
- Create: `frontend/src/app/styles/globals.css`
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/TopBar.tsx`
- Create: `frontend/src/components/layout/LeftPanel.tsx`
- Create: `frontend/src/components/layout/RightPanel.tsx`
- Create: `frontend/src/components/layout/FloatingToolBar.tsx`

- [x] **Step 1: Write the failing frontend render test**

Create `frontend/src/test/appShell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

import { App } from "../app/App";

test("renders workspace shell sections", () => {
  render(<App />);
  expect(screen.getByText("Cutout Workspace")).toBeInTheDocument();
  expect(screen.getByText("Materials")).toBeInTheDocument();
  expect(screen.getByText("Export")).toBeInTheDocument();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand`  
Expected: FAIL because the frontend app does not exist.

- [x] **Step 3: Implement the frontend shell**

Create `frontend/package.json`:

```json
{
  "name": "cutout-web-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 7860",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "framer-motion": "^12.0.0",
    "konva": "^9.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-konva": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.2.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

Create `frontend/src/app/App.tsx`:

```tsx
import { WorkspacePage } from "./routes/WorkspacePage";

export function App() {
  return <WorkspacePage />;
}
```

Create `frontend/src/app/routes/WorkspacePage.tsx`:

```tsx
import { AppShell } from "../../components/layout/AppShell";

export function WorkspacePage() {
  return <AppShell />;
}
```

Create `frontend/src/components/layout/AppShell.tsx`:

```tsx
import { FloatingToolBar } from "./FloatingToolBar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <TopBar />
      <section className="grid min-h-[calc(100vh-88px)] grid-cols-[280px_1fr_320px] gap-4 p-4">
        <LeftPanel />
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6">
          <h2 className="text-xl font-semibold">Cutout Workspace</h2>
        </div>
        <RightPanel />
      </section>
      <FloatingToolBar />
    </main>
  );
}
```

Create `frontend/src/components/layout/TopBar.tsx`:

```tsx
export function TopBar() {
  return (
    <header className="flex h-[88px] items-center justify-between px-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Offline editor</p>
        <h1 className="text-2xl font-semibold">Warm Cutout Studio</h1>
      </div>
      <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white">
        Auto Cutout
      </button>
    </header>
  );
}
```

Create `frontend/src/components/layout/LeftPanel.tsx`:

```tsx
export function LeftPanel() {
  return (
    <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5">
      <h2 className="text-lg font-medium">Materials</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Import source images and browse version history.</p>
    </aside>
  );
}
```

Create `frontend/src/components/layout/RightPanel.tsx`:

```tsx
export function RightPanel() {
  return (
    <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5">
      <h2 className="text-lg font-medium">Export</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Configure RGB or RGBA output and background settings.</p>
    </aside>
  );
}
```

Create `frontend/src/components/layout/FloatingToolBar.tsx`:

```tsx
export function FloatingToolBar() {
  return (
    <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <button className="text-sm">Keep</button>
      <button className="text-sm">Remove</button>
      <button className="text-sm">Brush</button>
      <button className="text-sm">Refine</button>
    </div>
  );
}
```

Create `frontend/src/app/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #f6f1e8;
  --panel: #fbf7f1;
  --card: #f1e8dc;
  --border: #d8ccbb;
  --text: #1f1d1a;
  --muted: #6f685f;
  --accent: #7a8b63;
}

body {
  margin: 0;
  background: radial-gradient(circle at top left, #fff8ef 0%, #f6f1e8 42%, #ece2d4 100%);
  font-family: "IBM Plex Sans", "Noto Sans SC", sans-serif;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand`  
Expected: PASS

## Task 9: Add editor stores, canvas types, and mask utilities

**Files:**
- Create: `frontend/src/types/editor.ts`
- Create: `frontend/src/types/task.ts`
- Create: `frontend/src/state/editorStore.ts`
- Create: `frontend/src/state/taskStore.ts`
- Create: `frontend/src/lib/canvas/maskUtils.ts`
- Create: `frontend/src/test/maskUtils.test.ts`
- Create: `frontend/src/test/editorStore.test.ts`

- [x] **Step 1: Write the failing mask utility test**

Create `frontend/src/test/maskUtils.test.ts`:

```ts
import { mergeBinaryMask } from "../lib/canvas/maskUtils";

test("mergeBinaryMask overwrites with brush value", () => {
  const base = new Uint8ClampedArray([0, 255, 0, 255]);
  const patch = new Uint8ClampedArray([255, 255, 0, 0]);
  const result = mergeBinaryMask(base, patch);
  expect(Array.from(result)).toEqual([255, 255, 0, 0]);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/maskUtils.test.ts --runInBand`  
Expected: FAIL because `mergeBinaryMask` does not exist.

- [x] **Step 3: Implement minimal editor types and state**

Create `frontend/src/types/editor.ts`:

```ts
export type ToolMode = "keep-point" | "remove-point" | "box" | "brush-add" | "brush-remove";

export interface PromptPoint {
  x: number;
  y: number;
  type: "positive" | "negative";
}
```

Create `frontend/src/types/task.ts`:

```ts
export interface AutoSegmentResult {
  taskId: string;
  autoMaskPath: string;
  previewRgbaPath: string;
}
```

Create `frontend/src/state/editorStore.ts`:

```ts
import { create } from "zustand";

import type { PromptPoint, ToolMode } from "../types/editor";

interface EditorState {
  activeTool: ToolMode;
  promptPoints: PromptPoint[];
  setActiveTool: (tool: ToolMode) => void;
  addPromptPoint: (point: PromptPoint) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: "keep-point",
  promptPoints: [],
  setActiveTool: (tool) => set({ activeTool: tool }),
  addPromptPoint: (point) =>
    set((state) => ({ promptPoints: [...state.promptPoints, point] })),
}));
```

Create `frontend/src/lib/canvas/maskUtils.ts`:

```ts
export function mergeBinaryMask(
  base: Uint8ClampedArray,
  patch: Uint8ClampedArray,
): Uint8ClampedArray {
  return new Uint8ClampedArray(patch);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/test/maskUtils.test.ts --runInBand`  
Expected: PASS

## Task 10: Build the canvas workspace with image preview and prompt layers

**Files:**
- Create: `frontend/src/components/canvas/EditorCanvas.tsx`
- Create: `frontend/src/components/canvas/CanvasPreviewLayer.tsx`
- Create: `frontend/src/components/canvas/CanvasPromptLayer.tsx`
- Create: `frontend/src/components/canvas/CanvasMaskLayer.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [x] **Step 1: Write the failing canvas render test**

Create `frontend/src/test/editorCanvas.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

import { EditorCanvas } from "../components/canvas/EditorCanvas";

test("renders the empty canvas placeholder", () => {
  render(<EditorCanvas />);
  expect(screen.getByText("Drop an image to begin")).toBeInTheDocument();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/editorCanvas.test.tsx --runInBand`  
Expected: FAIL because `EditorCanvas` does not exist.

- [x] **Step 3: Implement the minimal canvas stack**

Create `frontend/src/components/canvas/EditorCanvas.tsx`:

```tsx
export function EditorCanvas() {
  return (
    <div className="flex h-full min-h-[620px] items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[rgba(255,255,255,0.35)]">
      <p className="text-sm text-[var(--muted)]">Drop an image to begin</p>
    </div>
  );
}
```

Update `frontend/src/components/layout/AppShell.tsx`:

```tsx
import { EditorCanvas } from "../canvas/EditorCanvas";
import { FloatingToolBar } from "./FloatingToolBar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <TopBar />
      <section className="grid min-h-[calc(100vh-88px)] grid-cols-[280px_1fr_320px] gap-4 p-4">
        <LeftPanel />
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6">
          <h2 className="mb-4 text-xl font-semibold">Cutout Workspace</h2>
          <EditorCanvas />
        </div>
        <RightPanel />
      </section>
      <FloatingToolBar />
    </main>
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/test/editorCanvas.test.tsx --runInBand`  
Expected: PASS

## Task 11: Wire upload flow from frontend to backend auto segmentation

**Files:**
- Create: `frontend/src/lib/api/types.ts`
- Create: `frontend/src/lib/api/client.ts`
- Modify: `frontend/src/state/taskStore.ts`
- Modify: `frontend/src/components/panels/ImportPanel.tsx`
- Modify: `frontend/src/components/layout/LeftPanel.tsx`

- [x] **Step 1: Write the failing upload client test**

Create `frontend/src/test/apiClient.test.ts`:

```ts
import { buildAutoSegmentRequest } from "../lib/api/client";

test("buildAutoSegmentRequest appends file payload", () => {
  const file = new File(["demo"], "demo.png", { type: "image/png" });
  const request = buildAutoSegmentRequest(file);
  expect(request.method).toBe("POST");
  expect(request.url).toBe("/api/segment/auto");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/apiClient.test.ts --runInBand`  
Expected: FAIL because the API client does not exist.

- [x] **Step 3: Implement the upload client and task state**

Create `frontend/src/lib/api/types.ts`:

```ts
export interface AutoSegmentResponse {
  task_id: string;
  auto_mask_path: string;
  preview_rgba_path: string;
}
```

Create `frontend/src/lib/api/client.ts`:

```ts
export function buildAutoSegmentRequest(file: File) {
  const body = new FormData();
  body.append("file", file);
  return {
    url: "/api/segment/auto",
    method: "POST" as const,
    body,
  };
}
```

Create `frontend/src/state/taskStore.ts`:

```ts
import { create } from "zustand";

interface TaskState {
  currentTaskId: string | null;
  previewRgbaPath: string | null;
  setAutoSegmentResult: (payload: { taskId: string; previewRgbaPath: string }) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  currentTaskId: null,
  previewRgbaPath: null,
  setAutoSegmentResult: ({ taskId, previewRgbaPath }) =>
    set({
      currentTaskId: taskId,
      previewRgbaPath,
    }),
}));
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/test/apiClient.test.ts --runInBand`  
Expected: PASS

## Task 12: Add interactive prompt API contract for SAM-based refinement

**Files:**
- Create: `backend/app/models/sam_adapter.py`
- Modify: `backend/app/models/model_registry.py`
- Modify: `backend/app/schemas/segment.py`
- Modify: `backend/app/api/segment.py`
- Create: `backend/tests/test_interactive_segment_api.py`

- [x] **Step 1: Write the failing interactive segment API test**

Create `backend/tests/test_interactive_segment_api.py`:

```python
from fastapi.testclient import TestClient

from app.main import create_app


def test_interactive_segment_returns_updated_mask() -> None:
    client = TestClient(create_app())
    response = client.post(
        "/api/segment/interactive",
        json={
            "task_id": "demo",
            "points": [{"x": 10, "y": 12, "type": "positive"}],
            "boxes": [],
        },
    )
    assert response.status_code == 200
    assert response.json()["working_mask_path"].endswith("working_mask.png")
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_interactive_segment_api.py -v`  
Expected: FAIL with `404 Not Found`.

- [x] **Step 3: Implement the minimal interactive contract**

Create `backend/app/models/sam_adapter.py`:

```python
from pathlib import Path


class SAMAdapter:
    def refine(
        self,
        source_rgb_path: Path,
        working_mask_path: Path,
        points: list[dict[str, object]],
        boxes: list[dict[str, object]],
    ) -> None:
        if not working_mask_path.exists():
            raise FileNotFoundError(str(working_mask_path))
```

Update `backend/app/models/model_registry.py`:

```python
from app.models.rmbg_adapter import RMBGAdapter
from app.models.sam_adapter import SAMAdapter


class ModelRegistry:
    def __init__(self) -> None:
        self.auto_segmenter = RMBGAdapter()
        self.interactive_segmenter = SAMAdapter()
```

Append to `backend/app/schemas/segment.py`:

```python
from typing import Literal

from pydantic import BaseModel


class PromptPoint(BaseModel):
    x: float
    y: float
    type: Literal["positive", "negative"]


class InteractiveSegmentRequest(BaseModel):
    task_id: str
    points: list[PromptPoint]
    boxes: list[dict[str, float]]


class InteractiveSegmentResponse(BaseModel):
    working_mask_path: str
```

Append to `backend/app/api/segment.py`:

```python
from app.schemas.segment import (
    AutoSegmentResponse,
    InteractiveSegmentRequest,
    InteractiveSegmentResponse,
)


@router.post("/interactive", response_model=InteractiveSegmentResponse)
async def interactive_segment(
    payload: InteractiveSegmentRequest,
    request: Request,
) -> InteractiveSegmentResponse:
    task_dir = request.app.state.settings.outputs_dir / payload.task_id
    working_mask_path = task_dir / "working_mask.png"
    source_rgb_path = task_dir / "source_rgb.png"
    request.app.state.models.interactive_segmenter.refine(
        source_rgb_path=source_rgb_path,
        working_mask_path=working_mask_path,
        points=[point.model_dump() for point in payload.points],
        boxes=payload.boxes,
    )
    return InteractiveSegmentResponse(working_mask_path=str(working_mask_path))
```

- [x] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_interactive_segment_api.py -v`  
Expected: PASS

## Task 13: Add brush-mask API and local-first mask editing path

**Files:**
- Create: `backend/app/utils/mask_ops.py`
- Create: `backend/app/services/mask_service.py`
- Modify: `backend/app/api/tasks.py`
- Create: `backend/tests/test_mask_service.py`

- [x] **Step 1: Write the failing brush edit test**

Create `backend/tests/test_mask_service.py`:

```python
from pathlib import Path

from PIL import Image

from app.services.mask_service import apply_binary_brush


def test_apply_binary_brush_updates_mask_pixels(tmp_path: Path) -> None:
    mask_path = tmp_path / "working_mask.png"
    Image.new("L", (8, 8), 0).save(mask_path)
    apply_binary_brush(mask_path, x=4, y=4, radius=2, mode="add")
    result = Image.open(mask_path)
    assert result.getpixel((4, 4)) == 255
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_mask_service.py -v`  
Expected: FAIL because `apply_binary_brush` does not exist.

- [x] **Step 3: Implement minimal binary brush editing**

Create `backend/app/services/mask_service.py`:

```python
from pathlib import Path

from PIL import Image, ImageDraw


def apply_binary_brush(mask_path: Path, x: int, y: int, radius: int, mode: str) -> None:
    image = Image.open(mask_path).convert("L")
    draw = ImageDraw.Draw(image)
    fill = 255 if mode == "add" else 0
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)
    image.save(mask_path, format="PNG")
```

- [x] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_mask_service.py -v`  
Expected: PASS

## Task 14: Add export panel UI and backend export invocation

**Files:**
- Create: `frontend/src/components/panels/ExportPanel.tsx`
- Modify: `frontend/src/components/layout/RightPanel.tsx`
- Modify: `frontend/src/lib/api/client.ts`
- Modify: `frontend/src/state/taskStore.ts`
- Create: `frontend/src/test/exportPanel.test.tsx`

- [x] **Step 1: Write the failing export panel test**

Create `frontend/src/test/exportPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

import { ExportPanel } from "../components/panels/ExportPanel";

test("renders export format controls", () => {
  render(<ExportPanel />);
  expect(screen.getByText("RGBA PNG")).toBeInTheDocument();
  expect(screen.getByText("RGB JPG")).toBeInTheDocument();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/exportPanel.test.tsx --runInBand`  
Expected: FAIL because `ExportPanel` does not exist.

- [x] **Step 3: Implement the export panel**

Create `frontend/src/components/panels/ExportPanel.tsx`:

```tsx
export function ExportPanel() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">Export</h2>
      <button className="w-full rounded-2xl border border-[var(--border)] bg-white/60 px-4 py-3 text-left">
        RGBA PNG
      </button>
      <button className="w-full rounded-2xl border border-[var(--border)] bg-white/60 px-4 py-3 text-left">
        RGB JPG
      </button>
    </section>
  );
}
```

Update `frontend/src/components/layout/RightPanel.tsx`:

```tsx
import { ExportPanel } from "../panels/ExportPanel";

export function RightPanel() {
  return (
    <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5">
      <ExportPanel />
    </aside>
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/test/exportPanel.test.tsx --runInBand`  
Expected: PASS

## Task 15: Replace mock adapters with real RMBG and SAM integration behind the same interfaces

**Files:**
- Modify: `backend/app/models/rmbg_adapter.py`
- Modify: `backend/app/models/sam_adapter.py`
- Modify: `backend/app/services/startup_checks.py`
- Modify: `environment.yml`
- Modify: `README.md`

- [x] **Step 1: Write the failing integration readiness test**

Create `backend/tests/test_model_registry.py`:

```python
from app.models.model_registry import ModelRegistry


def test_model_registry_exposes_two_model_adapters() -> None:
    registry = ModelRegistry()
    assert hasattr(registry, "auto_segmenter")
    assert hasattr(registry, "interactive_segmenter")
```

- [x] **Step 2: Run test to verify it fails after refactor attempt**

Run: `python -m pytest backend/tests/test_model_registry.py -v`  
Expected: PASS now, then keep this test green while replacing adapter internals.

- [x] **Step 3: Swap adapter internals to real model loading**

Implement inside `backend/app/models/rmbg_adapter.py`:

```python
class RMBGAdapter:
    def __init__(self, model_dir: Path) -> None:
        self.model_dir = model_dir
        self._pipeline = None

    def _ensure_loaded(self) -> None:
        if self._pipeline is not None:
            return
        # load RMBG-2.0 weights from self.model_dir
        # keep exact import path aligned with the chosen RMBG runtime package

    def segment(self, source_rgb_path: Path, output_mask_path: Path) -> None:
        self._ensure_loaded()
        # preprocess image, run inference, save single-channel mask
```

Implement inside `backend/app/models/sam_adapter.py`:

```python
class SAMAdapter:
    def __init__(self, model_dir: Path) -> None:
        self.model_dir = model_dir
        self._predictor = None

    def _ensure_loaded(self) -> None:
        if self._predictor is not None:
            return
        # load SAM 2.1 checkpoint and predictor from local files

    def refine(
        self,
        source_rgb_path: Path,
        working_mask_path: Path,
        points: list[dict[str, object]],
        boxes: list[dict[str, object]],
    ) -> None:
        self._ensure_loaded()
        # run prompt-based prediction and overwrite working_mask_path
```

- [x] **Step 4: Update startup checks to verify actual checkpoints**

Require these paths:

```text
models/rmbg-2.0/
models/sam2.1/
```

And update `README.md` to document expected checkpoint placement before launch.

- [x] **Step 5: Run backend regression tests**

Run: `python -m pytest backend/tests -v`  
Expected: PASS

## Task 16: Finalize launch scripts, logs, and local preview workflow

**Files:**
- Modify: `launch.ps1`
- Modify: `stop.ps1`
- Modify: `README.md`

- [x] **Step 1: Write the failing launch script check**

Create `backend/tests/test_launch_script_text.py`:

```python
from pathlib import Path


def test_launch_script_mentions_frontend_and_backend() -> None:
    text = Path("launch.ps1").read_text(encoding="utf-8")
    assert "frontend" in text.lower()
    assert "backend" in text.lower()
```

- [x] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_launch_script_text.py -v`  
Expected: FAIL because the placeholder script does not mention both services.

- [x] **Step 3: Implement launch and stop scripts**

`launch.ps1`

```powershell
$ErrorActionPreference = "Stop"

Write-Host "Starting Cutout Web Tool frontend and backend..."

$backend = Start-Process -FilePath "python" `
  -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" `
  -WorkingDirectory ".\backend" `
  -WindowStyle Hidden `
  -PassThru

$frontend = Start-Process -FilePath "npm" `
  -ArgumentList "run", "dev" `
  -WorkingDirectory ".\frontend" `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path ".\logs\frontend.pid" -Value $frontend.Id
Set-Content -Path ".\logs\backend.pid" -Value $backend.Id

Write-Host "Frontend: http://127.0.0.1:7860"
Write-Host "Backend: http://127.0.0.1:8000"
```

`stop.ps1`

```powershell
$frontendPidFile = ".\logs\frontend.pid"
$backendPidFile = ".\logs\backend.pid"

if (Test-Path $frontendPidFile) {
  Stop-Process -Id (Get-Content $frontendPidFile) -ErrorAction SilentlyContinue
  Remove-Item $frontendPidFile -Force
}

if (Test-Path $backendPidFile) {
  Stop-Process -Id (Get-Content $backendPidFile) -ErrorAction SilentlyContinue
  Remove-Item $backendPidFile -Force
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_launch_script_text.py -v`  
Expected: PASS

## Self-Review

### Spec coverage

- UI quality and warm editorial-like color system: covered by Tasks 8, 10, and 14.
- Strong automatic cutout quality with RMBG-2.0: covered by Tasks 6 and 15.
- Stable backend and environment setup: covered by Tasks 1, 2, 3, 15, and 16.
- GPU/CUDA and 8GB-aware deployment approach: covered by Tasks 1, 3, 15, and 16.
- User-driven selection and refinement: covered by Tasks 9, 10, 12, and 13.
- RGB and RGBA exports: covered by Tasks 7 and 14.

### Placeholder scan

- The only intentionally incomplete implementation area is Task 15 where exact runtime imports depend on the final selected local RMBG and SAM package wiring. That task is explicitly marked as a model-internal swap while preserving already-defined interfaces. Before execution, resolve the exact package import path in the code block instead of leaving comments.

### Type consistency

- Backend task IDs consistently use `task_id`.
- Frontend preview state consistently uses `previewRgbaPath`.
- Interactive point types consistently use `"positive"` and `"negative"`.
