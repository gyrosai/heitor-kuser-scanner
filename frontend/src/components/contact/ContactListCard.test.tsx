import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactListCard } from "./ContactListCard";
import type { ContactRecord } from "@/lib/types";

const BASE: ContactRecord = {
  id: 1,
  name: "Fulano de Tal",
  phone: null,
  email: "fulano@example.com",
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

describe("ContactListCard — last_send", () => {
  it("sem last_send não mostra status nem botão Reenviar", () => {
    render(<ContactListCard contact={BASE} onClick={vi.fn()} onResend={vi.fn()} />);
    expect(screen.queryByText("Reenviar")).not.toBeInTheDocument();
  });

  it("last_send sent mostra produto e data, com botão Reenviar", () => {
    const contact: ContactRecord = {
      ...BASE,
      last_send: {
        channel: "email",
        product_key: "cimi_invest",
        status: "sent",
        sent_at: "2026-08-24T15:02:00Z",
      },
    };
    render(<ContactListCard contact={contact} onClick={vi.fn()} onResend={vi.fn()} />);
    expect(screen.getByText(/E-mail enviado/)).toBeInTheDocument();
    expect(screen.getByText(/CIMI Invest/)).toBeInTheDocument();
    expect(screen.getByText("Reenviar")).toBeInTheDocument();
  });

  it("last_send failed mostra 'Falhou'", () => {
    const contact: ContactRecord = {
      ...BASE,
      last_send: { channel: "email", product_key: null, status: "failed", sent_at: null },
    };
    render(<ContactListCard contact={contact} onClick={vi.fn()} onResend={vi.fn()} />);
    expect(screen.getByText("Falhou")).toBeInTheDocument();
  });

  it("clicar em Reenviar chama onResend sem disparar onClick do card", () => {
    const onClick = vi.fn();
    const onResend = vi.fn();
    const contact: ContactRecord = {
      ...BASE,
      last_send: { channel: "email", product_key: "cimi_360", status: "sent", sent_at: null },
    };
    render(<ContactListCard contact={contact} onClick={onClick} onResend={onResend} />);

    fireEvent.click(screen.getByText("Reenviar"));

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("clicar no corpo do card chama onClick", () => {
    const onClick = vi.fn();
    render(<ContactListCard contact={BASE} onClick={onClick} />);
    fireEvent.click(screen.getByText("Fulano de Tal"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("ContactListCard — base_heitor (importado)", () => {
  const IMPORTED: ContactRecord = {
    ...BASE,
    source: "base_heitor",
    google_contact_id: "people/c123",
    email_status: "sent",
  };

  it("mostra o badge 'Base Heitor'", () => {
    render(<ContactListCard contact={IMPORTED} onClick={vi.fn()} />);
    expect(screen.getByText("Base Heitor")).toBeInTheDocument();
  });

  it("não mostra badges de sync/e-mail para importados", () => {
    render(<ContactListCard contact={IMPORTED} onClick={vi.fn()} />);
    // importados nunca sincronizam nem recebem e-mail pelo app
    expect(screen.queryByText(/Sincronizado|Sync pendente/)).not.toBeInTheDocument();
    expect(screen.queryByText(/E-mail enviado/)).not.toBeInTheDocument();
  });

  it("contato normal não mostra o badge 'Base Heitor'", () => {
    render(<ContactListCard contact={BASE} onClick={vi.fn()} />);
    expect(screen.queryByText("Base Heitor")).not.toBeInTheDocument();
  });
});
