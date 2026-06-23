"use client";

import { useEffect } from "react";

export default function GlobalErrorLogger() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("[GlobalError]", event.error ?? event.message, event);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[UnhandledRejection]", event.reason, event);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
