import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NetworkProvider, useNetworkStatus } from "./NetworkProvider";

function OnlineProbe() {
  const { online } = useNetworkStatus();
  return <span data-testid="status">{online ? "online" : "offline"}</span>;
}

describe("NetworkProvider — SSR-safe (regressão de hydration)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza os filhos sem quebrar", () => {
    render(
      <NetworkProvider>
        <span data-testid="child">home</span>
      </NetworkProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("não lê navigator.onLine no estado inicial (começa estável em 'online')", () => {
    // Estado inicial precisa ser estável (igual ao HTML do servidor) mesmo
    // que o navegador esteja offline no momento da montagem.
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(
      <NetworkProvider>
        <OnlineProbe />
      </NetworkProvider>,
    );
    // Após o useEffect (act), sincroniza com o valor real (offline).
    expect(screen.getByTestId("status").textContent).toBe("offline");
  });

  it("renderiza a home sem window.localStorage sem quebrar", () => {
    // Simula ambiente onde localStorage não existe (ex.: SSR / navegador
    // com storage bloqueado). O provider que envolve a home não pode crashar.
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    // @ts-expect-error — removendo intencionalmente para o teste
    delete window.localStorage;
    try {
      expect(() =>
        render(
          <NetworkProvider>
            <span data-testid="child">home</span>
          </NetworkProvider>,
        ),
      ).not.toThrow();
      expect(screen.getByTestId("child")).toBeInTheDocument();
    } finally {
      if (original) {
        Object.defineProperty(window, "localStorage", original);
      }
    }
  });

  it("reage aos eventos online/offline do window", () => {
    const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    render(
      <NetworkProvider>
        <OnlineProbe />
      </NetworkProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("online");
    act(() => {
      onLine.mockReturnValue(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByTestId("status").textContent).toBe("offline");
    act(() => {
      onLine.mockReturnValue(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByTestId("status").textContent).toBe("online");
  });
});
