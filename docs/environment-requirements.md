# Environment Requirements

This document describes the recommended runtime environment for the local cutout tool in this repository.

## Recommended Deployment Target

- OS: Windows 11 with NVIDIA GPU
- Preferred runtime for GPU inference: WSL2 + Ubuntu 22.04 or 24.04
- Native Windows runtime: acceptable for frontend and basic backend setup, but `SAM 2` is more reliable under WSL

## Interpreting Your CUDA Screenshot

Your `nvidia-smi` screenshot shows:

- Driver Version: `580.97`
- CUDA Version: `13.0`

This does not mean you must install a `cu130` PyTorch build.
It means your installed NVIDIA driver advertises CUDA 13.0 runtime capability.
For this project, use an official PyTorch build that `SAM 2` supports, such as a `cu124` or `cu121` wheel, as long as the installed NVIDIA driver is new enough.

## Required Software

### Backend

- Python `3.10`
- `pip`
- Git
- `torch >= 2.5.1`
- `torchvision >= 0.20.1`
- `fastapi`
- `uvicorn`
- `pillow`
- `opencv-python`
- `numpy`
- `pytest`
- `python-multipart`
- `pydantic-settings`
- `transformers >= 4.38`
- `huggingface-hub < 1.0`
- `kornia`
- `timm`
- `sam2` installed from the official GitHub repository

### Frontend

- Node.js `20.x` recommended
- npm `10.x` or newer

## Recommended Python Install Profiles

Choose one of these profiles.

### Profile A: Recommended GPU profile

Use this when you want local GPU inference for both `RMBG-2.0` and `SAM 2.1`.

- Python `3.10`
- PyTorch GPU build: `torch 2.5.1+` with `cu124` preferred
- `sam2` installed in the same environment

### Profile B: CPU fallback profile

Use this only to validate startup, routing, and non-GPU logic.

- Python `3.10`
- PyTorch CPU build
- All backend dependencies still required

Expect segmentation performance to be much slower.

## Model Requirements

The backend loads models from local files only.
No automatic runtime download is expected by the current code path.

### RMBG-2.0

Expected directory:

```text
models/rmbg-2.0/
```

Required files:

- `config.json`
- `preprocessor_config.json`
- `BiRefNet_config.py`
- `birefnet.py`
- `model.safetensors` or `pytorch_model.bin`

### SAM 2.1

Expected directory:

```text
models/sam2.1/
```

One checkpoint and matching config are required.
Recommended pair for 8 GB VRAM:

- `sam2.1_hiera_small.pt`
- `sam2.1_hiera_s.yaml`

Accepted alternatives:

- `sam2.1_hiera_large.pt` + `sam2.1_hiera_l.yaml`
- `sam2.1_hiera_base_plus.pt` + `sam2.1_hiera_b+.yaml`
- `sam2.1_hiera_small.pt` + `sam2.1_hiera_s.yaml`
- `sam2.1_hiera_tiny.pt` + `sam2.1_hiera_t.yaml`

## Environment Creation Example

### 1. Create a virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

### 2. Install PyTorch

GPU example:

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

CPU example:

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### 3. Install backend dependencies

```powershell
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```powershell
cd frontend
npm install
cd ..
```

## Preflight Checks

Run these before trying to launch the app:

```powershell
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
python -c "import fastapi, transformers, sam2; print('backend imports ok')"
node -v
npm -v
```

## Expected Launch Constraints

- `launch.ps1` expects a project-local interpreter at `.venv\Scripts\python.exe` if present
- the backend expects model files under `models/`
- the frontend expects `frontend/node_modules/` to exist
- `outputs/` must be writable
- `environment.yml` only creates the base Conda environment; PyTorch and `requirements.txt` are installed afterward

## Practical Recommendation For This Repository

For this project on your machine:

1. Use Python `3.10`
2. Use Node.js `20`
3. Install PyTorch GPU wheels from the official `cu124` index
4. Install `sam2` from GitHub into the same environment
5. Complete the missing `RMBG-2.0/preprocessor_config.json`
6. Keep `SAM 2.1 small` as the first working model pair
