import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PesquisaLivros from "../../features/livros/PesquisaLivros.jsx";
import { consultarLivros } from "../../services/api.js";
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
    autor: "Ana Silva",
    isbn: "9780000000001",
    quantidadeExemplares: 3,
    quantidadeDisponivel: 2,
  },
  {
    id: 102,
    titulo: "Banco de Dados",
    autor: "Carlos Souza",
    isbn: "9780000000002",
    quantidadeExemplares: 5,
    quantidadeDisponivel: 0,
  },
];

function erroApi(codigo, mensagem = "servidor") {
  return Object.assign(new Error("x"), { codigo, mensagem });
}

function resposta({
  livros = LIVROS,
  total = livros.length,
  pagina = 1,
  tamanho = 20,
} = {}) {
  return { livros, total, pagina, tamanho };
}

// Resposta que ecoa a página e o tamanho pedidos, com o total informado.
function respostaEco(total, livros = LIVROS) {
  return async ({ pagina = 1, tamanho = 20 } = {}) => ({
    livros,
    total,
    pagina,
    tamanho,
  });
}

function linhasDeDados(tabela) {
  return within(tabela)
    .getAllByRole("row")
    .filter((linha) => within(linha).queryAllByRole("cell").length > 0)
    .map((linha) =>
      within(linha)
        .getAllByRole("cell")
        .map((c) => c.textContent.trim()),
    );
}

async function buscar(user, termo) {
  const campo = screen.getByLabelText("Buscar livros");
  await user.clear(campo);
  if (termo) await user.type(campo, termo);
  await user.click(screen.getByRole("button", { name: "Buscar" }));
}

describe("E2 · PesquisaLivros (#789, CT2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("carga inicial chama consultarLivros({ pagina: 1, tamanho: 20 })", async () => {
    // E2 · PesquisaLivros · carga inicial com tamanho padrão 20 (#789, 6.7, F8)
    consultarLivros.mockResolvedValue(resposta());
    render(<PesquisaLivros />);
    await screen.findByRole("table", { name: "Livros" });
    await screen.findByText("Total: 2");
    expect(consultarLivros).toHaveBeenCalledTimes(1);
    expect(consultarLivros).toHaveBeenCalledWith({ pagina: 1, tamanho: 20 });
  });

  it("formulário de pesquisa com nome acessível, campo e botão", async () => {
    // E2 · PesquisaLivros · form "Pesquisar livros", campo "Buscar livros", botão "Buscar" (#789, 6.7)
    consultarLivros.mockResolvedValue(resposta());
    render(<PesquisaLivros />);
    const form = screen.getByRole("form", { name: "Pesquisar livros" });
    expect(form).toHaveAttribute("novalidate");
    expect(form).toContainElement(screen.getByLabelText("Buscar livros"));
    expect(form).toContainElement(
      screen.getByRole("button", { name: "Buscar" }),
    );
    await screen.findByText("Total: 2");
  });

  it("prop tamanho é usada na carga e no cálculo de páginas", async () => {
    // E2 · PesquisaLivros · prop tamanho; totalPaginas = max(1, ceil(total/tamanho)) (#789, 6.7)
    consultarLivros.mockImplementation(respostaEco(12));
    render(<PesquisaLivros tamanho={5} />);
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(consultarLivros).toHaveBeenCalledWith({ pagina: 1, tamanho: 5 });
  });

  it('mostra "Carregando..." enquanto a lista carrega', async () => {
    // E2 · PesquisaLivros · carregamento (#789, 6.5)
    let resolver;
    consultarLivros.mockReturnValue(
      new Promise((r) => {
        resolver = r;
      }),
    );
    render(<PesquisaLivros />);
    expect(await screen.findByText("Carregando...")).toBeInTheDocument();
    resolver(resposta());
    await screen.findByText("Total: 2");
    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
  });

  it('tabela "Livros" com cabeçalhos e uma linha por livro com quantidadeDisponivel', async () => {
    // E2 · PesquisaLivros · tabela Título, Autor, ISBN, Disponível (#789, 6.7, CT2)
    consultarLivros.mockResolvedValue(resposta());
    render(<PesquisaLivros />);
    const tabela = await screen.findByRole("table", { name: "Livros" });
    await waitFor(() => expect(linhasDeDados(tabela)).toHaveLength(2));
    const cabecalhos = within(tabela)
      .getAllByRole("columnheader")
      .map((c) => c.textContent.trim());
    expect(cabecalhos).toEqual(["Título", "Autor", "ISBN", "Disponível"]);
    expect(linhasDeDados(tabela)).toEqual([
      [
        "Fundamentos de Sistemas de Informação",
        "Ana Silva",
        "9780000000001",
        "2",
      ],
      ["Banco de Dados", "Carlos Souza", "9780000000002", "0"],
    ]);
  });

  it('mostra "Total: N" com o total da resposta', async () => {
    // E2 · PesquisaLivros · total (#789, 6.7)
    consultarLivros.mockResolvedValue(resposta({ total: 57 }));
    render(<PesquisaLivros />);
    expect(await screen.findByText("Total: 57")).toBeInTheDocument();
  });

  it("busca enviada chama consultarLivros com busca e pagina 1", async () => {
    // E2 · PesquisaLivros · envio da busca (#789, 6.7, CT2)
    consultarLivros.mockImplementation(respostaEco(45));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Página 1 de 3");
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3");
    await buscar(user, "sistemas");
    await waitFor(() =>
      expect(consultarLivros).toHaveBeenLastCalledWith({
        busca: "sistemas",
        pagina: 1,
        tamanho: 20,
      }),
    );
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("busca vazia é enviada como texto vazio", async () => {
    // E2 · PesquisaLivros · busca vazia vai como '' (#789, 6.7)
    consultarLivros.mockResolvedValue(resposta());
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Total: 2");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(consultarLivros).toHaveBeenCalledTimes(2));
    expect(consultarLivros).toHaveBeenLastCalledWith({
      busca: "",
      pagina: 1,
      tamanho: 20,
    });
  });

  it('paginação: texto "Página X de Y" e botões habilitados conforme a página', async () => {
    // E2 · PesquisaLivros · Anterior desabilitado na 1, Próxima desabilitado na última (#789, 6.7)
    consultarLivros.mockImplementation(respostaEco(45));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Próxima" }));
    expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Próxima" }));
    expect(await screen.findByText("Página 3 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
  });

  it('total 0 resulta em "Página 1 de 1" com os dois botões desabilitados', async () => {
    // E2 · PesquisaLivros · totalPaginas = max(1, ...) (#789, 6.7)
    consultarLivros.mockResolvedValue(resposta({ livros: [], total: 0 }));
    render(<PesquisaLivros />);
    expect(await screen.findByText("Página 1 de 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("total igual a múltiplo do tamanho não cria página extra", async () => {
    // E2 · PesquisaLivros · ceil(40/20) = 2 (#789, 6.7)
    consultarLivros.mockImplementation(respostaEco(40));
    render(<PesquisaLivros />);
    expect(await screen.findByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("navegar sem busca enviada pede a página seguinte com o mesmo tamanho", async () => {
    // E2 · PesquisaLivros · Próxima → pagina + 1 (#789, 6.7)
    consultarLivros.mockImplementation(respostaEco(45));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Página 1 de 3");
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(consultarLivros).toHaveBeenCalledTimes(2));
    expect(consultarLivros.mock.calls[1][0]).toEqual(
      expect.objectContaining({ pagina: 2, tamanho: 20 }),
    );
    expect(consultarLivros.mock.calls[1][0].busca ?? "").toBe("");
  });

  it("navegar repete a última busca ENVIADA, não o texto digitado depois", async () => {
    // E2 · PesquisaLivros · navegação repete a última busca enviada com pagina ± 1 (#789, 6.7)
    consultarLivros.mockImplementation(respostaEco(45));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Página 1 de 3");
    await buscar(user, "abc");
    await waitFor(() =>
      expect(consultarLivros).toHaveBeenLastCalledWith({
        busca: "abc",
        pagina: 1,
        tamanho: 20,
      }),
    );
    await screen.findByText("Página 1 de 3");

    await user.type(screen.getByLabelText("Buscar livros"), "xyz");
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() =>
      expect(consultarLivros).toHaveBeenLastCalledWith({
        busca: "abc",
        pagina: 2,
        tamanho: 20,
      }),
    );
    await screen.findByText("Página 2 de 3");

    await user.click(screen.getByRole("button", { name: "Anterior" }));
    await waitFor(() => expect(consultarLivros).toHaveBeenCalledTimes(4));
    expect(consultarLivros).toHaveBeenLastCalledWith({
      busca: "abc",
      pagina: 1,
      tamanho: 20,
    });
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
  });

  it('lista vazia mostra "Nenhum livro encontrado."', async () => {
    // E2 · PesquisaLivros · estado vazio (#789, 6.7)
    consultarLivros.mockResolvedValue(resposta({ livros: [], total: 0 }));
    render(<PesquisaLivros />);
    expect(
      await screen.findByText("Nenhum livro encontrado."),
    ).toBeInTheDocument();
  });

  it("erro PAGINACAO_INVALIDA na carga aparece em alert", async () => {
    // E2 · PesquisaLivros · erro PAGINACAO_INVALIDA (#789, CT2)
    consultarLivros.mockRejectedValue(erroApi("PAGINACAO_INVALIDA"));
    render(<PesquisaLivros />);
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.PAGINACAO_INVALIDA);
  });

  it("erro BUSCA_INVALIDA na busca aparece em alert e não altera a lista", async () => {
    // E2 · PesquisaLivros · erro BUSCA_INVALIDA; F4: em erro a lista não muda (#789, CT2)
    consultarLivros.mockResolvedValueOnce(resposta());
    consultarLivros.mockRejectedValueOnce(erroApi("BUSCA_INVALIDA"));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    const tabela = await screen.findByRole("table", { name: "Livros" });
    await waitFor(() => expect(linhasDeDados(tabela)).toHaveLength(2));
    await buscar(user, "x".repeat(101));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.BUSCA_INVALIDA);
    expect(
      linhasDeDados(screen.getByRole("table", { name: "Livros" })),
    ).toHaveLength(2);
  });

  it("mensagem de erro é limpa ao buscar de novo", async () => {
    // E2 · PesquisaLivros · mensagens limpas ao reenviar (#789, 6.5)
    consultarLivros.mockRejectedValueOnce(erroApi("BUSCA_INVALIDA"));
    consultarLivros.mockResolvedValue(resposta());
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByRole("alert");
    await buscar(user, "sistemas");
    await screen.findByText("Total: 2");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mudança de versao repete a busca e a página atuais", async () => {
    // E2 · PesquisaLivros · versao muda → repete consulta atual (#789, 6.7)
    consultarLivros.mockImplementation(respostaEco(45));
    const user = userEvent.setup();
    const { rerender } = render(<PesquisaLivros versao={0} />);
    await screen.findByText("Página 1 de 3");
    expect(consultarLivros).toHaveBeenCalledTimes(1);
    await buscar(user, "abc");
    await screen.findByText("Página 1 de 3");
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3");
    expect(consultarLivros).toHaveBeenCalledTimes(3);

    rerender(<PesquisaLivros versao={1} />);
    await waitFor(() => expect(consultarLivros).toHaveBeenCalledTimes(4));
    expect(consultarLivros).toHaveBeenLastCalledWith({
      busca: "abc",
      pagina: 2,
      tamanho: 20,
    });
  });

  it("rerender sem mudar versao não refaz a consulta", async () => {
    // E2 · PesquisaLivros · só muda de versao dispara nova consulta (#789, 6.7)
    consultarLivros.mockResolvedValue(resposta());
    const { rerender } = render(<PesquisaLivros versao={0} />);
    await screen.findByText("Total: 2");
    rerender(<PesquisaLivros versao={0} />);
    await screen.findByText("Total: 2");
    expect(consultarLivros).toHaveBeenCalledTimes(1);
  });
});
