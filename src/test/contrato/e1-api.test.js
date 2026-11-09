import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  API_BASE_URL,
  ApiError,
  cadastrarLivro,
  consultarLivros,
  listarDisponibilidade,
  cadastrarUsuario,
  consultarUsuarios,
  registrarEmprestimo,
  consultarEmprestimos,
  registrarDevolucao,
} from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";

// ---------- auxiliares ----------

function resposta(status, corpo) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  };
}

function respostaIlegivel(status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON at position 0");
    },
  };
}

function chamada(indice = 0) {
  const [url, opcoes] = globalThis.fetch.mock.calls[indice];
  return { url: String(url), opcoes: opcoes ?? {} };
}

function header(opcoes, nome) {
  return new Headers(opcoes.headers ?? {}).get(nome);
}

function metodoGet(opcoes) {
  return (opcoes.method ?? "GET").toUpperCase();
}

async function capturar(promessa) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("A promessa deveria ter sido rejeitada");
}

const LIVRO = {
  titulo: "Dom Casmurro",
  autor: "Machado de Assis",
  isbn: "9788535910663",
  quantidadeExemplares: 3,
};
const USUARIO = {
  nome: "Ana Souza",
  cpf: "12345678901",
  contato: "ana@exemplo.com",
};
const EMPRESTIMO = { usuarioId: 1, livroId: 101 };

// Cada função com argumentos válidos, para os testes de erro aplicados a todas.
const TODAS = [
  ["cadastrarLivro", () => cadastrarLivro(LIVRO)],
  ["consultarLivros", () => consultarLivros({})],
  ["listarDisponibilidade", () => listarDisponibilidade()],
  ["cadastrarUsuario", () => cadastrarUsuario(USUARIO)],
  ["consultarUsuarios", () => consultarUsuarios({})],
  ["registrarEmprestimo", () => registrarEmprestimo(EMPRESTIMO)],
  ["consultarEmprestimos", () => consultarEmprestimos({})],
  ["registrarDevolucao", () => registrarDevolucao(5)],
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------- API_BASE_URL e ApiError ----------

describe("E1 · api · API_BASE_URL", () => {
  it("usa VITE_API_URL sem barra final ou o padrão http://localhost:8000", () => {
    // E1 · api · base da URL (agentes.md F1, 6.1)
    const env = import.meta.env.VITE_API_URL;
    const esperado = env ? env.replace(/\/+$/, "") : "http://localhost:8000";
    expect(API_BASE_URL).toBe(esperado);
    expect(API_BASE_URL.endsWith("/")).toBe(false);
  });
});

describe("E1 · api · ApiError", () => {
  it("é instância de Error com name, message, codigo, mensagem e status", () => {
    // E1 · api · classe ApiError (agentes.md 6.1)
    const erro = new ApiError({
      codigo: "ISBN_DUPLICADO",
      mensagem: "Já existe.",
      status: 409,
    });
    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.name).toBe("ApiError");
    expect(erro.message).toBe("Já existe.");
    expect(erro.codigo).toBe("ISBN_DUPLICADO");
    expect(erro.mensagem).toBe("Já existe.");
    expect(erro.status).toBe(409);
  });
});

// ---------- POST ----------

describe("E1 · api · cadastrarLivro (CT1)", () => {
  it("faz POST /livros com JSON do objeto recebido", async () => {
    // E1 · api · POST com Content-Type e corpo JSON (agentes.md 6.1, CT1)
    fetch.mockResolvedValue(resposta(201, { id: 1, ...LIVRO }));
    await cadastrarLivro(LIVRO);
    expect(fetch).toHaveBeenCalledTimes(1);
    const { url, opcoes } = chamada();
    expect(url).toBe(`${API_BASE_URL}/livros`);
    expect(opcoes.method).toBe("POST");
    expect(header(opcoes, "Content-Type")).toBe("application/json");
    expect(opcoes.body).toBe(JSON.stringify(LIVRO));
  });

  it("envia os valores sem alterar (texto com espaços, quantidade em texto)", async () => {
    // E1 · api · POST sem alterar valores (agentes.md 6.1; validação é do backend, F5)
    const dados = {
      titulo: "  Título  ",
      autor: "",
      isbn: "978-85",
      quantidadeExemplares: "abc",
    };
    fetch.mockResolvedValue(resposta(201, {}));
    await cadastrarLivro(dados);
    expect(chamada().opcoes.body).toBe(JSON.stringify(dados));
  });

  it("devolve o JSON de sucesso sem transformação", async () => {
    // E1 · api · sucesso devolve response.json() (agentes.md 6.1, CT1)
    const corpo = {
      id: 10,
      titulo: "Dom Casmurro",
      autor: "Machado de Assis",
      isbn: "9788535910663",
      quantidadeExemplares: 3,
      quantidadeDisponivel: 3,
    };
    fetch.mockResolvedValue(resposta(201, corpo));
    const resultado = await cadastrarLivro(LIVRO);
    expect(resultado).toBe(corpo);
  });
});

describe("E1 · api · cadastrarUsuario (CT3)", () => {
  it("faz POST /usuarios com JSON do objeto recebido", async () => {
    // E1 · api · POST com Content-Type e corpo JSON (agentes.md 6.1, CT3)
    fetch.mockResolvedValue(resposta(201, { id: 1, ...USUARIO }));
    await cadastrarUsuario(USUARIO);
    const { url, opcoes } = chamada();
    expect(url).toBe(`${API_BASE_URL}/usuarios`);
    expect(opcoes.method).toBe("POST");
    expect(header(opcoes, "Content-Type")).toBe("application/json");
    expect(opcoes.body).toBe(JSON.stringify(USUARIO));
  });

  it("devolve o JSON de sucesso sem transformação", async () => {
    // E1 · api · sucesso devolve response.json() (agentes.md 6.1, CT3)
    const corpo = {
      id: 7,
      nome: "Ana Souza",
      cpf: "12345678901",
      contato: "ana@exemplo.com",
    };
    fetch.mockResolvedValue(resposta(201, corpo));
    expect(await cadastrarUsuario(USUARIO)).toEqual(corpo);
  });
});

describe("E1 · api · registrarEmprestimo (CT5)", () => {
  it("faz POST /emprestimos com JSON do objeto recebido", async () => {
    // E1 · api · POST com Content-Type e corpo JSON (agentes.md 6.1, CT5)
    fetch.mockResolvedValue(resposta(201, {}));
    await registrarEmprestimo(EMPRESTIMO);
    const { url, opcoes } = chamada();
    expect(url).toBe(`${API_BASE_URL}/emprestimos`);
    expect(opcoes.method).toBe("POST");
    expect(header(opcoes, "Content-Type")).toBe("application/json");
    expect(opcoes.body).toBe(JSON.stringify(EMPRESTIMO));
  });

  it("envia null sem alterar quando não há seleção", async () => {
    // E1 · api · POST sem alterar valores (agentes.md 6.1, 6.11)
    fetch.mockResolvedValue(resposta(201, {}));
    await registrarEmprestimo({ usuarioId: null, livroId: null });
    expect(chamada().opcoes.body).toBe(
      JSON.stringify({ usuarioId: null, livroId: null }),
    );
  });

  it("devolve o JSON de sucesso sem transformação", async () => {
    // E1 · api · sucesso devolve response.json() (agentes.md 6.1, CT5)
    const corpo = {
      emprestimoId: 50,
      usuarioId: 1,
      livroId: 101,
      emprestadoEm: "2026-11-09T10:00:00",
      dataLimiteDevolucao: "2026-11-24T10:00:00",
      quantidadeDisponivel: 2,
    };
    fetch.mockResolvedValue(resposta(201, corpo));
    expect(await registrarEmprestimo(EMPRESTIMO)).toEqual(corpo);
  });
});

// ---------- GET ----------

describe("E1 · api · consultarLivros (CT2)", () => {
  it('sem argumentos faz GET /livros sem "?" e sem corpo', async () => {
    // E1 · api · GET sem parâmetro → URL sem "?" (agentes.md 6.1, CT2)
    fetch.mockResolvedValue(
      resposta(200, { itens: [], total: 0, pagina: 1, tamanho: 20 }),
    );
    await consultarLivros();
    const { url, opcoes } = chamada();
    expect(url).toBe(`${API_BASE_URL}/livros`);
    expect(metodoGet(opcoes)).toBe("GET");
    expect(opcoes.body).toBeUndefined();
  });

  it('com objeto vazio faz GET /livros sem "?"', async () => {
    // E1 · api · GET sem parâmetro → URL sem "?" (agentes.md 6.1, CT2)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarLivros({});
    expect(chamada().url).toBe(`${API_BASE_URL}/livros`);
  });

  it("monta a query na ordem da assinatura (busca, pagina, tamanho)", async () => {
    // E1 · api · ordem dos parâmetros (agentes.md 6.1, CT2)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarLivros({ tamanho: 10, pagina: 2, busca: "machado" });
    expect(chamada().url).toBe(
      `${API_BASE_URL}/livros?busca=machado&pagina=2&tamanho=10`,
    );
  });

  it("omite undefined, null, texto vazio e texto só com espaços", async () => {
    // E1 · api · omissão de parâmetros vazios (agentes.md 6.1)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarLivros({ busca: "", pagina: 1, tamanho: 20 });
    await consultarLivros({ busca: "   ", pagina: null, tamanho: undefined });
    await consultarLivros({ busca: undefined, pagina: undefined, tamanho: 5 });
    expect(chamada(0).url).toBe(`${API_BASE_URL}/livros?pagina=1&tamanho=20`);
    expect(chamada(1).url).toBe(`${API_BASE_URL}/livros`);
    expect(chamada(2).url).toBe(`${API_BASE_URL}/livros?tamanho=5`);
  });

  it("mantém o número 0 (não é vazio)", async () => {
    // E1 · api · só undefined, null e texto vazio são omitidos (agentes.md 6.1)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarLivros({ pagina: 0 });
    expect(chamada().url).toBe(`${API_BASE_URL}/livros?pagina=0`);
  });

  it("codifica a busca com URLSearchParams (espaço e acento)", async () => {
    // E1 · api · codificação via URLSearchParams (agentes.md 6.1)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarLivros({ busca: "José de Alencar", pagina: 1 });
    const esperado = new URLSearchParams([
      ["busca", "José de Alencar"],
      ["pagina", "1"],
    ]).toString();
    expect(chamada().url).toBe(`${API_BASE_URL}/livros?${esperado}`);
    expect(chamada().url).toBe(
      `${API_BASE_URL}/livros?busca=Jos%C3%A9+de+Alencar&pagina=1`,
    );
  });

  it("codifica caracteres especiais (&, =, +, %)", async () => {
    // E1 · api · codificação via URLSearchParams (agentes.md 6.1; 00-convencoes §6)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarLivros({ busca: "a&b=c+d%" });
    const esperado = new URLSearchParams([["busca", "a&b=c+d%"]]).toString();
    expect(chamada().url).toBe(`${API_BASE_URL}/livros?${esperado}`);
  });

  it("devolve o JSON de sucesso sem transformação", async () => {
    // E1 · api · sucesso devolve response.json() (agentes.md 6.1, CT2)
    const corpo = {
      itens: [
        {
          id: 1,
          titulo: "A",
          autor: "B",
          isbn: "1234567890",
          quantidadeExemplares: 1,
          quantidadeDisponivel: 1,
        },
      ],
      total: 1,
      pagina: 1,
      tamanho: 20,
    };
    fetch.mockResolvedValue(resposta(200, corpo));
    expect(await consultarLivros({ pagina: 1, tamanho: 20 })).toBe(corpo);
  });
});

describe("E1 · api · listarDisponibilidade (CT7)", () => {
  it('sem argumentos faz GET /livros/disponibilidade sem "?" e sem corpo', async () => {
    // E1 · api · GET sem parâmetro (agentes.md 6.1, CT7)
    fetch.mockResolvedValue(resposta(200, { itens: [], total: 0 }));
    await listarDisponibilidade();
    const { url, opcoes } = chamada();
    expect(url).toBe(`${API_BASE_URL}/livros/disponibilidade`);
    expect(metodoGet(opcoes)).toBe("GET");
    expect(opcoes.body).toBeUndefined();
  });

  it("inclui busca quando informada", async () => {
    // E1 · api · query busca (agentes.md 6.1, CT7)
    fetch.mockResolvedValue(resposta(200, {}));
    await listarDisponibilidade({ busca: "Informação 2" });
    const esperado = new URLSearchParams([
      ["busca", "Informação 2"],
    ]).toString();
    expect(chamada().url).toBe(
      `${API_BASE_URL}/livros/disponibilidade?${esperado}`,
    );
  });

  it("omite busca vazia, só com espaços ou null", async () => {
    // E1 · api · omissão de parâmetros vazios (agentes.md 6.1)
    fetch.mockResolvedValue(resposta(200, {}));
    await listarDisponibilidade({ busca: "" });
    await listarDisponibilidade({ busca: "  " });
    await listarDisponibilidade({ busca: null });
    for (let i = 0; i < 3; i += 1) {
      expect(chamada(i).url).toBe(`${API_BASE_URL}/livros/disponibilidade`);
    }
  });

  it("devolve o JSON de sucesso sem transformação", async () => {
    // E1 · api · sucesso devolve response.json() (agentes.md 6.1, CT7)
    const corpo = {
      itens: [{ id: 101, titulo: "X", quantidadeDisponivel: 2 }],
      total: 1,
    };
    fetch.mockResolvedValue(resposta(200, corpo));
    expect(await listarDisponibilidade()).toBe(corpo);
  });
});

describe("E1 · api · consultarUsuarios (CT4)", () => {
  it('sem argumentos faz GET /usuarios sem "?" e sem corpo', async () => {
    // E1 · api · GET sem parâmetro (agentes.md 6.1, CT4)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarUsuarios();
    const { url, opcoes } = chamada();
    expect(url).toBe(`${API_BASE_URL}/usuarios`);
    expect(metodoGet(opcoes)).toBe("GET");
    expect(opcoes.body).toBeUndefined();
  });

  it("monta a query na ordem da assinatura (busca, pagina, tamanho)", async () => {
    // E1 · api · ordem dos parâmetros (agentes.md 6.1, CT4)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarUsuarios({ tamanho: 20, busca: "ana", pagina: 1 });
    expect(chamada().url).toBe(
      `${API_BASE_URL}/usuarios?busca=ana&pagina=1&tamanho=20`,
    );
  });

  it("omite busca só com espaços e codifica pontuação de CPF", async () => {
    // E1 · api · omissão e codificação (agentes.md 6.1)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarUsuarios({ busca: " ", pagina: 3 });
    await consultarUsuarios({ busca: "João 123.456" });
    expect(chamada(0).url).toBe(`${API_BASE_URL}/usuarios?pagina=3`);
    const esperado = new URLSearchParams([
      ["busca", "João 123.456"],
    ]).toString();
    expect(chamada(1).url).toBe(`${API_BASE_URL}/usuarios?${esperado}`);
  });

  it("devolve o JSON de sucesso sem transformação", async () => {
    // E1 · api · sucesso devolve response.json() (agentes.md 6.1, CT4)
    const corpo = {
      itens: [
        {
          id: 1,
          nome: "Ana",
          cpf: "12345678901",
          contato: "a@b.com",
          emprestimos: [],
        },
      ],
      total: 1,
      pagina: 1,
      tamanho: 20,
    };
    fetch.mockResolvedValue(resposta(200, corpo));
    expect(await consultarUsuarios({ pagina: 1 })).toBe(corpo);
  });
});

describe("E1 · api · consultarEmprestimos (CT8)", () => {
  it('sem argumentos faz GET /emprestimos sem "?" e sem corpo', async () => {
    // E1 · api · GET sem parâmetro (agentes.md 6.1, CT8)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarEmprestimos();
    const { url, opcoes } = chamada();
    expect(url).toBe(`${API_BASE_URL}/emprestimos`);
    expect(metodoGet(opcoes)).toBe("GET");
    expect(opcoes.body).toBeUndefined();
  });

  it("monta a query na ordem da assinatura (status, busca)", async () => {
    // E1 · api · ordem dos parâmetros (agentes.md 6.1, CT8)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarEmprestimos({ busca: "ana", status: "atrasado" });
    expect(chamada().url).toBe(
      `${API_BASE_URL}/emprestimos?status=atrasado&busca=ana`,
    );
  });

  it("omite status undefined e busca vazia", async () => {
    // E1 · api · omissão de parâmetros vazios (agentes.md 6.1, 6.12)
    fetch.mockResolvedValue(resposta(200, {}));
    await consultarEmprestimos({ status: undefined, busca: "" });
    await consultarEmprestimos({ status: "devolvido", busca: "   " });
    await consultarEmprestimos({ status: undefined, busca: "Cálculo I" });
    expect(chamada(0).url).toBe(`${API_BASE_URL}/emprestimos`);
    expect(chamada(1).url).toBe(`${API_BASE_URL}/emprestimos?status=devolvido`);
    const esperado = new URLSearchParams([["busca", "Cálculo I"]]).toString();
    expect(chamada(2).url).toBe(`${API_BASE_URL}/emprestimos?${esperado}`);
  });

  it("devolve o JSON de sucesso sem transformação", async () => {
    // E1 · api · sucesso devolve response.json() (agentes.md 6.1, CT8)
    const corpo = {
      itens: [{ emprestimoId: 1, status: "ativo", devolvidoEm: null }],
      total: 1,
    };
    fetch.mockResolvedValue(resposta(200, corpo));
    expect(await consultarEmprestimos({ status: "ativo" })).toBe(corpo);
  });
});

// ---------- PATCH ----------

describe("E1 · api · registrarDevolucao (CT6)", () => {
  it("faz PATCH /emprestimos/{id}/devolucao sem corpo", async () => {
    // E1 · api · PATCH sem corpo (agentes.md 6.1, CT6)
    fetch.mockResolvedValue(resposta(200, {}));
    await registrarDevolucao(42);
    const { url, opcoes } = chamada();
    expect(url).toBe(`${API_BASE_URL}/emprestimos/42/devolucao`);
    expect(opcoes.method).toBe("PATCH");
    expect(opcoes.body).toBeUndefined();
  });

  it("codifica o id com encodeURIComponent", async () => {
    // E1 · api · id no caminho com encodeURIComponent (agentes.md 6.1)
    fetch.mockResolvedValue(resposta(200, {}));
    await registrarDevolucao("a/b c?");
    expect(chamada().url).toBe(
      `${API_BASE_URL}/emprestimos/${encodeURIComponent("a/b c?")}/devolucao`,
    );
    expect(chamada().url).toBe(
      `${API_BASE_URL}/emprestimos/a%2Fb%20c%3F/devolucao`,
    );
  });

  it("devolve o JSON de sucesso sem transformação", async () => {
    // E1 · api · sucesso devolve response.json() (agentes.md 6.1, CT6)
    const corpo = {
      emprestimoId: 42,
      devolvidoEm: "2026-11-09T15:00:00",
      status: "devolvido",
      quantidadeDisponivel: 3,
    };
    fetch.mockResolvedValue(resposta(200, corpo));
    expect(await registrarDevolucao(42)).toBe(corpo);
  });
});

// ---------- fetch global no momento da chamada ----------

describe("E1 · api · fetch global", () => {
  it("usa o fetch global vigente no momento da chamada", async () => {
    // E1 · api · usa globalThis.fetch no momento da chamada (agentes.md 6.1)
    const outro = vi.fn().mockResolvedValue(resposta(200, { ok: 1 }));
    vi.stubGlobal("fetch", outro);
    expect(await listarDisponibilidade()).toEqual({ ok: 1 });
    expect(outro).toHaveBeenCalledTimes(1);
  });
});

// ---------- erros ----------

describe("E1 · api · erros HTTP", () => {
  it.each(TODAS)(
    "%s: corpo do contrato vira ApiError com codigo, mensagem e status",
    async (_nome, executar) => {
      // E1 · api · erro com corpo do contrato (00-convencoes §3, agentes.md 6.1)
      fetch.mockResolvedValue(
        resposta(409, {
          erro: { codigo: "CODIGO_X", mensagem: "Mensagem do servidor." },
        }),
      );
      const erro = await capturar(executar());
      expect(erro).toBeInstanceOf(ApiError);
      expect(erro).toBeInstanceOf(Error);
      expect(erro.name).toBe("ApiError");
      expect(erro.codigo).toBe("CODIGO_X");
      expect(erro.mensagem).toBe("Mensagem do servidor.");
      expect(erro.message).toBe("Mensagem do servidor.");
      expect(erro.status).toBe(409);
    },
  );

  it("cadastrarLivro: ISBN_DUPLICADO 409 (CT1)", async () => {
    // E1 · api · erro com corpo do contrato (00-convencoes §3, CT1)
    fetch.mockResolvedValue(
      resposta(409, {
        erro: {
          codigo: "ISBN_DUPLICADO",
          mensagem: "Já existe um livro com este ISBN.",
        },
      }),
    );
    const erro = await capturar(cadastrarLivro(LIVRO));
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.codigo).toBe("ISBN_DUPLICADO");
    expect(erro.mensagem).toBe("Já existe um livro com este ISBN.");
    expect(erro.status).toBe(409);
  });

  it("registrarDevolucao: EMPRESTIMO_NAO_ENCONTRADO 404 (CT6)", async () => {
    // E1 · api · erro com corpo do contrato (00-convencoes §3, CT6)
    fetch.mockResolvedValue(
      resposta(404, {
        erro: {
          codigo: "EMPRESTIMO_NAO_ENCONTRADO",
          mensagem: "Empréstimo não encontrado.",
        },
      }),
    );
    const erro = await capturar(registrarDevolucao(999));
    expect(erro.codigo).toBe("EMPRESTIMO_NAO_ENCONTRADO");
    expect(erro.status).toBe(404);
  });

  it("mensagem ausente no corpo vira texto vazio", async () => {
    // E1 · api · erro sem mensagem → mensagem '' (agentes.md 6.1)
    fetch.mockResolvedValue(
      resposta(400, { erro: { codigo: "CAMPOS_OBRIGATORIOS" } }),
    );
    const erro = await capturar(cadastrarUsuario(USUARIO));
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.codigo).toBe("CAMPOS_OBRIGATORIOS");
    expect(erro.mensagem).toBe("");
    expect(erro.message).toBe("");
    expect(erro.status).toBe(400);
  });

  it('status 500 com corpo sem erro.codigo vira ERRO_INTERNO e "Erro HTTP 500"', async () => {
    // E1 · api · corpo fora do contrato, status >= 500 (agentes.md 6.1)
    fetch.mockResolvedValue(resposta(500, { erro: { mensagem: "falhou" } }));
    const erro = await capturar(consultarLivros({}));
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.codigo).toBe("ERRO_INTERNO");
    expect(erro.mensagem).toBe("Erro HTTP 500");
    expect(erro.message).toBe("Erro HTTP 500");
    expect(erro.status).toBe(500);
  });

  it('status 503 com corpo ilegível vira ERRO_INTERNO e "Erro HTTP 503"', async () => {
    // E1 · api · corpo ilegível, status >= 500 (agentes.md 6.1)
    fetch.mockResolvedValue(respostaIlegivel(503));
    const erro = await capturar(listarDisponibilidade());
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.codigo).toBe("ERRO_INTERNO");
    expect(erro.mensagem).toBe("Erro HTTP 503");
    expect(erro.status).toBe(503);
  });

  it('status 404 com corpo ilegível vira ERRO_INESPERADO e "Erro HTTP 404"', async () => {
    // E1 · api · corpo ilegível, status < 500 (agentes.md 6.1)
    fetch.mockResolvedValue(respostaIlegivel(404));
    const erro = await capturar(registrarDevolucao(1));
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.codigo).toBe("ERRO_INESPERADO");
    expect(erro.mensagem).toBe("Erro HTTP 404");
    expect(erro.message).toBe("Erro HTTP 404");
    expect(erro.status).toBe(404);
  });

  it('status 400 com outro corpo (sem "erro") vira ERRO_INESPERADO e "Erro HTTP 400"', async () => {
    // E1 · api · outro corpo, status < 500 (agentes.md 6.1)
    fetch.mockResolvedValue(resposta(400, { detail: "Bad Request" }));
    const erro = await capturar(consultarEmprestimos({ status: "x" }));
    expect(erro.codigo).toBe("ERRO_INESPERADO");
    expect(erro.mensagem).toBe("Erro HTTP 400");
    expect(erro.status).toBe(400);
  });
});

describe("E1 · api · falha de rede", () => {
  it.each(TODAS)(
    "%s: fetch rejeitado vira SEM_CONEXAO com status 0",
    async (_nome, executar) => {
      // E1 · api · falha de rede (agentes.md 6.1, 6.2)
      fetch.mockRejectedValue(new TypeError("Failed to fetch"));
      const erro = await capturar(executar());
      expect(erro).toBeInstanceOf(ApiError);
      expect(erro.codigo).toBe("SEM_CONEXAO");
      expect(erro.status).toBe(0);
      expect(erro.mensagem).toBe(MENSAGENS_ERRO.SEM_CONEXAO);
      expect(erro.message).toBe(MENSAGENS_ERRO.SEM_CONEXAO);
    },
  );
});

describe("E1 · api · sucesso com JSON ilegível", () => {
  it('status 200 com JSON ilegível vira ERRO_INESPERADO "Resposta inválida do servidor."', async () => {
    // E1 · api · sucesso com JSON ilegível (agentes.md 6.1)
    fetch.mockResolvedValue(respostaIlegivel(200));
    const erro = await capturar(consultarUsuarios({}));
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.codigo).toBe("ERRO_INESPERADO");
    expect(erro.mensagem).toBe("Resposta inválida do servidor.");
    expect(erro.message).toBe("Resposta inválida do servidor.");
    expect(erro.status).toBe(200);
  });

  it("status 201 com JSON ilegível mantém o status 201", async () => {
    // E1 · api · sucesso com JSON ilegível (agentes.md 6.1)
    fetch.mockResolvedValue(respostaIlegivel(201));
    const erro = await capturar(cadastrarLivro(LIVRO));
    expect(erro.codigo).toBe("ERRO_INESPERADO");
    expect(erro.mensagem).toBe("Resposta inválida do servidor.");
    expect(erro.status).toBe(201);
  });
});
