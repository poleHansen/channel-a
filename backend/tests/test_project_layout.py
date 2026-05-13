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


def test_gitkeep_markers_are_zero_byte_files() -> None:
    root = Path(__file__).resolve().parents[2]
    markers = [
        root / "models/.gitkeep",
        root / "outputs/.gitkeep",
        root / "logs/.gitkeep",
    ]
    missing = [str(path.relative_to(root)) for path in markers if not path.exists()]
    assert missing == []

    non_empty = [str(path.relative_to(root)) for path in markers if path.stat().st_size != 0]
    assert non_empty == []
