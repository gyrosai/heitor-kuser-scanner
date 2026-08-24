import { describe, expect, it, vi } from "vitest";
import {
  classificacoesToTags,
  formatCsvColumns,
  getAllowedTags,
  getProductKeys,
  getProfileLabel,
  invalidateTaxonomyCache,
  isLegacyProfile,
  isValidProfile,
  parseClassificationTags,
  tagsToClassificacoes,
} from "./taxonomy";
import rawTaxonomy from "./taxonomy.json";

const TAXONOMY = rawTaxonomy as Parameters<typeof getProfileLabel>[0];

describe("taxonomy helpers", () => {
  it("getProductKeys returns 5 keys in order", () => {
    const keys = getProductKeys(TAXONOMY);
    expect(keys).toEqual([
      "cimi_360",
      "cimi_invest",
      "leilao",
      "indip",
      "feirao",
    ]);
  });

  it("getProfileLabel resolves correct labels", () => {
    expect(getProfileLabel(TAXONOMY, "cimi_invest", "investidor")).toBe(
      "Investidor",
    );
    expect(getProfileLabel(TAXONOMY, "leilao", "municipio")).toBe("Município");
    expect(getProfileLabel(TAXONOMY, "feirao", "t_e_i")).toBe("T&I");
  });

  it("isValidProfile accepts current profiles", () => {
    expect(isValidProfile(TAXONOMY, "cimi_invest", "investidor")).toBe(true);
    expect(isValidProfile(TAXONOMY, "cimi_invest", "parceria")).toBe(false); // legacy
  });

  it("isLegacyProfile detects old profiles", () => {
    expect(isLegacyProfile(TAXONOMY, "cimi_invest", "parceria")).toBe(true);
    expect(isLegacyProfile(TAXONOMY, "cimi_invest", "venda")).toBe(true);
    expect(isLegacyProfile(TAXONOMY, "cimi_invest", "investidor")).toBe(false);
  });

  it("parseClassificationTags extracts known products", () => {
    const tags = [
      "Patrocínio",
      "cimi_invest:investidor",
      "cimi_360:stand",
      "leilao:comprador",
      "desconhecido:foo",
    ];
    const parsed = parseClassificationTags(TAXONOMY, tags);
    expect(parsed).toEqual({
      cimi_invest: "investidor",
      cimi_360: "stand",
      leilao: "comprador",
    });
  });

  it("classificacoesToTags builds prefixed strings", () => {
    const tags = classificacoesToTags({
      cimi_invest: "investidor",
      cimi_360: null,
      leilao: "comprador",
    });
    expect(tags).toContain("cimi_invest:investidor");
    expect(tags).toContain("leilao:comprador");
    expect(tags).not.toContain("cimi_360:stand");
  });

  it("tagsToClassificacoes fills all known products", () => {
    const state = tagsToClassificacoes(TAXONOMY, ["cimi_invest:investidor"]);
    expect(state.cimi_invest).toBe("investidor");
    expect(state.cimi_360).toBeNull();
    expect(state.leilao).toBeNull();
    expect(state.indip).toBeNull();
    expect(state.feirao).toBeNull();
  });

  it("getAllowedTags includes interest types", () => {
    const tags = getAllowedTags(TAXONOMY);
    expect(tags).toContain("Instrutor");
    expect(tags).toContain("Palestrante");
    expect(tags).toContain("Associação");
  });

  it("formatCsvColumns builds produtos and perfis strings", () => {
    const { produtos, perfis } = formatCsvColumns({
      cimi_360: "stand",
      cimi_invest: "investidor",
      leilao: "comprador",
    });
    expect(produtos).toBe("CIMI 360; CIMI Invest; Leilão");
    expect(perfis).toBe(
      "CIMI 360: Stand; CIMI Invest: Investidor; Leilão: Comprador",
    );
  });

  it("formatCsvColumns handles legacy profile", () => {
    const { produtos, perfis } = formatCsvColumns({
      cimi_invest: "venda",
    });
    expect(produtos).toBe("CIMI Invest");
    expect(perfis).toBe("CIMI Invest: Venda");
  });
});

describe("taxonomy cache", () => {
  it("invalidateTaxonomyCache clears memory cache", () => {
    // não há cache em memória ainda, mas a função não deve lançar
    expect(() => invalidateTaxonomyCache()).not.toThrow();
  });
});
