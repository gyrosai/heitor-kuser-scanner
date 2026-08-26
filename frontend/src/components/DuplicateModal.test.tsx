import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DuplicateModal from "./DuplicateModal";
import type { ContactData, ContactRecord } from "@/lib/types";

vi.mock("./CardImagePreview", () => ({
  default: () => <div data-testid="card-image" />,
}));

const EXISTING: ContactRecord = {
  id: 50,
  name: "Lead Existente",
  phone: "+5511987654321",
  email: "lead@example.com",
  company: null,
  role: null,
  website: null,
  notes: null,
  source: "base_heitor",
  event_tag: null,
  importance: null,
  tags: [],
  email_language: "pt-BR",
  scanned_at: "2026-08-24T12:00:00Z",
  has_image: false,
};

const NEW: ContactData = {
  name: "Lead Novo",
  phone: "+5511987654321",
  email: "lead@example.com",
  company: null,
  role: null,
  website: null,
  notes: null,
  source: "card_photo",
  event_tag: "CIMI2026",
  importance: null,
  tags: [],
  email_language: "pt-BR",
};

const noop = () => {};

describe("DuplicateModal — variante base do Heitor", () => {
  it("matchType='imported' mostra 'Já está na base do Heitor'", () => {
    render(
      <DuplicateModal
        existing={EXISTING}
        newContact={NEW}
        onMerge={noop}
        onForceCreate={noop}
        onCancel={noop}
        matchType="imported"
      />,
    );
    expect(screen.getByText("Já está na base do Heitor")).toBeInTheDocument();
    expect(screen.getByText("Base Heitor")).toBeInTheDocument();
  });

  it("matchType padrão (scanned) mantém o texto legado", () => {
    render(
      <DuplicateModal
        existing={EXISTING}
        newContact={NEW}
        onMerge={noop}
        onForceCreate={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByText("Contato parecido encontrado")).toBeInTheDocument();
    expect(
      screen.queryByText("Já está na base do Heitor"),
    ).not.toBeInTheDocument();
  });
});
