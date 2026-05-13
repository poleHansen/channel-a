# Cutout Web Tool

Offline single-image cutout workspace for Windows-first local use and LAN deployment.

## Install

### System Requirements

- Windows 11 recommended
- Python `3.10`
- Node.js `20.x`
- Git
- NVIDIA GPU optional but recommended for inference

If `nvidia-smi` reports a modern driver, use the official PyTorch `cu124` wheels even if the driver shows `CUDA Version: 13.0`.
That value reflects driver capability, not the exact PyTorch wheel tag you must install.

### Python Environment

Create and activate a local virtual environment from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

If you prefer Conda instead of `.venv`, create the base environment first and then continue with the same PyTorch and `requirements.txt` steps below:

```powershell
conda env create -f environment.yml
conda activate cutout-web
python -m pip install --upgrade pip
```

### Install PyTorch

GPU install recommended for your machine:

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

CPU fallback:

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Install Backend Dependencies

After PyTorch is installed, install the remaining Python packages:

```powershell
pip install -r requirements.txt
```

### Install Frontend Dependencies

```powershell
cd frontend
npm install
cd ..
```

### Verify the Environment

Run these checks before launching the app:

```powershell
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
python -c "import fastapi, transformers, sam2; print('backend imports ok')"
node -v
npm -v
```

## Model Setup

Place the local checkpoints before launching the backend:

```text
models/
  rmbg-2.0/
    config.json
    preprocessor_config.json
    BiRefNet_config.py
    birefnet.py
    model.safetensors   # or pytorch_model.bin
  sam2.1/
    sam2.1_hiera_large.pt
    sam2.1_hiera_l.yaml
```

`RMBG-2.0` is loaded locally through `transformers.AutoModelForImageSegmentation(..., trust_remote_code=True)`, so the Hugging Face model export needs to stay intact inside `models/rmbg-2.0/`.

`SAM 2.1` is loaded locally through `sam2.build_sam.build_sam2` and `sam2.sam2_image_predictor.SAM2ImagePredictor`. The backend accepts any one matching SAM 2.1 checkpoint/config pair in `models/sam2.1/`:

- `sam2.1_hiera_large.pt` + `sam2.1_hiera_l.yaml`
- `sam2.1_hiera_base_plus.pt` + `sam2.1_hiera_b+.yaml`
- `sam2.1_hiera_small.pt` + `sam2.1_hiera_s.yaml`
- `sam2.1_hiera_tiny.pt` + `sam2.1_hiera_t.yaml`

The project also expects `models/rmbg-2.0/preprocessor_config.json`. If that file is missing, backend startup checks will report `models_ready: false`.

## Environment Notes

`environment.yml` is intentionally minimal. It creates a base Python 3.10 environment with `pip` and `git`, then you install PyTorch and `requirements.txt` explicitly so the GPU or CPU build of `torch` stays under your control.

`requirements.txt` installs the Python runtime dependencies for the backend, including `SAM 2.1`, but PyTorch should still be installed first with the correct GPU or CPU wheel.

If you are targeting Windows with GPU inference, the SAM 2 project currently recommends using WSL for the most reliable install path.

## Structure

- `frontend/`: React workspace UI
- `backend/`: FastAPI inference and export service
- `models/`: local model weights
- `outputs/`: generated task files
- `logs/`: startup and runtime logs

## Local Preview

Start the local preview workflow from the repository root:

```powershell
.\launch.ps1
```

The script starts both the frontend and backend, writes tracked process metadata into `logs/`, saves stdout/stderr logs, and prints the local URLs:

- Frontend: `http://127.0.0.1:7860`
- Backend: `http://127.0.0.1:8000`

When you are done, stop both services with:

```powershell
.\stop.ps1
```

If the workspace venv exists at `.venv\Scripts\python.exe`, `launch.ps1` uses it for the backend automatically; otherwise it falls back to `python` on your `PATH`.

For the frontend, `launch.ps1` starts the local Vite entrypoint through `node` so the tracked PID belongs to the long-lived dev server process rather than an `npm` wrapper.

If a service fails to come up, check these log files under `logs/`:

- `frontend.out.log`
- `frontend.err.log`
- `backend.out.log`
- `backend.err.log`
