from pathlib import Path

from app.models.rmbg_adapter import RMBGAdapter


def test_is_cuda_oom_detects_out_of_memory_message() -> None:
    adapter = RMBGAdapter(model_dir=Path("models"))

    assert adapter._is_cuda_oom(RuntimeError("CUDA out of memory")) is True
    assert adapter._is_cuda_oom(RuntimeError("some other error")) is False
