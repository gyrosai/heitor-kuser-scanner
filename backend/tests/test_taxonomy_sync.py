"""Garante que backend/app/taxonomy.json não diverge de shared/taxonomy.json.

shared/taxonomy.json é a fonte editável; backend/app/taxonomy.json é uma cópia
real sincronizada (sem symlink) via scripts/sync_taxonomy.py.

Se este teste falhar:
    python3 scripts/sync_taxonomy.py

Rodar com:
    cd backend && uv run pytest tests/test_taxonomy_sync.py -v
"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SHARED_PATH = REPO_ROOT / "shared" / "taxonomy.json"
LOCAL_PATH = REPO_ROOT / "backend" / "app" / "taxonomy.json"


def test_backend_taxonomy_copy_matches_shared_source():
    assert LOCAL_PATH.read_bytes() == SHARED_PATH.read_bytes(), (
        "backend/app/taxonomy.json diverge de shared/taxonomy.json — "
        "rode scripts/sync_taxonomy.py"
    )
