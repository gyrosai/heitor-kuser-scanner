#!/usr/bin/env python3
"""Falha se alguma cópia de taxonomy.json divergir de shared/taxonomy.json.

Usado pelo hook de pre-commit `check-taxonomy-sync` e pelos testes
(backend/tests/test_taxonomy_sync.py e frontend/src/lib/taxonomy.sync.test.ts)
pra garantir que ninguém edite uma cópia sem rodar scripts/sync_taxonomy.py.

Rodar manualmente:

    python3 scripts/check_taxonomy_sync.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "shared" / "taxonomy.json"
COPIES = [
    ROOT / "frontend" / "src" / "lib" / "taxonomy.json",
    ROOT / "backend" / "app" / "taxonomy.json",
]


def find_mismatches() -> list[Path]:
    """Retorna as cópias que divergem (em bytes) de shared/taxonomy.json."""
    if not SOURCE.exists():
        raise SystemExit(f"Fonte não encontrada: {SOURCE}")
    source_bytes = SOURCE.read_bytes()
    mismatches: list[Path] = []
    for copy in COPIES:
        if not copy.exists() or copy.read_bytes() != source_bytes:
            mismatches.append(copy)
    return mismatches


def main() -> int:
    mismatches = find_mismatches()
    if mismatches:
        print("taxonomy.json fora de sincronia com shared/taxonomy.json:")
        for m in mismatches:
            print(f"  - {m.relative_to(ROOT)}")
        print("\nRode: python3 scripts/sync_taxonomy.py")
        return 1
    print("taxonomy.json sincronizado em todas as cópias.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
