import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import SeloSituacao from "../../components/SeloSituacao.jsx";

afterEach(() => {
  cleanup();
});

describe("E1 · SeloSituacao · unitários", () => {
  it("status herdado de Object não é tratado como situação conhecida", () => {
    const { container } = render(<SeloSituacao status="constructor" />);
    const selo = container.querySelector("span");
    expect(selo.className).toBe("selo");
    expect(selo.textContent).toBe("constructor");
  });

  it("status em maiúsculas não é normalizado", () => {
    const { container } = render(<SeloSituacao status="ATIVO" />);
    const selo = container.querySelector("span");
    expect(selo.className).toBe("selo");
    expect(selo.textContent).toBe("ATIVO");
  });

  it("sem status renderiza <span> vazio com a classe selo", () => {
    const { container } = render(<SeloSituacao />);
    const selo = container.querySelector("span");
    expect(selo.className).toBe("selo");
    expect(selo.textContent).toBe("");
  });
});
