import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MateriaisPage from "./page";
import type { MaterialsResult } from "@/lib/materials";

const getMaterialsCached = vi.fn();

vi.mock("@/lib/materials", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/materials")>();
  return { ...mod, getMaterialsCached: () => getMaterialsCached() };
});

const SAMPLE: MaterialsResult = {
  offline: false,
  materials: {
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
                label: "Mídia Kit",
                kind: "link",
                language: "PT",
                url: "https://example.com/kit",
                meta: {},
                sort_order: 1,
              },
              {
                id: 2,
                label: "Aftermovie",
                kind: "link",
                language: "ENG",
                url: "https://example.com/movie",
                meta: {},
                sort_order: 2,
              },
            ],
          },
        ],
      },
    ],
  },
};

beforeEach(() => {
  getMaterialsCached.mockReset();
});

describe("MateriaisPage", () => {
  it("renderiza materiais agrupados por produto e grupo", async () => {
    getMaterialsCached.mockResolvedValue(SAMPLE);
    render(<MateriaisPage />);

    await waitFor(() => {
      expect(screen.getByText("CIMI 360")).toBeInTheDocument();
    });
    expect(screen.getByText("Institucional")).toBeInTheDocument();
    expect(screen.getByText("Mídia Kit")).toBeInTheDocument();
    expect(screen.getByText("Aftermovie")).toBeInTheDocument();

    // link clicável
    const link = screen.getByText("Mídia Kit").closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/kit");
  });

  it("mostra badge de idioma", async () => {
    getMaterialsCached.mockResolvedValue(SAMPLE);
    render(<MateriaisPage />);

    await waitFor(() => {
      expect(screen.getByText("PT")).toBeInTheDocument();
    });
    expect(screen.getByText("ENG")).toBeInTheDocument();
  });

  it("conta itens ativos por produto", async () => {
    getMaterialsCached.mockResolvedValue(SAMPLE);
    render(<MateriaisPage />);

    await waitFor(() => {
      expect(screen.getByText("2 ativos")).toBeInTheDocument();
    });
  });

  it("lista vazia offline não quebra a tela", async () => {
    getMaterialsCached.mockResolvedValue({
      offline: true,
      materials: { products: [] },
    });
    render(<MateriaisPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum material disponível no momento."),
      ).toBeInTheDocument();
    });
    // aviso de cache/offline aparece
    expect(
      screen.getByText(/exibindo a última lista salva/i),
    ).toBeInTheDocument();
  });
});
