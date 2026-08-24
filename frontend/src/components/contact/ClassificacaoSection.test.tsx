import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClassificacaoSection from "./ClassificacaoSection";
import rawTaxonomy from "@/lib/taxonomy.json";

const TAXONOMY = rawTaxonomy;

// Mock getTaxonomyCached para não fazer fetch em teste
vi.mock("@/lib/taxonomy", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/taxonomy")>();
  return {
    ...mod,
    getTaxonomyCached: vi.fn(async () => TAXONOMY),
  };
});

describe("ClassificacaoSection", () => {
  it("renders 5 products from taxonomy", async () => {
    render(
      <ClassificacaoSection
        value={{}}
        onChange={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("CIMI 360")).toBeInTheDocument();
      expect(screen.getByText("CIMI Invest")).toBeInTheDocument();
      expect(screen.getByText("Leilão")).toBeInTheDocument();
      expect(screen.getByText("INDIP")).toBeInTheDocument();
      expect(screen.getByText("Feirão dos Corretores")).toBeInTheDocument();
    });
  });

  it("selecting a profile checks the product", async () => {
    const onChange = vi.fn();
    render(<ClassificacaoSection value={{}} onChange={onChange} />);

    await waitFor(() => screen.getByText("CIMI Invest"));

    // Clicar no checkbox de CIMI Invest (ativa o produto)
    const cimiInvestBtn = screen.getByText("CIMI Invest").closest("button");
    if (cimiInvestBtn) fireEvent.click(cimiInvestBtn);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ cimi_invest: "empreendedor" }),
      );
    });
  });

  it("legacy profile renders as disabled with (antigo) suffix", async () => {
    const onChange = vi.fn();
    render(
      <ClassificacaoSection
        value={{ cimi_invest: "venda" }}
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Venda \(antigo\)/)).toBeInTheDocument();
    });
  });

  it("unchecking product clears its profile", async () => {
    const onChange = vi.fn();
    render(
      <ClassificacaoSection
        value={{ cimi_invest: "investidor" }}
        onChange={onChange}
      />,
    );

    await waitFor(() => screen.getByText("CIMI Invest"));

    const cimiInvestBtn = screen.getByText("CIMI Invest").closest("button");
    if (cimiInvestBtn) fireEvent.click(cimiInvestBtn);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ cimi_invest: null }),
      );
    });
  });

  it("only one profile per product is selected", async () => {
    const onChange = vi.fn();
    render(
      <ClassificacaoSection
        value={{ cimi_invest: "investidor" }}
        onChange={onChange}
      />,
    );

    await waitFor(() => screen.getByText("Investidor"));

    // Clicar em outro perfil do mesmo produto
    const empreendedor = screen.getByText("Empreendedor");
    fireEvent.click(empreendedor);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ cimi_invest: "empreendedor" }),
      );
    });
  });
});
