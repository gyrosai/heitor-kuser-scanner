"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface NetworkContextValue {
  online: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ online: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ online }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus(): NetworkContextValue {
  return useContext(NetworkContext);
}
