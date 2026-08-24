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

vi.mock("@/lib/api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...mod,
    getContact: vi.fn(async () => RECORD),
    updateContact: (...args: unknown[]) => updateContact(...args),
    sendMediaKit: vi.fn(),
    syncContactToGoogle: vi.fn(),
    deleteContact: vi.fn(),
  };
});

describe("ContactEditor — 422 no save direto", () => {
  afterEach(() => {
    vi.clearAllMocks();
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
