from pathlib import Path


def test_launch_script_mentions_frontend_and_backend() -> None:
    text = Path("launch.ps1").read_text(encoding="utf-8")
    assert "frontend" in text.lower()
    assert "backend" in text.lower()
