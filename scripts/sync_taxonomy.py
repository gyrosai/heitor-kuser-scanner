#!/usr/bin/env python3
"""Sincroniza shared/taxonomy.json (fonte editável) com as cópias reais
consumidas pelo frontend e pelo backend.

shared/taxonomy.json NUNCA é lido diretamente em runtime — nem o backend nem
o frontend importam desse caminho. Cada lado tem sua própria cópia real
(sem symlink) pra não depender de resolução de link em build/deploy:

    frontend/src/lib/taxonomy.json
    backend/app/taxonomy.json

Rodar sempre depois de editar shared/taxonomy.json:

    python3 scripts/sync_taxonomy.py

O pre-commit hook `check-taxonomy-sync` (scripts/check_taxonomy_sync.py)
bloqueia o commit se alguma cópia ficar desatualizada.
"""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "shared" / "taxonomy.json"
DESTINATIONS = [
    ROOT / "frontend" / "src" / "lib" / "taxonomy.json",
    ROOT / "backend" / "app" / "taxonomy.json",
]


def sync() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Fonte não encontrada: {SOURCE}")
    for dest in DESTINATIONS:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SOURCE, dest)
        print(f"sincronizado: {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    sync()
