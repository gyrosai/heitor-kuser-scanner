import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// shared/taxonomy.json é a fonte editável; ./taxonomy.json é uma cópia real
// sincronizada (sem symlink) via scripts/sync_taxonomy.py.
//
// Se este teste falhar: python3 scripts/sync_taxonomy.py

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../");
const SHARED_PATH = path.join(REPO_ROOT, "shared", "taxonomy.json");
const LOCAL_PATH = path.join(__dirname, "taxonomy.json");

describe("taxonomy.json sync", () => {
  it("cópia local (frontend/src/lib/taxonomy.json) é idêntica a shared/taxonomy.json", () => {
    const shared = fs.readFileSync(SHARED_PATH, "utf-8");
    const local = fs.readFileSync(LOCAL_PATH, "utf-8");
    expect(local).toBe(shared);
  });
});
