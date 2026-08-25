import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE_BODY,
  MAX_MATERIAL_LINKS,
  defaultMaterialIds,
  pickDefaultProduct,
  previewPackage,
} from "./package";
import { MaterialItem } from "./materials";
import { EmailLanguage } from "./types";

function makeMaterial(overrides: Partial<MaterialItem> & { id: number; label: string }): MaterialItem {
  return {
    id: overrides.id,
    label: overrides.label,
    kind: overrides.kind ?? "link",
    language: overrides.language ?? null,
    url: "url" in overrides ? overrides.url ?? null : "https://example.com",
    meta: overrides.meta ?? {},
    sort_order: overrides.sort_order ?? 0,
  };
}

describe("previewPackage — placeholders", () => {
  it("resolves all placeholders with no raw braces / undefined", () => {
    const result = previewPackage({
      contactName: "Maria Souza",
      eventTag: "CIMI360",
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [],
      materials: [],
      templateBody: "Olá {primeiro_nome}, foi um prazer no {evento} falar sobre {produto}.",
    });
    expect(result.text).toBe("Olá Maria, foi um prazer no CIMI360 falar sobre CIMI 360.");
    expect(result.text).not.toContain("{");
    expect(result.text.toLowerCase()).not.toContain("undefined");
  });

  it("removes missing placeholder cleanly, no double space, no stray space before punctuation", () => {
    const result = previewPackage({
      contactName: "Ana",
      eventTag: null,
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [],
      materials: [],
      templateBody: "Olá {primeiro_nome}, foi um prazer no {evento}.",
    });
    expect(result.text).not.toContain("{evento}");
    expect(result.text).not.toContain("  ");
    expect(result.text).not.toContain(" .");
    expect(result.text.toLowerCase()).not.toContain("undefined");
  });

  it("missing name renders empty, not 'undefined'", () => {
    const result = previewPackage({
      contactName: null,
      eventTag: "CIMI2026",
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [],
      materials: [],
      templateBody: "Olá {primeiro_nome}, tudo bem?",
    });
    expect(result.text).toBe("Olá, tudo bem?");
  });
});

describe("previewPackage — filtro de idioma", () => {
  it("filters by language pt-BR -> PT, keeps language-agnostic items", () => {
    const materials = [
      makeMaterial({ id: 1, label: "Kit PT", language: "PT" }),
      makeMaterial({ id: 2, label: "Kit ENG", language: "ENG" }),
      makeMaterial({ id: 3, label: "Universal", language: null }),
    ];
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [1, 2, 3],
      materials,
      templateBody: "Corpo.",
    });
    expect(result.materialIdsUsed).toEqual([1, 3]);
    expect(result.warnings.some((w) => w.includes("idioma"))).toBe(true);
  });

  it("filters by language en -> ENG", () => {
    const materials = [
      makeMaterial({ id: 1, label: "Kit PT", language: "PT" }),
      makeMaterial({ id: 2, label: "Kit ENG", language: "ENG" }),
    ];
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "en",
      materialIds: [1, 2],
      materials,
      templateBody: "Body.",
    });
    expect(result.materialIdsUsed).toEqual([2]);
  });

  it("filters by language es -> ESP", () => {
    const materials = [
      makeMaterial({ id: 1, label: "Kit ESP", language: "ESP" }),
      makeMaterial({ id: 2, label: "Kit ENG", language: "ENG" }),
    ];
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "es",
      materialIds: [1, 2],
      materials,
      templateBody: "Cuerpo.",
    });
    expect(result.materialIdsUsed).toEqual([1]);
  });
});

describe("previewPackage — materiais inválidos", () => {
  it("ignores material without url", () => {
    const materials = [makeMaterial({ id: 1, label: "Sem url", url: null })];
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [1],
      materials,
      templateBody: "Corpo.",
    });
    expect(result.materialIdsUsed).toEqual([]);
    expect(result.warnings.some((w) => w.includes("sem url"))).toBe(true);
  });

  it("ignores unknown material id", () => {
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [999],
      materials: [],
      templateBody: "Corpo.",
    });
    expect(result.materialIdsUsed).toEqual([]);
    expect(result.warnings.some((w) => w.includes("não encontrado"))).toBe(true);
  });

  it("cuts at MAX_MATERIAL_LINKS with warning", () => {
    const materials = Array.from({ length: 14 }, (_, i) =>
      makeMaterial({ id: i + 1, label: `Item ${i + 1}` }),
    );
    const ids = materials.map((m) => m.id);
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: ids,
      materials,
      templateBody: "Corpo.",
    });
    expect(result.materialIdsUsed).toHaveLength(MAX_MATERIAL_LINKS);
    expect(result.materialIdsUsed).toEqual(ids.slice(0, MAX_MATERIAL_LINKS));
    expect(result.warnings.some((w) => w.includes("mais de 10"))).toBe(true);
  });
});

describe("previewPackage — formatação", () => {
  it("one line per material: label — url", () => {
    const materials = [
      makeMaterial({ id: 1, label: "Mídia Kit", url: "https://x/kit" }),
      makeMaterial({ id: 2, label: "Vídeo", url: "https://x/video" }),
    ];
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [1, 2],
      materials,
      templateBody: "Segue material.",
    });
    expect(result.text).toContain("Mídia Kit — https://x/kit");
    expect(result.text).toContain("Vídeo — https://x/video");
  });

  it("evento material includes date and location", () => {
    const materials = [
      makeMaterial({
        id: 1,
        label: "Missão Dubai",
        kind: "evento",
        url: "https://x/dubai",
        meta: { date: "2026-10-01", location: "Dubai" },
      }),
    ];
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [1],
      materials,
      templateBody: "Segue.",
    });
    expect(result.text).toContain("Missão Dubai (2026-10-01 — Dubai)");
    expect(result.html).toContain("Missão Dubai (2026-10-01 — Dubai)");
  });

  it("html has paragraphs and links, no raw placeholder", () => {
    const materials = [makeMaterial({ id: 1, label: "Kit", url: "https://x/kit" })];
    const result = previewPackage({
      contactName: "Bia",
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [1],
      materials,
      templateBody: "Olá {primeiro_nome}.\n\nSegue o kit.",
    });
    expect(result.html).toContain("<p>Olá Bia.</p>");
    expect(result.html).toContain("<p>Segue o kit.</p>");
    expect(result.html).toContain('<a href="https://x/kit">Kit</a>');
    expect(result.html).not.toContain("{");
  });

  it("zero materials still renders body", () => {
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [],
      materials: [],
      templateBody: "Só o corpo, sem materiais.",
    });
    expect(result.text).toBe("Só o corpo, sem materiais.");
    expect(result.materialIdsUsed).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe("previewPackage — template ausente (fallback genérico)", () => {
  it.each([
    ["pt-BR", "prazer"],
    ["en", "pleasure"],
    ["es", "placer"],
  ] as [EmailLanguage, string][])(
    "usa DEFAULT_TEMPLATE_BODY[%s] quando templateBody é null e reporta usedGenericTemplate",
    (language, snippet) => {
      const result = previewPackage({
        contactName: "Ana Souza",
        eventTag: "CIMI2026",
        productLabel: "CIMI Invest",
        language,
        materialIds: [],
        materials: [],
        templateBody: null,
      });
      expect(result.usedGenericTemplate).toBe(true);
      expect(result.text.toLowerCase()).toContain(snippet);
      expect(result.text).not.toContain("{");
      expect(result.warnings).toContain("template padrão usado");
    },
  );

  it("templateBody vazio/whitespace também usa o fallback genérico", () => {
    const result = previewPackage({
      contactName: "Ana Souza",
      eventTag: "CIMI2026",
      productLabel: "CIMI Invest",
      language: "pt-BR",
      materialIds: [],
      materials: [],
      templateBody: "   ",
    });
    expect(result.usedGenericTemplate).toBe(true);
    expect(result.text).toBe(
      "Olá, Ana, foi um prazer estar com você no CIMI2026. Seguem os materiais:",
    );
  });

  it("templateBody presente não usa o fallback", () => {
    const result = previewPackage({
      productLabel: "CIMI 360",
      language: "pt-BR",
      materialIds: [],
      materials: [],
      templateBody: "Corpo customizado.",
    });
    expect(result.usedGenericTemplate).toBe(false);
    expect(result.text).toBe("Corpo customizado.");
    expect(result.warnings).not.toContain("template padrão usado");
  });

  it("DEFAULT_TEMPLATE_BODY cobre os 3 idiomas com o placeholder {evento}", () => {
    (["pt-BR", "en", "es"] as EmailLanguage[]).forEach((language) => {
      expect(DEFAULT_TEMPLATE_BODY[language]).toContain("{evento}");
      expect(DEFAULT_TEMPLATE_BODY[language]).toContain("{primeiro_nome}");
    });
  });
});

describe("pickDefaultProduct", () => {
  const ORDER = ["cimi_360", "cimi_invest", "leilao", "indip", "feirao"];

  it("returns the single classified product", () => {
    const result = pickDefaultProduct({ cimi_360: null, cimi_invest: "investidor" }, ORDER);
    expect(result).toBe("cimi_invest");
  });

  it("returns the first in canonical order when multiple are classified", () => {
    const result = pickDefaultProduct(
      { cimi_360: null, leilao: "comprador", cimi_invest: "investidor" },
      ORDER,
    );
    expect(result).toBe("cimi_invest");
  });

  it("returns null when no product is classified", () => {
    const result = pickDefaultProduct({ cimi_360: null, cimi_invest: null }, ORDER);
    expect(result).toBeNull();
  });
});

describe("defaultMaterialIds", () => {
  it("preselects Institucional group and items in the chosen language", () => {
    const groups = [
      {
        name: "Institucional",
        items: [
          makeMaterial({ id: 1, label: "Institucional PT", language: "PT" }),
          makeMaterial({ id: 2, label: "Institucional ENG", language: "ENG" }),
        ],
      },
      {
        name: "Vídeos",
        items: [
          makeMaterial({ id: 3, label: "Vídeo PT", language: "PT" }),
          makeMaterial({ id: 4, label: "Vídeo ENG", language: "ENG" }),
          makeMaterial({ id: 5, label: "Vídeo universal", language: null }),
        ],
      },
    ];
    const ids = defaultMaterialIds(groups, "pt-BR");
    // Institucional inteiro (1 e 2, mesmo em ENG) + itens PT/universal de outros grupos
    expect(ids).toEqual(expect.arrayContaining([1, 2, 3, 5]));
    expect(ids).not.toContain(4);
  });

  it("skips items without url even if they match the group/language", () => {
    const groups = [
      {
        name: "Institucional",
        items: [makeMaterial({ id: 1, label: "Sem url", url: null })],
      },
    ];
    expect(defaultMaterialIds(groups, "pt-BR")).toEqual([]);
  });
});
