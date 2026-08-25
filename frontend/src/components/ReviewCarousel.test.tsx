import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewCarousel from "./ReviewCarousel";

// Mocks
vi.mock("@/lib/pendingScans", () => ({
  listPendingScans: vi.fn(async () => []),
  getPendingScan: vi.fn(async () => undefined),
  updatePendingScan: vi.fn(async () => {}),
  deletePendingScan: vi.fn(async () => {}),
}));

vi.mock("@/lib/api", () => ({
  saveContact: vi.fn(async () => {}),
  mergeContact: vi.fn(async () => ({})),
}));

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
        {
          key: "cimi_invest",
          label: "CIMI Invest",
          groups: [],
        },
      ],
    },
    offline: false,
  })),
  getTemplatesCached: vi.fn(async () => ({
    templates: [],
    offline: false,
  })),
}));

vi.mock("./Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock(import("@/lib/taxonomy"), async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/taxonomy")>();
  return {
    ...actual,
    getTaxonomyCached: vi.fn(async () => ({
      interest_types: ["Patrocínio", "Palestrante", "Parceria", "Cliente", "Mídia", "Follow-up"],
      products: [
        { key: "cimi_360", label: "CIMI 360", profiles: ["Stand", "Patrocínio"] },
        { key: "cimi_invest", label: "CIMI Invest", profiles: ["Parceria", "Venda"] },
      ],
      legacy_profiles: {
        cimi_invest: [
          { slug: "parceria", label: "Parceria" },
          { slug: "venda", label: "Venda" },
        ],
      },
    })),
  };
});

const { listPendingScans } = await import("@/lib/pendingScans");
const { saveContact } = await import("@/lib/api");

describe("ReviewCarousel — pacote de materiais", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("aplica padrão do lote a todos os itens", async () => {
    (listPendingScans as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: "scan-1",
        status: "processed",
        extracted_data: { name: "A", tags: [], email_language: "pt-BR" },
        created_at: 1,
      },
      {
        id: "scan-2",
        status: "processed",
        extracted_data: { name: "B", tags: [], email_language: "pt-BR" },
        created_at: 2,
      },
    ]);

    render(
      <ReviewCarousel
        sequenceEmailConfig={{
          sendKit: true,
          language: "pt-BR",
          conflictStrategy: "replace",
          defaultProduct: "cimi_360",
          defaultMaterialIds: [1],
        }}
        onClose={vi.fn()}
        onOpenList={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText(/Revisar contatos/)).toBeInTheDocument());
    expect(screen.getByText("CIMI 360")).toBeInTheDocument();
  });

  it('sem produto padrão exibe "Mídia Kit fixo (legado)"', async () => {
    (listPendingScans as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: "scan-1",
        status: "processed",
        extracted_data: { name: "A", tags: [], email_language: "pt-BR" },
        created_at: 1,
      },
    ]);

    render(
      <ReviewCarousel
        sequenceEmailConfig={{
          sendKit: true,
          language: "pt-BR",
          conflictStrategy: "replace",
          defaultProduct: null,
          defaultMaterialIds: [],
        }}
        onClose={vi.fn()}
        onOpenList={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText(/Mídia Kit fixo/)).toBeInTheDocument());
  });

  it("salvar envia package no payload quando há produto", async () => {
    (listPendingScans as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: "scan-1",
        status: "processed",
        extracted_data: { name: "A", email: "a@x.com", tags: [], email_language: "pt-BR" },
        created_at: 1,
      },
    ]);

    render(
      <ReviewCarousel
        sequenceEmailConfig={{
          sendKit: true,
          language: "pt-BR",
          conflictStrategy: "replace",
          defaultProduct: "cimi_360",
          defaultMaterialIds: [1],
        }}
        onClose={vi.fn()}
        onOpenList={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText(/Salvar e finalizar/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Salvar e finalizar/));

    await waitFor(() => {
      expect(saveContact).toHaveBeenCalled();
    });

    const payload = (saveContact as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.package).toEqual({
      product_key: "cimi_360",
      material_ids: expect.arrayContaining([1]),
      template_id: null,
    });
  });

  it("salvar sem produto não inclui package no payload", async () => {
    (listPendingScans as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: "scan-1",
        status: "processed",
        extracted_data: { name: "A", email: "a@x.com", tags: [], email_language: "pt-BR" },
        created_at: 1,
      },
    ]);

    render(
      <ReviewCarousel
        sequenceEmailConfig={{
          sendKit: true,
          language: "pt-BR",
          conflictStrategy: "replace",
          defaultProduct: null,
          defaultMaterialIds: [],
        }}
        onClose={vi.fn()}
        onOpenList={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText(/Salvar e finalizar/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Salvar e finalizar/));

    await waitFor(() => {
      expect(saveContact).toHaveBeenCalled();
    });

    const payload = (saveContact as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.package).toBeUndefined();
  });
});
