import { describe, it, expect } from "vitest";
import { formatarDataHora } from "../../utils/datas.js";

describe("E1 · datas · unitários", () => {
  it("não valida faixa de valores, só o formato do texto", () => {
    expect(formatarDataHora("2026-13-40T25:61")).toBe("40/13/2026 25:61");
  });

  it("rejeita sufixos de fuso e frações de segundo", () => {
    expect(formatarDataHora("2026-03-05T14:07:09Z")).toBe(
      "2026-03-05T14:07:09Z",
    );
    expect(formatarDataHora("2026-03-05T14:07:09.123")).toBe(
      "2026-03-05T14:07:09.123",
    );
    expect(formatarDataHora("2026-03-05T14:07:09-03:00")).toBe(
      "2026-03-05T14:07:09-03:00",
    );
  });

  it("rejeita separador de espaço e segundos incompletos", () => {
    expect(formatarDataHora("2026-03-05 14:07")).toBe("2026-03-05 14:07");
    expect(formatarDataHora("2026-03-05T14:07:9")).toBe("2026-03-05T14:07:9");
  });

  it("rejeita espaços nas bordas", () => {
    expect(formatarDataHora(" 2026-03-05T14:07")).toBe(" 2026-03-05T14:07");
  });

  it("texto só com espaços é devolvido sem mudança", () => {
    expect(formatarDataHora("  ")).toBe("  ");
  });

  it("valor não textual é devolvido sem mudança", () => {
    expect(formatarDataHora(0)).toBe(0);
  });
});
