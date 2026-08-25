import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PackagePicker from "./PackagePicker";
import { MaterialsPayload, TemplatesPayload } from "@/lib/materials";

const MATERIALS: MaterialsPayload = {
  products: [
    {
      key: "cimi_360",
      label: "CIMI 360",
      groups: [
        {
          name: "Institucional",
          items: [
            { id: 1, label: "Kit PT", kind: "link", language: "PT", url: "https://x/kit-pt", meta: {}, sort_order: 1 },
            { id: 2, label: "Kit ENG", kind: "link", language: "ENG", url: "https://x/kit-en", meta: {}, sort_order: 2 },
          ],
        },
        {
          name: "Vídeos",
          items: [
            { id: 3, label: "Aftermovie", kind: "link", language: null, url: "https://x/after", meta: {}, sort_order: 1 },
          ],
        },
      ],
    },
    {
      key: "cimi_invest",
      label: "CIMI Invest",
      groups: [],
    },
  ],
};

const TEMPLATES: TemplatesPayload = {
  templates: [
    { id: 1, product_key: "cimi_360", name: "Texto padrão", body: "Olá {primeiro_nome}, sobre {produto}." },
  ],
};

function baseProps() {
  return {
    materialsData: MATERIALS,
    templatesData: TEMPLATES,
    selectedProduct: null as string | null,
    onProductChange: vi.fn(),
    selectedMaterialIds: [] as number[],
    onMaterialIdsChange: vi.fn(),
    selectedLanguage: "pt-BR" as const,
  };
}

describe("PackagePicker", () => {
  it("renderiza 'Nenhum' e produtos", () => {
    render(<PackagePicker {...baseProps()} />);
    expect(screen.getByText("Nenhum")).toBeInTheDocument();
    expect(screen.getByText("CIMI 360")).toBeInTheDocument();
    expect(screen.getByText("CIMI Invest")).toBeInTheDocument();
  });

  it("selecionar produto chama onProductChange e pré-marca materiais", () => {
    const onProductChange = vi.fn();
    const onMaterialIdsChange = vi.fn();
    render(
      <PackagePicker
        {...baseProps()}
        onProductChange={onProductChange}
        onMaterialIdsChange={onMaterialIdsChange}
      />,
    );

    fireEvent.click(screen.getByText("CIMI 360"));
    expect(onProductChange).toHaveBeenCalledWith("cimi_360");
    expect(onMaterialIdsChange).toHaveBeenCalledWith(expect.arrayContaining([1, 3]));
  });

  it("selecionar 'Nenhum' limpa materiais", () => {
    const onProductChange = vi.fn();
    const onMaterialIdsChange = vi.fn();
    render(
      <PackagePicker
        {...baseProps()}
        selectedProduct="cimi_360"
        selectedMaterialIds={[1, 3]}
        onProductChange={onProductChange}
        onMaterialIdsChange={onMaterialIdsChange}
      />,
    );

    fireEvent.click(screen.getByText("Nenhum"));
    expect(onProductChange).toHaveBeenCalledWith(null);
    expect(onMaterialIdsChange).toHaveBeenCalledWith([]);
  });

  it("mostra preview quando há produto selecionado", () => {
    render(
      <PackagePicker
        {...baseProps()}
        selectedProduct="cimi_360"
        selectedMaterialIds={[1]}
      />,
    );
    expect(screen.getByText(/Ver preview do e-mail/)).toBeInTheDocument();
  });

  it("hidePreview=true omite o preview", () => {
    render(
      <PackagePicker
        {...baseProps()}
        selectedProduct="cimi_360"
        selectedMaterialIds={[1]}
        hidePreview
      />,
    );
    expect(screen.queryByText(/Ver preview do e-mail/)).not.toBeInTheDocument();
  });
});
