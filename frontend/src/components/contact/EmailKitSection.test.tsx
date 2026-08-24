import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmailKitSection from "./EmailKitSection";
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
            {
              id: 1,
              label: "Mídia Kit PT",
              kind: "link",
              language: "PT",
              url: "https://x/kit-pt",
              meta: {},
              sort_order: 1,
            },
            {
              id: 2,
              label: "Mídia Kit ENG",
              kind: "link",
              language: "ENG",
              url: "https://x/kit-en",
              meta: {},
              sort_order: 2,
            },
          ],
        },
        {
          name: "Vídeos",
          items: [
            {
              id: 3,
              label: "Aftermovie",
              kind: "link",
              language: null,
              url: "https://x/after",
              meta: {},
              sort_order: 1,
            },
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
    contactEmail: "lead@example.com",
    contactName: "Fulano de Tal",
    checked: false,
    onCheckedChange: vi.fn(),
    selectedLanguage: "pt-BR" as const,
    onLanguageChange: vi.fn(),
  };
}

describe("EmailKitSection — sem contactEmail", () => {
  it("mostra aviso e não renderiza nada de pacote", () => {
    render(<EmailKitSection {...baseProps()} contactEmail={null} />);
    expect(screen.getByText(/Adicione um e-mail/)).toBeInTheDocument();
    expect(screen.queryByText("Nenhum")).not.toBeInTheDocument();
  });
});

describe("EmailKitSection — legado (sem materialsData)", () => {
  it("mantém o texto e comportamento originais quando materialsData não é passado", () => {
    render(<EmailKitSection {...baseProps()} />);
    expect(screen.getByText("Enviar Mídia Kit ao salvar")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum")).not.toBeInTheDocument();
  });
});

describe("EmailKitSection — seletor de produto", () => {
  it("renderiza os produtos e 'Nenhum' selecionado por padrão", () => {
    render(
      <EmailKitSection
        {...baseProps()}
        materialsData={MATERIALS}
        templatesData={TEMPLATES}
        selectedProduct={null}
        selectedMaterialIds={[]}
      />,
    );
    expect(screen.getByText("Nenhum")).toBeInTheDocument();
    expect(screen.getByText("CIMI 360")).toBeInTheDocument();
    expect(screen.getByText("CIMI Invest")).toBeInTheDocument();
    expect(screen.getByText("Enviar Mídia Kit ao salvar")).toBeInTheDocument();
  });

  it("selecionar um produto chama onProductChange e pré-marca materiais (Institucional + idioma)", () => {
    const onProductChange = vi.fn();
    const onMaterialIdsChange = vi.fn();
    render(
      <EmailKitSection
        {...baseProps()}
        materialsData={MATERIALS}
        templatesData={TEMPLATES}
        selectedProduct={null}
        selectedMaterialIds={[]}
        onProductChange={onProductChange}
        onMaterialIdsChange={onMaterialIdsChange}
      />,
    );

    fireEvent.click(screen.getByText("CIMI 360"));

    expect(onProductChange).toHaveBeenCalledWith("cimi_360");
    // Institucional inteiro (1, 2) + idioma-neutro (3) — grupo Institucional some
    // independente do idioma, e o item sem idioma também entra.
    expect(onMaterialIdsChange).toHaveBeenCalledWith(expect.arrayContaining([1, 2, 3]));
  });

  it("checkbox muda para 'Enviar pacote ao salvar' quando há produto selecionado", () => {
    render(
      <EmailKitSection
        {...baseProps()}
        materialsData={MATERIALS}
        templatesData={TEMPLATES}
        selectedProduct="cimi_360"
        selectedMaterialIds={[1, 2, 3]}
      />,
    );
    expect(screen.getByText("Enviar pacote ao salvar")).toBeInTheDocument();
    expect(screen.queryByText("Enviar Mídia Kit ao salvar")).not.toBeInTheDocument();
  });

  it("mostra a lista de materiais do produto com contador de itens", () => {
    render(
      <EmailKitSection
        {...baseProps()}
        materialsData={MATERIALS}
        templatesData={TEMPLATES}
        selectedProduct="cimi_360"
        selectedMaterialIds={[1, 3]}
      />,
    );
    expect(screen.getByText("Materiais · 2 itens")).toBeInTheDocument();
    expect(screen.getByText("Institucional")).toBeInTheDocument();
    expect(screen.getByText(/Mídia Kit PT/)).toBeInTheDocument();
    expect(screen.getByText("Aftermovie")).toBeInTheDocument();
  });

  it("desmarcar produto ('Nenhum') limpa os materiais selecionados", () => {
    const onProductChange = vi.fn();
    const onMaterialIdsChange = vi.fn();
    render(
      <EmailKitSection
        {...baseProps()}
        materialsData={MATERIALS}
        templatesData={TEMPLATES}
        selectedProduct="cimi_360"
        selectedMaterialIds={[1, 2, 3]}
        onProductChange={onProductChange}
        onMaterialIdsChange={onMaterialIdsChange}
      />,
    );
    fireEvent.click(screen.getByText("Nenhum"));
    expect(onProductChange).toHaveBeenCalledWith(null);
    expect(onMaterialIdsChange).toHaveBeenCalledWith([]);
  });
});

describe("EmailKitSection — preview", () => {
  it("preview colapsado por padrão; abre e mostra texto sem placeholder cru", () => {
    render(
      <EmailKitSection
        {...baseProps()}
        materialsData={MATERIALS}
        templatesData={TEMPLATES}
        selectedProduct="cimi_360"
        selectedMaterialIds={[1]}
      />,
    );
    expect(screen.queryByText(/Olá Fulano/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Ver preview do e-mail"));
    expect(screen.getByText(/Olá Fulano, sobre CIMI 360\./)).toBeInTheDocument();
  });
});

describe("EmailKitSection — sem e-mail no contato desabilita", () => {
  it("não mostra seletor de produto quando não há e-mail, mesmo com materialsData", () => {
    render(
      <EmailKitSection
        {...baseProps()}
        contactEmail={null}
        materialsData={MATERIALS}
        templatesData={TEMPLATES}
      />,
    );
    expect(screen.queryByText("CIMI 360")).not.toBeInTheDocument();
  });
});

describe("EmailKitSection — status sent com pacote", () => {
  it("mostra banner de enviado e ainda permite reconfigurar produto antes de reenviar", () => {
    const onResend = vi.fn();
    render(
      <EmailKitSection
        {...baseProps()}
        emailStatus="sent"
        emailSentAt="2026-08-24T18:00:00Z"
        materialsData={MATERIALS}
        templatesData={TEMPLATES}
        selectedProduct="cimi_360"
        selectedMaterialIds={[1]}
        onResend={onResend}
      />,
    );
    expect(screen.getByText("Mídia Kit enviado")).toBeInTheDocument();
    expect(screen.getByText("CIMI 360")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reenviar"));
    expect(onResend).toHaveBeenCalled();
  });
});
