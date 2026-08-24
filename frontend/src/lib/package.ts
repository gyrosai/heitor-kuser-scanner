/**
 * Preview local do pacote de materiais — espelha as mesmas regras de
 * `backend/app/services/package.py::compose_package` (placeholders, filtro
 * de idioma, formatação de linha, limite de 10 links) para o operador ver o
 * texto antes de salvar, sem round-trip de rede.
 *
 * Diferenças propositais em relação ao backend (o servidor sempre revalida
 * antes de enviar de verdade):
 * - Não filtra `active`/produto: os itens já chegam filtrados por produto e
 *   ativos via GET /api/materials (lib/materials.ts).
 * - Ainda assim filtra por idioma e por url presente, para o preview bater
 *   com o que o servidor vai realmente montar.
 */
import { EmailLanguage } from "./types";
import { MaterialItem } from "./materials";

export const MAX_MATERIAL_LINKS = 10;

const LANGUAGE_TO_MATERIAL_LANG: Record<EmailLanguage, string> = {
  "pt-BR": "PT",
  en: "ENG",
  es: "ESP",
};

const PLACEHOLDER_RE = /\{(nome|primeiro_nome|evento|produto)\}/g;

export interface PackagePreviewInput {
  contactName?: string | null;
  eventTag?: string | null;
  productLabel: string;
  language: EmailLanguage;
  materialIds: number[];
  /** Catálogo candidato — itens do produto selecionado, em todos os idiomas. */
  materials: MaterialItem[];
  templateBody: string;
}

export interface PackagePreviewResult {
  text: string;
  html: string;
  warnings: string[];
  materialIdsUsed: number[];
}

function renderPlaceholders(template: string, context: Record<string, string>): string {
  const rendered = template.replace(PLACEHOLDER_RE, (_match, key: string) => context[key] ?? "");

  const cleanedLines: string[] = [];
  for (const rawLine of rendered.split("\n")) {
    let line = rawLine.replace(/ {2,}/g, " ").trim();
    line = line.replace(/ +([.,!?;:])/g, "$1");
    if (line === "" && cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === "") {
      continue;
    }
    cleanedLines.push(line);
  }
  return cleanedLines.join("\n").trim();
}

function materialLabel(m: MaterialItem): string {
  if (m.kind === "evento") {
    const date = m.meta?.date;
    const location = m.meta?.location;
    const extra = [date, location].filter(Boolean).join(" — ");
    if (extra) return `${m.label} (${extra})`;
  }
  return m.label;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function selectMaterials(
  materials: MaterialItem[],
  materialIds: number[],
  materialLang: string,
): { included: MaterialItem[]; warnings: string[] } {
  const warnings: string[] = [];
  const byId = new Map(materials.map((m) => [m.id, m]));
  let included: MaterialItem[] = [];

  for (const id of materialIds) {
    const m = byId.get(id);
    if (!m) {
      warnings.push(`material ${id} não encontrado — ignorado`);
      continue;
    }
    if (!m.url) {
      warnings.push(`material ${id} (${m.label}) sem url — ignorado`);
      continue;
    }
    if (m.language !== null && m.language !== materialLang) {
      warnings.push(
        `material ${id} (${m.label}) em idioma ${m.language}, pacote em ${materialLang} — ignorado`,
      );
      continue;
    }
    included.push(m);
  }

  if (included.length > MAX_MATERIAL_LINKS) {
    warnings.push(
      `pacote tinha mais de ${MAX_MATERIAL_LINKS} materiais — cortado na ordem recebida`,
    );
    included = included.slice(0, MAX_MATERIAL_LINKS);
  }

  return { included, warnings };
}

/** Monta {text, html, warnings, materialIdsUsed} para preview local. */
export function previewPackage(input: PackagePreviewInput): PackagePreviewResult {
  const name = (input.contactName || "").trim();
  const primeiroNome = name ? name.split(" ")[0] : "";
  const evento = (input.eventTag || "").trim();

  const context: Record<string, string> = {
    nome: name,
    primeiro_nome: primeiroNome,
    evento,
    produto: input.productLabel,
  };
  const body = renderPlaceholders(input.templateBody, context);

  const materialLang = LANGUAGE_TO_MATERIAL_LANG[input.language];
  const { included, warnings } = selectMaterials(input.materials, input.materialIds, materialLang);

  const lines = included.map((m) => `${materialLabel(m)} — ${m.url}`);
  const text = [body, lines.join("\n")].filter((p) => p).join("\n\n").trim();

  const paragraphs = body.split("\n\n").filter((p) => p.trim());
  const htmlParts = paragraphs.map(
    (p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`,
  );
  if (included.length > 0) {
    const items = included.map(
      (m) => `<li><a href="${escapeHtml(m.url || "")}">${escapeHtml(materialLabel(m))}</a></li>`,
    );
    htmlParts.push(`<ul>${items.join("")}</ul>`);
  }
  const html =
    '<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px">' +
    htmlParts.join("") +
    "</body></html>";

  return {
    text,
    html,
    warnings,
    materialIdsUsed: included.map((m) => m.id),
  };
}

/**
 * Pré-seleção do produto do pacote a partir da classificação do contato:
 * - exatamente 1 produto marcado → usa ele;
 * - vários → o primeiro na ordem de `productOrder` (mesma ordem canônica de
 *   GET /api/materials, que já reflete PRODUCTS_ORDER do backend);
 * - nenhum → null (= legado, mídia kit fixo).
 */
export function pickDefaultProduct(
  classificacao: Record<string, string | null>,
  productOrder: string[],
): string | null {
  const active = productOrder.filter((key) => classificacao[key]);
  return active.length > 0 ? active[0] : null;
}

/**
 * Pré-seleção padrão de materiais: grupo "Institucional" + itens no idioma
 * escolhido (ou sem idioma, que servem para qualquer um). O operador pode
 * desmarcar/marcar manualmente depois — isso só define o estado inicial.
 */
export function defaultMaterialIds(
  groups: { name: string; items: MaterialItem[] }[],
  language: EmailLanguage,
): number[] {
  const materialLang = LANGUAGE_TO_MATERIAL_LANG[language];
  const ids: number[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const matchesGroup = group.name === "Institucional";
      const matchesLanguage = item.language === null || item.language === materialLang;
      if ((matchesGroup || matchesLanguage) && item.url) {
        ids.push(item.id);
      }
    }
  }
  return ids;
}
