import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, saveContact } from "./api";
import type { ContactData } from "./types";

const CONTACT: ContactData = {
  name: "Teste",
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

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

describe("saveContact — 422 (save direto)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("propaga a mensagem real do backend (formato de erro do Pydantic)", async () => {
    mockFetchOnce(422, {
      detail: [
        {
          type: "value_error",
          loc: ["body", "tags"],
          msg: "Value error, perfil 'investidor' inválido para 'leilao'",
        },
      ],
    });

    await expect(saveContact(CONTACT)).rejects.toMatchObject({
      message: "perfil 'investidor' inválido para 'leilao'",
    });
  });

  it("lança ApiError (não NetworkError) — não deve entrar na fila de retry", async () => {
    mockFetchOnce(422, {
      detail: [{ msg: "Value error, campo inválido" }],
    });

    await expect(saveContact(CONTACT)).rejects.toBeInstanceOf(ApiError);
  });

  it("junta múltiplas mensagens de validação", async () => {
    mockFetchOnce(422, {
      detail: [
        { msg: "Value error, perfil inválido para 'leilao'" },
        { msg: "Value error, produto 'xyz' desconhecido" },
      ],
    });

    await expect(saveContact(CONTACT)).rejects.toMatchObject({
      message:
        "perfil inválido para 'leilao'; produto 'xyz' desconhecido",
    });
  });

  it("usa detail como string diretamente quando não é array", async () => {
    mockFetchOnce(422, { detail: "Nome é obrigatório" });

    await expect(saveContact(CONTACT)).rejects.toMatchObject({
      message: "Nome é obrigatório",
    });
  });
});
