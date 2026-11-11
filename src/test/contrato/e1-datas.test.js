import { describe, it, expect, vi, afterEach } from "vitest";
import { formatarDataHora } from "../../utils/datas.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("E1 · datas · formatarDataHora", () => {
  it("formata texto com segundos", () => {
    // E1 · datas · 'AAAA-MM-DDTHH:MM:SS' → 'DD/MM/AAAA HH:MM' (agentes.md 6.3, 00-convencoes §7)
    expect(formatarDataHora("2026-03-05T14:07:09")).toBe("05/03/2026 14:07");
  });

  it("formata texto sem segundos", () => {
    // E1 · datas · 'AAAA-MM-DDTHH:MM' → 'DD/MM/AAAA HH:MM' (agentes.md 6.3)
    expect(formatarDataHora("2026-03-05T14:07")).toBe("05/03/2026 14:07");
  });

  it("não depende de fuso: meia-noite e fim de ano ficam como no texto", () => {
    // E1 · datas · lê o texto, sem fuso (agentes.md 6.3)
    expect(formatarDataHora("2026-01-01T00:30:00")).toBe("01/01/2026 00:30");
    expect(formatarDataHora("2026-12-31T23:59:59")).toBe("31/12/2026 23:59");
    expect(formatarDataHora("2026-11-24T10:00:00")).toBe("24/11/2026 10:00");
  });

  it("não usa Date", () => {
    // E1 · datas · sem Date (agentes.md 6.3)
    class DateProibido {
      constructor() {
        throw new Error("Date não deve ser usado");
      }
      static parse() {
        throw new Error("Date não deve ser usado");
      }
      static now() {
        throw new Error("Date não deve ser usado");
      }
    }
    vi.stubGlobal("Date", DateProibido);
    let resultado;
    let falha;
    try {
      resultado = formatarDataHora("2026-02-10T08:05:00");
    } catch (erro) {
      falha = erro;
    }
    vi.unstubAllGlobals();
    expect(falha).toBeUndefined();
    expect(resultado).toBe("10/02/2026 08:05");
  });

  it('null, undefined e texto vazio → "—"', () => {
    // E1 · datas · valor ausente → '—' (agentes.md 6.3)
    expect(formatarDataHora(null)).toBe("—");
    expect(formatarDataHora(undefined)).toBe("—");
    expect(formatarDataHora("")).toBe("—");
  });

  it("texto fora do formato é devolvido sem mudança", () => {
    // E1 · datas · texto fora do formato → igual (agentes.md 6.3)
    expect(formatarDataHora("ontem")).toBe("ontem");
    expect(formatarDataHora("2026-03-05")).toBe("2026-03-05");
    expect(formatarDataHora("05/03/2026 14:07")).toBe("05/03/2026 14:07");
    expect(formatarDataHora("2026-3-5T1:2")).toBe("2026-3-5T1:2");
  });
});
