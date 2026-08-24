import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContactEditor from "./ContactEditor";
import { ApiError } from "@/lib/api";
import type { ContactRecord } from "@/lib/types";

const RECORD: ContactRecord = {
  id: 1,
  name: "Fulano de Tal",
  phone: null,
  email: null,
  company: null,
  role: null,
  website: null,
  notes: null,
  source: "card_photo",
  event_tag: null,
  importance: null,
  tags: [],
  email_language: "pt-BR",
  scanned_at: "2026-08-24T12:00:00Z",
  has_image: false,
};

const showToast = vi.fn();
const updateContact = vi.fn();
const sendMediaKit = vi.fn(async () => ({ status: "sent" }));

// vi.hoisted: vi.mock é hoisted pro topo do arquivo, então os objetos
// mutáveis que os testes configuram por caso (contato/materiais/templates)
// precisam nascer junto, senão vira TDZ ("Cannot access before initialization").
const materialsState = vi.hoisted(() => ({
  materials: { products: [] as import("@/lib/materials").MaterialProduct[] },
  templates: { templates: [] as import("@/lib/materials").MessageTemplate[] },
}));

const contactState = vi.hoisted(() => ({ record: null as unknown }));
contactState.record = RECORD;

vi.mock("./Toast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("@/providers/NetworkProvider", () => ({
  useNetworkStatus: () => ({ online: true }),
}));

// ClassificacaoSection busca taxonomia via rede — mockado pra não depender de fetch.
vi.mock("@/lib/taxonomy", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/taxonomy")>();
  return { ...mod, getTaxonomyCached: vi.fn(async () => ({ products: [], legacy_profiles: {}, interest_types: [] })) };
});

// EmailKitSection busca materiais/templates via rede — mockado pra não depender de fetch.
vi.mock("@/lib/materials", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/materials")>();
  return {
    ...mod,
    getMaterialsCached: vi.fn(async () => ({ materials: materialsState.materials, offline: false })),
    getTemplatesCached: vi.fn(async () => ({ templates: materialsState.templates, offline: false })),
  };
});

vi.mock("@/lib/api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...mod,
    getContact: vi.fn(async () => contactState.record as ContactRecord),
    updateContact: (...args: unknown[]) => updateContact(...args),
    sendMediaKit: (...args: Parameters<typeof sendMediaKit>) => sendMediaKit(...args),
    syncContactToGoogle: vi.fn(),
    deleteContact: vi.fn(),
  };
});

describe("ContactEditor — 422 no save direto", () => {
  afterEach(() => {
    vi.clearAllMocks();
    contactState.record = RECORD;
    materialsState.materials = { products: [] };
    materialsState.templates = { templates: [] };
  });

  it("mostra a mensagem do backend e mantém o formulário editável (não navega, não limpa)", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    updateContact.mockRejectedValueOnce(
      new ApiError("perfil 'investidor' inválido para 'leilao'", 422),
    );

    render(
      <ContactEditor
        contactId={1}
        onClose={onClose}
        onSaved={onSaved}
        onDeleted={vi.fn()}
      />,
    );

    const nameInput = await screen.findByLabelText(/^Nome/);
    fireEvent.change(nameInput, { target: { value: "Nome Editado" } });

    const saveButton = screen.getByRole("button", { name: "Salvar alterações" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        "perfil 'investidor' inválido para 'leilao'",
        "error",
      );
    });

    // Não navega/fecha nem sinaliza sucesso — formulário continua na tela e editável.
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Nome/)).toHaveValue("Nome Editado");
  });
});

describe("ContactEditor — pacote de materiais / Reenviar", () => {
  afterEach(() => {
    vi.clearAllMocks();
    contactState.record = RECORD;
    materialsState.materials = { products: [] };
    materialsState.templates = { templates: [] };
  });

  it("pré-seleciona o produto único da classificação e Reenviar chama sendMediaKit com o pacote", async () => {
    contactState.record = {
      ...RECORD,
      email: "lead@example.com",
      tags: ["cimi_360:stand"],
      email_status: "sent",
      email_sent_at: "2026-08-24T18:00:00Z",
    };
    materialsState.materials = {
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
                  url: "https://x/kit",
                  meta: {},
                  sort_order: 1,
                },
              ],
            },
          ],
        },
      ],
    };
    materialsState.templates = {
      templates: [
        { id: 9, product_key: "cimi_360", name: "Texto padrão", body: "Olá {primeiro_nome}." },
      ],
    };

    render(
      <ContactEditor contactId={1} onClose={vi.fn()} onSaved={vi.fn()} onDeleted={vi.fn()} />,
    );

    // Produto pré-selecionado (classificação tem só cimi_360) — chip ativo aparece,
    // e o checklist de materiais dele já é mostrado.
    await screen.findByText("Mídia Kit PT (PT)");

    fireEvent.click(screen.getByText("Reenviar"));

    await waitFor(() => {
      expect(sendMediaKit).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          package: { product_key: "cimi_360", material_ids: [1] },
        }),
      );
    });
  });
});
