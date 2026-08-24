/**
 * Biblioteca de materiais — cliente com cache localStorage (stale-while-revalidate).
 *
 * Consome GET /api/materials e GET /api/templates. Nos moldes de lib/taxonomy.ts,
 * mas SEM fallback embutido: sem rede e sem cache, retorna lista vazia com a
 * flag `offline` — nunca quebra a tela.
 */

export interface MaterialItem {
  id: number;
  label: string;
  kind: "link" | "evento";
  language: string | null; // PT | ENG | ESP | null
  url: string | null;
  meta: { date?: string; location?: string } & Record<string, unknown>;
  sort_order: number;
}

export interface MaterialGroup {
  name: string;
  items: MaterialItem[];
}

export interface MaterialProduct {
  key: string;
  label: string;
  groups: MaterialGroup[];
}

export interface MaterialsPayload {
  products: MaterialProduct[];
}

export interface MessageTemplate {
  id: number;
  product_key: string;
  name: string;
  body: string;
}

export interface TemplatesPayload {
  templates: MessageTemplate[];
}

/** Resultado com flag de origem: `offline` quando não veio da rede. */
export interface MaterialsResult {
  materials: MaterialsPayload;
  /** true = os dados vieram do cache local (rede indisponível). */
  offline: boolean;
}

const EMPTY_MATERIALS: MaterialsPayload = { products: [] };
const EMPTY_TEMPLATES: TemplatesPayload = { templates: [] };

const MATERIALS_KEY = "cimi_materials_v1";
const TEMPLATES_KEY = "cimi_templates_v1";
const TTL_MS = 5 * 60 * 1000; // 5 min

function _timeoutSignal(ms: number): AbortSignal | undefined {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

function _readLocal<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed._fetchedAt === "number") {
      return parsed.data as T;
    }
  } catch {
    // ignore corrupt cache
  }
  return null;
}

function _isFresh(key: string): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return (
      typeof parsed._fetchedAt === "number" &&
      Date.now() - parsed._fetchedAt < TTL_MS
    );
  } catch {
    return false;
  }
}

function _writeLocal<T>(key: string, data: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, _fetchedAt: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

async function _fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { signal: _timeoutSignal(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Busca materiais com stale-while-revalidate:
 * - cache fresco → retorna cache e revalida em background;
 * - cache velho/ausente → tenta rede; se falhar, cai no cache (mesmo velho);
 *   sem cache algum → lista vazia + offline=true.
 */
export async function getMaterialsCached(): Promise<MaterialsResult> {
  const cached = _readLocal<MaterialsPayload>(MATERIALS_KEY);

  if (cached && _isFresh(MATERIALS_KEY)) {
    void _revalidateMaterials();
    return { materials: cached, offline: false };
  }

  try {
    const fresh = await _fetchJson<MaterialsPayload>("/api/materials");
    _writeLocal(MATERIALS_KEY, fresh);
    return { materials: fresh, offline: false };
  } catch {
    if (cached) {
      // rede falhou mas temos cache (ainda que expirado): usa e sinaliza offline
      return { materials: cached, offline: true };
    }
    return { materials: EMPTY_MATERIALS, offline: true };
  }
}

async function _revalidateMaterials(): Promise<void> {
  try {
    const fresh = await _fetchJson<MaterialsPayload>("/api/materials");
    _writeLocal(MATERIALS_KEY, fresh);
  } catch {
    // silencioso em background
  }
}

/** Busca templates com o mesmo esquema de cache. */
export async function getTemplatesCached(): Promise<{
  templates: TemplatesPayload;
  offline: boolean;
}> {
  const cached = _readLocal<TemplatesPayload>(TEMPLATES_KEY);

  if (cached && _isFresh(TEMPLATES_KEY)) {
    void _revalidateTemplates();
    return { templates: cached, offline: false };
  }

  try {
    const fresh = await _fetchJson<TemplatesPayload>("/api/templates");
    _writeLocal(TEMPLATES_KEY, fresh);
    return { templates: fresh, offline: false };
  } catch {
    if (cached) return { templates: cached, offline: true };
    return { templates: EMPTY_TEMPLATES, offline: true };
  }
}

async function _revalidateTemplates(): Promise<void> {
  try {
    const fresh = await _fetchJson<TemplatesPayload>("/api/templates");
    _writeLocal(TEMPLATES_KEY, fresh);
  } catch {
    // silencioso
  }
}

/** Invalida os caches de materiais/templates (útil após import). */
export function invalidateMaterialsCache(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(MATERIALS_KEY);
    localStorage.removeItem(TEMPLATES_KEY);
  } catch {
    // ignore
  }
}

/** Total de itens ativos de um produto (soma dos grupos). */
export function countActiveItems(product: MaterialProduct): number {
  return product.groups.reduce((acc, g) => acc + g.items.length, 0);
}
