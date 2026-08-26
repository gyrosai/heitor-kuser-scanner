"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

interface NetworkContextValue {
  online: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ online: true });

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Cliente: valor real do navegador.
function getSnapshot(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// Servidor: sem `navigator`, assume online. O primeiro render do cliente usa
// ESTE snapshot para bater com o HTML do servidor (evita hydration mismatch,
// React #418/#423); useSyncExternalStore troca para o valor real logo após,
// sem setState dentro de effect.
function getServerSnapshot(): boolean {
  return true;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <NetworkContext.Provider value={{ online }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus(): NetworkContextValue {
  return useContext(NetworkContext);
}
