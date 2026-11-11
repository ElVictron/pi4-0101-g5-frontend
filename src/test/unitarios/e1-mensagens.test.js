import { describe, it, expect } from "vitest";
import {
  MENSAGENS_ERRO,
  MENSAGEM_PADRAO,
  mensagemDeErro,
} from "../../services/mensagens.js";

describe("E1 · mensagens · unitários", () => {
  it.each(["toString", "hasOwnProperty", "__proto__", "valueOf"])(
    'nome herdado "%s" não conta como código',
    (codigo) => {
      expect(mensagemDeErro({ codigo, mensagem: "srv" })).toBe("srv");
      expect(mensagemDeErro({ codigo })).toBe(MENSAGEM_PADRAO);
    },
  );

  it("código não textual é ignorado", () => {
    expect(mensagemDeErro({ codigo: 404, mensagem: "srv" })).toBe("srv");
  });

  it("mensagem não textual é ignorada", () => {
    expect(mensagemDeErro({ mensagem: 123 })).toBe(MENSAGEM_PADRAO);
    expect(mensagemDeErro({ mensagem: { a: 1 } })).toBe(MENSAGEM_PADRAO);
  });

  it("mensagem só com espaços não é vazia e é devolvida", () => {
    expect(mensagemDeErro({ mensagem: " " })).toBe(" ");
  });

  it("aceita função, booleano e objeto sem protótipo", () => {
    expect(mensagemDeErro(() => {})).toBe(MENSAGEM_PADRAO);
    expect(mensagemDeErro(true)).toBe(MENSAGEM_PADRAO);
    const semProto = Object.create(null);
    semProto.codigo = "ISBN_DUPLICADO";
    expect(mensagemDeErro(semProto)).toBe(MENSAGENS_ERRO.ISBN_DUPLICADO);
  });

  it("Error com codigo do mapa usa o texto do mapa", () => {
    const erro = new Error("x");
    erro.codigo = "LIVRO_INDISPONIVEL";
    expect(mensagemDeErro(erro)).toBe(MENSAGENS_ERRO.LIVRO_INDISPONIVEL);
  });
});
