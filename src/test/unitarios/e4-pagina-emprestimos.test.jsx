import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../../services/api.js", () => ({
  listarDisponibilidade: vi.fn(),
  consultarUsuarios: vi.fn(),
  registrarEmprestimo: vi.fn(),
  consultarEmprestimos: vi.fn(),
  registrarDevolucao: vi.fn(),
}));

import {
  listarDisponibilidade,
  consultarEmprestimos,
} from "../../services/api.js";
import EmprestimosPage from "../../pages/EmprestimosPage.jsx";

beforeEach(() => {
  vi.resetAllMocks();
  listarDisponibilidade.mockResolvedValue({ livros: [] });
  consultarEmprestimos.mockResolvedValue({ emprestimos: [] });
});

afterEach(() => {
  cleanup();
});

describe("E4 · EmprestimosPage (unitário)", () => {
  it("funciona sem props (padrões evento null e reconexoes 0)", async () => {
    render(<EmprestimosPage />);
    expect(
      await screen.findByText("Nenhum empréstimo encontrado."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Empréstimos",
    );
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });
});
