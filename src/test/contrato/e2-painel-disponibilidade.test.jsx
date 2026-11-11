import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import PainelDisponibilidade from "../../features/livros/PainelDisponibilidade.jsx";
import { listarDisponibilidade } from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";

vi.mock("../../services/api.js", () => {
  class ApiError extends Error {
    constructor({ codigo, mensagem, status } = {}) {
      super(mensagem);
      this.name = "ApiError";
      this.codigo = codigo;
      this.mensagem = mensagem;
      this.status = status;
    }
  }
  return {
    API_BASE_URL: "http://localhost:8000",
    ApiError,
    cadastrarLivro: vi.fn(),
    consultarLivros: vi.fn(),
    listarDisponibilidade: vi.fn(),
    cadastrarUsuario: vi.fn(),
    consultarUsuarios: vi.fn(),
    registrarEmprestimo: vi.fn(),
    consultarEmprestimos: vi.fn(),
    registrarDevolucao: vi.fn(),
  };
});

const LIVROS = [
  {
    id: 101,
    titulo: "Fundamentos de Sistemas de Informação",
    quantidadeExemplares: 3,
    quantidadeDisponivel: 2,
    disponivel: true,
  },
  {
    id: 102,
    titulo: "Banco de Dados",
    quantidadeExemplares: 5,
    quantidadeDisponivel: 1,
    disponivel: true,
  },
];

const NOVO_LIVRO = {
  id: 103,
  titulo: "Engenharia de Software",
  quantidadeExemplares: 4,
  quantidadeDisponivel: 4,
  disponivel: true,
};

function erroApi(codigo, mensagem = "servidor") {
  return Object.assign(new Error("x"), { codigo, mensagem });
}

// Evento no formato CT13, sempre um objeto novo.
function evento(livroId, quantidadeDisponivel, tipo = "emprestimo_registrado") {
  return {
    tipo,
    livroId,
    emprestimoId: 9001,
    status: tipo === "emprestimo_registrado" ? "ativo" : "devolvido",
    quantidadeDisponivel,
    atualizadaEm: "2026-10-13T19:20:00",
  };
}

function tabela() {
  return screen.getByRole("table", { name: "Livros disponíveis" });
}

function linhasDeDados() {
  return within(tabela())
    .getAllByRole("row")
    .filter((linha) => within(linha).queryAllByRole("cell").length > 0)
    .map((linha) =>
      within(linha)
        .getAllByRole("cell")
        .map((c) => c.textContent.trim()),
    );
}

async function montarComLista(props = {}) {
  listarDisponibilidade.mockResolvedValue({
    livros: LIVROS.map((l) => ({ ...l })),
  });
  const utils = render(<PainelDisponibilidade {...props} />);
  await screen.findByText("Banco de Dados");
  return utils;
}

describe("E2 · PainelDisponibilidade (#791, CT7, CT13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("carga inicial chama listarDisponibilidade() sem argumentos, uma única vez", async () => {
    // E2 · PainelDisponibilidade · ao montar: listarDisponibilidade() (#791, 6.8, CT7)
    await montarComLista();
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
    expect(listarDisponibilidade).toHaveBeenCalledWith();
  });

  it('tabela "Livros disponíveis" com Título, Disponíveis, Exemplares', async () => {
    // E2 · PainelDisponibilidade · tabela e colunas (#791, 6.8, CT7)
    await montarComLista();
    const cabecalhos = within(tabela())
      .getAllByRole("columnheader")
      .map((c) => c.textContent.trim());
    expect(cabecalhos).toEqual(["Título", "Disponíveis", "Exemplares"]);
    expect(linhasDeDados()).toEqual([
      ["Fundamentos de Sistemas de Informação", "2", "3"],
      ["Banco de Dados", "1", "5"],
    ]);
  });

  it('mostra "Carregando..." enquanto a lista carrega', async () => {
    // E2 · PainelDisponibilidade · carregamento (#791, 6.5)
    let resolver;
    listarDisponibilidade.mockReturnValue(
      new Promise((r) => {
        resolver = r;
      }),
    );
    render(<PainelDisponibilidade />);
    expect(await screen.findByText("Carregando...")).toBeInTheDocument();
    resolver({ livros: LIVROS });
    await screen.findByText("Banco de Dados");
    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
  });

  it("evento de livro na lista com quantidade > 0 atualiza a linha sem nova chamada", async () => {
    // E2 · PainelDisponibilidade · evento CT13 atualiza quantidadeDisponivel (#791, 6.8)
    const { rerender } = await montarComLista({ evento: null });
    rerender(<PainelDisponibilidade evento={evento(101, 1)} />);
    await waitFor(() =>
      expect(linhasDeDados()).toEqual([
        ["Fundamentos de Sistemas de Informação", "1", "3"],
        ["Banco de Dados", "1", "5"],
      ]),
    );
    rerender(
      <PainelDisponibilidade evento={evento(102, 3, "devolucao_registrada")} />,
    );
    await waitFor(() =>
      expect(linhasDeDados()).toEqual([
        ["Fundamentos de Sistemas de Informação", "1", "3"],
        ["Banco de Dados", "3", "5"],
      ]),
    );
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("dois eventos seguidos do mesmo livro aplicam o valor do último", async () => {
    // E2 · PainelDisponibilidade · cada novo objeto de evento é aplicado (#791, 6.8)
    const { rerender } = await montarComLista({ evento: null });
    rerender(<PainelDisponibilidade evento={evento(101, 1)} />);
    await waitFor(() =>
      expect(linhasDeDados()[0]).toEqual([
        "Fundamentos de Sistemas de Informação",
        "1",
        "3",
      ]),
    );
    rerender(
      <PainelDisponibilidade evento={evento(101, 2, "devolucao_registrada")} />,
    );
    await waitFor(() =>
      expect(linhasDeDados()[0]).toEqual([
        "Fundamentos de Sistemas de Informação",
        "2",
        "3",
      ]),
    );
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("evento com quantidade 0 remove a linha sem nova chamada", async () => {
    // E2 · PainelDisponibilidade · quantidadeDisponivel 0 remove a linha (#791, 6.8)
    const { rerender } = await montarComLista({ evento: null });
    rerender(<PainelDisponibilidade evento={evento(102, 0)} />);
    await waitFor(() =>
      expect(screen.queryByText("Banco de Dados")).not.toBeInTheDocument(),
    );
    expect(linhasDeDados()).toEqual([
      ["Fundamentos de Sistemas de Informação", "2", "3"],
    ]);
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it('remover a última linha por evento mostra "Nenhum livro disponível."', async () => {
    // E2 · PainelDisponibilidade · lista vazia após eventos (#791, 6.8)
    listarDisponibilidade.mockResolvedValue({ livros: [{ ...LIVROS[1] }] });
    const { rerender } = render(<PainelDisponibilidade evento={null} />);
    await screen.findByText("Banco de Dados");
    rerender(<PainelDisponibilidade evento={evento(102, 0)} />);
    expect(
      await screen.findByText("Nenhum livro disponível."),
    ).toBeInTheDocument();
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("evento de livro fora da lista com quantidade > 0 chama listarDisponibilidade() de novo", async () => {
    // E2 · PainelDisponibilidade · livro fora da lista → nova chamada (#791, 6.8)
    const { rerender } = await montarComLista({ evento: null });
    listarDisponibilidade.mockResolvedValue({
      livros: [...LIVROS, NOVO_LIVRO],
    });
    rerender(
      <PainelDisponibilidade evento={evento(103, 4, "devolucao_registrada")} />,
    );
    await waitFor(() => expect(listarDisponibilidade).toHaveBeenCalledTimes(2));
    expect(listarDisponibilidade).toHaveBeenLastCalledWith();
    expect(
      await screen.findByText("Engenharia de Software"),
    ).toBeInTheDocument();
  });

  it("evento de livro fora da lista com quantidade 0 não chama nem altera a lista", async () => {
    // E2 · PainelDisponibilidade · fora da lista e 0 → nada a fazer (#791, 6.8, derivado)
    const { rerender } = await montarComLista({ evento: null });
    rerender(<PainelDisponibilidade evento={evento(999, 0)} />);
    await screen.findByText("Banco de Dados");
    expect(linhasDeDados()).toHaveLength(2);
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("evento null não faz nada", async () => {
    // E2 · PainelDisponibilidade · evento null ignorado (#791, 6.8)
    const { rerender } = await montarComLista({ evento: null });
    rerender(<PainelDisponibilidade evento={evento(101, 1)} />);
    await waitFor(() => expect(linhasDeDados()[0][1]).toBe("1"));
    rerender(<PainelDisponibilidade evento={null} />);
    await screen.findByText("Banco de Dados");
    expect(linhasDeDados()).toEqual([
      ["Fundamentos de Sistemas de Informação", "1", "3"],
      ["Banco de Dados", "1", "5"],
    ]);
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("mudança de reconexoes chama listarDisponibilidade() de novo", async () => {
    // E2 · PainelDisponibilidade · F10: ao reconectar, busca a lista de novo (#791, 6.8)
    const { rerender } = await montarComLista({ reconexoes: 0 });
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
    listarDisponibilidade.mockResolvedValue({
      livros: [...LIVROS, NOVO_LIVRO],
    });
    rerender(<PainelDisponibilidade reconexoes={1} />);
    await waitFor(() => expect(listarDisponibilidade).toHaveBeenCalledTimes(2));
    expect(listarDisponibilidade).toHaveBeenLastCalledWith();
    expect(
      await screen.findByText("Engenharia de Software"),
    ).toBeInTheDocument();
    rerender(<PainelDisponibilidade reconexoes={1} />);
    await screen.findByText("Engenharia de Software");
    expect(listarDisponibilidade).toHaveBeenCalledTimes(2);
  });

  it("montagem com reconexoes diferente de zero chama uma única vez", async () => {
    // E2 · PainelDisponibilidade · reconexoes só conta mudança depois da montagem (#791, 6.8)
    await montarComLista({ reconexoes: 3 });
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it('lista vazia mostra "Nenhum livro disponível."', async () => {
    // E2 · PainelDisponibilidade · estado vazio (#791, 6.8)
    listarDisponibilidade.mockResolvedValue({ livros: [] });
    render(<PainelDisponibilidade />);
    expect(
      await screen.findByText("Nenhum livro disponível."),
    ).toBeInTheDocument();
  });

  it.each(["BUSCA_INVALIDA", "SEM_CONEXAO"])(
    "erro %s na carga aparece em alert",
    async (codigo) => {
      // E2 · PainelDisponibilidade · erro <codigo> (#791, CT7 e F6)
      listarDisponibilidade.mockRejectedValue(erroApi(codigo));
      render(<PainelDisponibilidade />);
      const alerta = await screen.findByRole("alert");
      expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO[codigo]);
    },
  );

  it("erro ao recarregar na reconexão mostra alert e mantém a lista", async () => {
    // E2 · PainelDisponibilidade · F4: em erro a lista não muda (#791, 6.8)
    const { rerender } = await montarComLista({ reconexoes: 0 });
    listarDisponibilidade.mockRejectedValue(erroApi("SEM_CONEXAO"));
    rerender(<PainelDisponibilidade reconexoes={1} />);
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.SEM_CONEXAO);
    expect(linhasDeDados()).toHaveLength(2);
  });
});
