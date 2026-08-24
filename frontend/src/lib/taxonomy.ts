/**
 * Taxonomia CIMI Leads — cliente com cache e fallback hardcoded.
 *
 * Consome GET /api/taxonomy com stale-while-revalidate.
 * Se a rede falhar, usa o JSON embutido em ./taxonomy.json.
 *
 * IMPORTANTE: ./taxonomy.json é uma CÓPIA sincronizada de shared/taxonomy.json
 * (fonte editável). Editar só shared/taxonomy.json e rodar
 * scripts/sync_taxonomy.py — o pre-commit hook check-taxonomy-sync bloqueia
 * commit se divergir.
 */
import rawTaxonomy from "./taxonomy.json";

export interface TaxonomyProfile {
  slug: string;
  label: string;
}

export interface TaxonomyProduct {
  key: string;
  label: string;
  profiles: TaxonomyProfile[];
}

export interface Taxonomy {
  products: TaxonomyProduct[];
  legacy_profiles: Record<string, TaxonomyProfile[]>;
  interest_types: string[];
}

export const FALLBACK_TAXONOMY: Taxonomy = rawTaxonomy as Taxonomy;

let memoryCache: Taxonomy | null = null;
const LOCAL_KEY = "cimi_taxonomy_v1";
const TTL_MS = 5 * 60 * 1000; // 5 min

function _readLocal(): Taxonomy | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed._fetchedAt && Date.now() - parsed._fetchedAt < TTL_MS) {
      return parsed.taxonomy as Taxonomy;
    }
  } catch {
    // ignore corrupt cache
  }
  return null;
}

function _writeLocal(t: Taxonomy): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({ taxonomy: t, _fetchedAt: Date.now() }),
    );
  } catch {
    // ignore quota errors
  }
}

function _timeoutSignal(ms: number): AbortSignal | undefined {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

/**
 * Busca taxonomia do backend com cache em memória + localStorage.
 * Stale-while-revalidate: retorna cache imediatamente e atualiza em background.
 */
export async function getTaxonomyCached(): Promise<Taxonomy> {
  if (memoryCache) return memoryCache;

  const local = _readLocal();
  if (local) {
    memoryCache = local;
    // revalidação em background (não esperamos)
    _revalidateBackground();
    return memoryCache;
  }

  return _fetchTaxonomy();
}

async function _fetchTaxonomy(): Promise<Taxonomy> {
  try {
    const res = await fetch("/api/taxonomy", {
      signal: _timeoutSignal(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const taxonomy = (await res.json()) as Taxonomy;
    memoryCache = taxonomy;
    _writeLocal(taxonomy);
    return taxonomy;
  } catch {
    memoryCache = FALLBACK_TAXONOMY;
    return memoryCache;
  }
}

function _revalidateBackground(): void {
  _fetchTaxonomy().catch(() => {
    // silencioso em background
  });
}

/** Invalida cache (útil após deploy com taxonomia nova). */
export function invalidateTaxonomyCache(): void {
  memoryCache = null;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      // ignore
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers de consulta (stateless — recebem Taxonomy)
// ═══════════════════════════════════════════════════════════════════════════════

export function getProductKeys(taxonomy: Taxonomy): string[] {
  return taxonomy.products.map((p) => p.key);
}

export function getProductLabel(taxonomy: Taxonomy, key: string): string | undefined {
  return taxonomy.products.find((p) => p.key === key)?.label;
}

export function getProfileLabel(
  taxonomy: Taxonomy,
  productKey: string,
  slug: string,
): string | undefined {
  const product = taxonomy.products.find((p) => p.key === productKey);
  const profile = product?.profiles.find((pr) => pr.slug === slug);
  if (profile) return profile.label;
  // legacy fallback
  const legacy = taxonomy.legacy_profiles[productKey]?.find((pr) => pr.slug === slug);
  return legacy?.label;
}

export function isValidProfile(
  taxonomy: Taxonomy,
  productKey: string,
  slug: string,
): boolean {
  const product = taxonomy.products.find((p) => p.key === productKey);
  if (!product) return false;
  return product.profiles.some((pr) => pr.slug === slug);
}

export function isLegacyProfile(
  taxonomy: Taxonomy,
  productKey: string,
  slug: string,
): boolean {
  const legacy = taxonomy.legacy_profiles[productKey];
  if (!legacy) return false;
  return legacy.some((pr) => pr.slug === slug);
}

/** Extrai classificações de tags: {product_key: slug} */
export function parseClassificationTags(
  taxonomy: Taxonomy,
  tags: string[],
): Record<string, string> {
  const known = new Set([
    ...taxonomy.products.map((p) => p.key),
    ...Object.keys(taxonomy.legacy_profiles),
  ]);
  const result: Record<string, string> = {};
  for (const tag of tags) {
    const idx = tag.indexOf(":");
    if (idx === -1) continue;
    const key = tag.slice(0, idx);
    const slug = tag.slice(idx + 1);
    if (known.has(key)) {
      result[key] = slug;
    }
  }
  return result;
}

/** Converte estado de classificação em tags prefixadas. */
export function classificacoesToTags(state: Record<string, string | null>): string[] {
  const tags: string[] = [];
  for (const [key, slug] of Object.entries(state)) {
    if (slug) tags.push(`${key}:${slug}`);
  }
  return tags;
}

/**
 * Converte tags em estado de classificação (todos os produtos conhecidos
 * presentes, com `null` para os não classificados).
 *
 * Aceita a taxonomia explicitamente (`tagsToClassificacoes(taxonomy, tags)`,
 * usada por quem já carregou via getTaxonomyCached) ou só as tags
 * (`tagsToClassificacoes(tags)`), caso em que usa FALLBACK_TAXONOMY — a
 * mesma fonte embutida (./taxonomy.json) usada como fallback de rede em
 * qualquer lugar do app.
 */
export function tagsToClassificacoes(
  tags: string[],
): Record<string, string | null>;
export function tagsToClassificacoes(
  taxonomy: Taxonomy,
  tags: string[],
): Record<string, string | null>;
export function tagsToClassificacoes(
  taxonomyOrTags: Taxonomy | string[],
  maybeTags?: string[],
): Record<string, string | null> {
  const taxonomy = Array.isArray(taxonomyOrTags) ? FALLBACK_TAXONOMY : taxonomyOrTags;
  const tags = Array.isArray(taxonomyOrTags) ? taxonomyOrTags : maybeTags ?? [];

  const state: Record<string, string | null> = {};
  for (const p of taxonomy.products) {
    state[p.key] = null;
  }
  const parsed = parseClassificationTags(taxonomy, tags);
  for (const [key, slug] of Object.entries(parsed)) {
    state[key] = slug;
  }
  return state;
}

/** Todas as tags de interesse aceitas (para UI de chips). */
export function getAllowedTags(taxonomy: Taxonomy): string[] {
  return taxonomy.interest_types;
}

/** Formata colunas de CSV (produtos e perfis). */
export function formatCsvColumns(
  classifications: Record<string, string>,
): { produtos: string; perfis: string } {
  const produtoLabels: string[] = [];
  const perfilLabels: string[] = [];
  for (const product of FALLBACK_TAXONOMY.products) {
    const slug = classifications[product.key];
    if (!slug) continue;
    const profile =
      product.profiles.find((p) => p.slug === slug) ??
      FALLBACK_TAXONOMY.legacy_profiles[product.key]?.find((p) => p.slug === slug);
    produtoLabels.push(product.label);
    perfilLabels.push(`${product.label}: ${profile?.label ?? slug}`);
  }
  return {
    produtos: produtoLabels.join("; "),
    perfis: perfilLabels.join("; "),
  };
}
