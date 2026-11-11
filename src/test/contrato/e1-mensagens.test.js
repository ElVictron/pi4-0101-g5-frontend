import { describe, it, expect } from "vitest";
import {
  MENSAGENS_ERRO,
  MENSAGEM_PADRAO,
  mensagemDeErro,
} from "../../services/mensagens.js";

describe("E1 · mensagens · MENSAGENS_ERRO", () => {
  it("tem exatamente os 15 códigos com os textos definidos", () => {
    // E1 · mensagens · mapa de códigos (agentes.md 6.2, F6)
    expect(MENSAGENS_ERRO).toEqual({
      CAMPOS_OBRIGATORIOS: "Preencha todos os campos obrigatórios.",
      DADOS_INVALIDOS: "Dados inválidos. Confira os campos e tente novamente.",
      QUANTIDADE_INVALIDA:
        "A quantidade de exemplares deve ser um número inteiro maior que zero.",
      ISBN_DUPLICADO: "Já existe um livro com este ISBN.",
      CPF_DUPLICADO: "Já existe um usuário com este CPF.",
      PAGINACAO_INVALIDA: "Página ou tamanho de página inválido.",
      BUSCA_INVALIDA: "O termo de busca deve ter no máximo 100 caracteres.",
      STATUS_INVALIDO: "Situação inválida.",
      USUARIO_NAO_ENCONTRADO: "Usuário não encontrado.",
      LIVRO_NAO_ENCONTRADO: "Livro não encontrado.",
      LIVRO_INDISPONIVEL: "Não há exemplar disponível deste livro.",
      EMPRESTIMO_NAO_ENCONTRADO: "Empréstimo não encontrado.",
      EMPRESTIMO_JA_DEVOLVIDO: "Este empréstimo já foi devolvido.",
      ERRO_INTERNO: "Erro interno no servidor. Tente novamente mais tarde.",
      SEM_CONEXAO:
        "Não foi possível conectar ao servidor. Verifique se o Backend 1 está em execução.",
    });
    expect(Object.keys(MENSAGENS_ERRO)).toHaveLength(15);
  });
});

describe("E1 · mensagens · MENSAGEM_PADRAO", () => {
  it('é "Ocorreu um erro inesperado."', () => {
    // E1 · mensagens · texto padrão (agentes.md 6.2, F6)
    expect(MENSAGEM_PADRAO).toBe("Ocorreu um erro inesperado.");
  });
});

describe("E1 · mensagens · mensagemDeErro", () => {
  it("código conhecido → texto do mapa, ignorando a mensagem do servidor", () => {
    // E1 · mensagens · código conhecido usa MENSAGENS_ERRO (agentes.md 6.2, F6)
    expect(
      mensagemDeErro({
        codigo: "ISBN_DUPLICADO",
        mensagem: "Outro texto do servidor",
      }),
    ).toBe("Já existe um livro com este ISBN.");
  });

  it("cada código do mapa devolve o próprio texto", () => {
    // E1 · mensagens · código conhecido usa MENSAGENS_ERRO (agentes.md 6.2)
    for (const [codigo, texto] of Object.entries(MENSAGENS_ERRO)) {
      expect(mensagemDeErro({ codigo, mensagem: "x" })).toBe(texto);
    }
  });

  it("código conhecido sem mensagem → texto do mapa", () => {
    // E1 · mensagens · código conhecido usa MENSAGENS_ERRO (agentes.md 6.2)
    expect(mensagemDeErro({ codigo: "SEM_CONEXAO" })).toBe(
      MENSAGENS_ERRO.SEM_CONEXAO,
    );
  });

  it("código desconhecido com mensagem → mensagem do servidor", () => {
    // E1 · mensagens · código desconhecido usa erro.mensagem (agentes.md 6.2, F6)
    expect(
      mensagemDeErro({
        codigo: "ROTA_NAO_ENCONTRADA",
        mensagem: "Rota não encontrada.",
      }),
    ).toBe("Rota não encontrada.");
  });

  it("código desconhecido com mensagem vazia → MENSAGEM_PADRAO", () => {
    // E1 · mensagens · sem mensagem → texto padrão (agentes.md 6.2, F6)
    expect(
      mensagemDeErro({ codigo: "ROTA_NAO_ENCONTRADA", mensagem: "" }),
    ).toBe(MENSAGEM_PADRAO);
  });

  it("código desconhecido sem mensagem → MENSAGEM_PADRAO", () => {
    // E1 · mensagens · sem mensagem → texto padrão (agentes.md 6.2, F6)
    expect(mensagemDeErro({ codigo: "ERRO_INESPERADO" })).toBe(MENSAGEM_PADRAO);
  });

  it("sem código e com mensagem → mensagem", () => {
    // E1 · mensagens · sem código usa erro.mensagem (agentes.md 6.2)
    expect(mensagemDeErro({ mensagem: "Erro HTTP 404" })).toBe("Erro HTTP 404");
  });

  it('nome herdado de Object (ex.: "constructor") não conta como código do mapa', () => {
    // E1 · mensagens · só códigos presentes em MENSAGENS_ERRO (agentes.md 6.2)
    expect(
      mensagemDeErro({ codigo: "constructor", mensagem: "Texto do servidor" }),
    ).toBe("Texto do servidor");
  });

  it("Error comum sem codigo nem mensagem → MENSAGEM_PADRAO", () => {
    // E1 · mensagens · aceita Error comum (agentes.md 6.2)
    expect(mensagemDeErro(new Error("falha qualquer"))).toBe(MENSAGEM_PADRAO);
  });

  it("undefined → MENSAGEM_PADRAO sem lançar", () => {
    // E1 · mensagens · aceita undefined sem exceção (agentes.md 6.2)
    expect(() => mensagemDeErro(undefined)).not.toThrow();
    expect(mensagemDeErro(undefined)).toBe(MENSAGEM_PADRAO);
    expect(mensagemDeErro()).toBe(MENSAGEM_PADRAO);
  });

  it("null → MENSAGEM_PADRAO sem lançar", () => {
    // E1 · mensagens · aceita null sem exceção (agentes.md 6.2)
    expect(() => mensagemDeErro(null)).not.toThrow();
    expect(mensagemDeErro(null)).toBe(MENSAGEM_PADRAO);
  });

  it("valores primitivos (texto, número) → MENSAGEM_PADRAO sem lançar", () => {
    // E1 · mensagens · aceita qualquer valor (agentes.md 6.2)
    expect(mensagemDeErro("texto")).toBe(MENSAGEM_PADRAO);
    expect(mensagemDeErro(42)).toBe(MENSAGEM_PADRAO);
  });
});
