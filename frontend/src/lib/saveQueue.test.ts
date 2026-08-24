import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import type { ContactData } from "./types";
import type { PendingSave } from "./pendingSaves";

const listPendingSaves = vi.fn();
const updatePendingSave = vi.fn();
const deletePendingSave = vi.fn();

vi.mock("./pendingSaves", () => ({
  SAVE_QUEUE_EVENT: "savequeue:changed",
  listPendingSaves: (...args: unknown[]) => listPendingSaves(...args),
  updatePendingSave: (...args: unknown[]) => updatePendingSave(...args),
  deletePendingSave: (...args: unknown[]) => deletePendingSave(...args),
}));

const saveContact = vi.fn();
vi.mock("./api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./api")>();
  return {
    ...mod,
    saveContact: (...args: unknown[]) => saveContact(...args),
    mergeContact: vi.fn(),
  };
});

const { flushSaveQueue } = await import("./saveQueue");

const CONTACT: ContactData = {
  name: "Fulano",
  phone: null,
  email: null,
  company: null,
  role: null,
  website: null,
  notes: null,
  source: "card_photo",
  event_tag: null,
  importance: null,
  tags: ["leilao:investidor"],
  email_language: "pt-BR",
};

function makeItem(overrides: Partial<PendingSave> = {}): PendingSave {
  return {
    id: "abc",
    contact: CONTACT,
    contact_id: 42,
    created_at: Date.now(),
    attempts: 0,
    ...overrides,
  };
}

describe("flushSaveQueue — 422 (needs_review)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mantém o item na fila (não descarta) e marca needs_review com a mensagem", async () => {
    const item = makeItem();
    listPendingSaves.mockResolvedValue([item]);
    saveContact.mockRejectedValueOnce(
      new ApiError("perfil 'investidor' inválido para 'leilao'", 422),
    );

    const result = await flushSaveQueue();

    expect(deletePendingSave).not.toHaveBeenCalled();
    expect(updatePendingSave).toHaveBeenCalledWith(
      "abc",
      expect.objectContaining({
        needs_review: true,
        last_error: "perfil 'investidor' inválido para 'leilao'",
      }),
    );
    expect(result.ok).toBe(0);
    expect(result.failed).toBe(1);
  });

  it("itens já marcados needs_review são pulados no flush automático", async () => {
    const item = makeItem({ needs_review: true, last_error: "antigo" });
    listPendingSaves.mockResolvedValue([item]);

    const result = await flushSaveQueue();

    expect(saveContact).not.toHaveBeenCalled();
    expect(result.ok).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("erro lógico que não é 422/401 continua descartando o item (comportamento existente)", async () => {
    const item = makeItem({ id: "xyz" });
    listPendingSaves.mockResolvedValue([item]);
    saveContact.mockRejectedValueOnce(new ApiError("Nome é obrigatório", 400));

    const result = await flushSaveQueue();

    expect(deletePendingSave).toHaveBeenCalledWith("xyz");
    expect(updatePendingSave).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });
});
