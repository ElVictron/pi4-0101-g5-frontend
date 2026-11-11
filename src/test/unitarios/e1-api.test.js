import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ApiError,
  API_BASE_URL,
  cadastrarLivro,
  consultarEmprestimos,
  consultarLivros,
  registrarDevolucao,
} from "../../services/api.js";

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo };
}

async function capturar(promessa) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("deveria rejeitar");
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("E1 · api · unitários", () => {
  it("corpo null em erro 4xx vira ERRO_INESPERADO", async () => {
    fetch.mockResolvedValue(resposta(422, null));
    const erro = await capturar(consultarLivros());
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.codigo).toBe("ERRO_INESPERADO");
    expect(erro.mensagem).toBe("Erro HTTP 422");
  });

  it("erro com codigo não textual é tratado como corpo fora do contrato", async () => {
    fetch.mockResolvedValue(
      resposta(400, { erro: { codigo: 12, mensagem: "x" } }),
    );
    const erro = await capturar(consultarLivros());
    expect(erro.codigo).toBe("ERRO_INESPERADO");
    expect(erro.mensagem).toBe("Erro HTTP 400");
  });

  it("erro null no corpo é tratado como corpo fora do contrato", async () => {
    fetch.mockResolvedValue(resposta(502, { erro: null }));
    const erro = await capturar(consultarLivros());
    expect(erro.codigo).toBe("ERRO_INTERNO");
    expect(erro.status).toBe(502);
  });

  it("mensagem não textual no corpo do contrato vira ''", async () => {
    fetch.mockResolvedValue(
      resposta(409, { erro: { codigo: "X", mensagem: 5 } }),
    );
    const erro = await capturar(cadastrarLivro({}));
    expect(erro.codigo).toBe("X");
    expect(erro.mensagem).toBe("");
  });

  it("corpo de erro em texto (não objeto) vira código genérico", async () => {
    fetch.mockResolvedValue(resposta(500, "Internal Server Error"));
    const erro = await capturar(consultarLivros());
    expect(erro.codigo).toBe("ERRO_INTERNO");
  });

  it("valores false e 0 não são omitidos da query", async () => {
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarEmprestimos({ status: false, busca: 0 });
    expect(fetch.mock.calls[0][0]).toBe(
      `${API_BASE_URL}/emprestimos?status=false&busca=0`,
    );
  });

  it("busca com espaços nas bordas é enviada sem trim", async () => {
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarLivros({ busca: " ana " });
    expect(fetch.mock.calls[0][0]).toBe(`${API_BASE_URL}/livros?busca=+ana+`);
  });

  it("PATCH não envia Content-Type", async () => {
    fetch.mockResolvedValue(resposta(200, {}));
    await registrarDevolucao(1);
    const opcoes = fetch.mock.calls[0][1];
    expect(opcoes.headers).toBeUndefined();
  });

  it("ApiError mantém a pilha de Error", () => {
    const erro = new ApiError({ codigo: "A", mensagem: "b", status: 1 });
    expect(typeof erro.stack).toBe("string");
  });
});
