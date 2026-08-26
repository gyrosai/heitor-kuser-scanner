import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, listContacts, saveContact } from "./api";
import { ApiConflictError } from "./types";
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

describe("listContacts — contrato de resposta", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sem include_imported: retorna array puro (contrato legado)", async () => {
    mockFetchOnce(200, [{ id: 1, name: "A" }]);
    const out = await listContacts();
    expect(Array.isArray(out)).toBe(true);
    expect(out).toHaveLength(1);
  });

  it("include_imported=true: retorna {contacts, total} e envia o param", async () => {
    const fetchMock = vi.fn(
      async (): Promise<Response> =>
        new Response(
          JSON.stringify({ contacts: [{ id: 1, source: "base_heitor" }], total: 42 }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await listContacts({ include_imported: true });

    expect(out).toMatchObject({ total: 42 });
    expect(Array.isArray(out.contacts)).toBe(true);
    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])?.[0]);
    expect(calledUrl).toContain("include_imported=true");
  });
});

describe("saveContact — 409 duplicata", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("propaga match_type='imported' no ApiConflictError (base do Heitor)", async () => {
    mockFetchOnce(409, {
      detail: {
        existing: { id: 50, name: "Lead" },
        existing_id: 50,
        new: { name: "Lead" },
        match_type: "imported",
      },
    });

    try {
      await saveContact(CONTACT, 1);
      throw new Error("deveria ter lançado");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiConflictError);
      expect((err as ApiConflictError).conflict.match_type).toBe("imported");
    }
  });
});
