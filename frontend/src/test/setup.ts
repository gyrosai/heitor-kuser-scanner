import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Garante que o DOM de um teste não vaze para o próximo (evita
// "Found multiple elements" quando dois renders coexistem).
afterEach(() => {
  cleanup();
});
