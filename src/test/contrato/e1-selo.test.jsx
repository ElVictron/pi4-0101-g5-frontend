import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SeloSituacao from "../../components/SeloSituacao.jsx";

describe("E1 · SeloSituacao", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ["ativo", "Ativo", "selo selo-ativo", ["selo", "selo-ativo"]],
    ["atrasado", "Atrasado", "selo selo-atrasado", ["selo", "selo-atrasado"]],
    [
      "devolvido",
      "Devolvido",
      "selo selo-devolvido",
      ["selo", "selo-devolvido"],
    ],
  ])(
    'status "%s" → <span> "%s" com classes "%s"',
    (status, texto, className, classes) => {
      // E1 · SeloSituacao · texto e classes por status (agentes.md 6.4, F7)
      render(<SeloSituacao status={status} />);
      const selo = screen.getByText(texto, { exact: true });
      expect(selo.tagName).toBe("SPAN");
      expect(selo).toHaveTextContent(new RegExp(`^${texto}$`));
      expect(selo).toHaveClass(...classes, { exact: true });
      expect(selo.className).toBe(className);
    },
  );

  it('status desconhecido → <span> com o próprio valor e só a classe "selo"', () => {
    // E1 · SeloSituacao · status desconhecido (agentes.md 6.4)
    render(<SeloSituacao status="pendente" />);
    const selo = screen.getByText("pendente", { exact: true });
    expect(selo.tagName).toBe("SPAN");
    expect(selo).toHaveClass("selo", { exact: true });
    expect(selo.className).toBe("selo");
  });

  it("atrasado não recebe a classe de ativo nem de devolvido", () => {
    // E1 · SeloSituacao · selo vermelho exclusivo de atrasado (agentes.md 6.4, F7)
    render(<SeloSituacao status="atrasado" />);
    const selo = screen.getByText("Atrasado");
    expect(selo).not.toHaveClass("selo-ativo");
    expect(selo).not.toHaveClass("selo-devolvido");
  });
});
