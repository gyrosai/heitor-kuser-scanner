import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SequenceKitConfig from "./SequenceKitConfig";

vi.mock("@/lib/materials", () => ({
  getMaterialsCached: vi.fn(async () => ({
    materials: {
      products: [
        {
          key: "cimi_360",
          label: "CIMI 360",
          groups: [
            {
              name: "Institucional",
              items: [
                { id: 1, label: "Kit", kind: "link", language: "PT", url: "https://x", meta: {}, sort_order: 1 },
              ],
            },
          ],
        },
      ],
    },
    offline: false,
  })),
  getTemplatesCached: vi.fn(async () => ({
    templates: [],
    offline: false,
  })),
  invalidateMaterialsCache: vi.fn(),
}));

const onStart = vi.fn();
const onSkip = vi.fn();
const onBack = vi.fn();

function renderComponent(quota: { remaining: number } | null = { remaining: 10 }) {
  return render(
    <SequenceKitConfig
      contactCount={3}
      emailQuota={quota}
      onStart={onStart}
      onSkip={onSkip}
      onBack={onBack}
    />,
  );
}

describe("SequenceKitConfig", () => {
  beforeEach(() => {
    onStart.mockClear();
    onSkip.mockClear();
    onBack.mockClear();
  });

  it("renderiza contagem e botões", async () => {
    renderComponent();
    expect(await screen.findByText(/3 contatos/)).toBeInTheDocument();
    expect(screen.getByText("Começar revisão")).toBeInTheDocument();
  });

  it("onStart inclui defaultProduct=null e defaultMaterialIds=[] por padrão", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText("CIMI 360")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Começar revisão"));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        sendKit: true,
        language: "pt-BR",
        conflictStrategy: "replace",
        defaultProduct: null,
        defaultMaterialIds: [],
      }),
    );
  });

  it("selecionar produto padrão passa defaultProduct no onStart", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText("CIMI 360")).toBeInTheDocument());
    fireEvent.click(screen.getByText("CIMI 360"));
    fireEvent.click(screen.getByText("Começar revisão"));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultProduct: "cimi_360",
        defaultMaterialIds: expect.arrayContaining([1]),
      }),
    );
  });

  it("onSkip zera defaultProduct e defaultMaterialIds", async () => {
    renderComponent();
    fireEvent.click(screen.getByText(/Pular envio/));
    expect(onSkip).toHaveBeenCalled();
  });
});
