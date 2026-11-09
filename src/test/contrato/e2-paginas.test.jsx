import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AcervoPage from "../../pages/AcervoPage.jsx";
import PainelPage from "../../pages/PainelPage.jsx";
import {
  cadastrarLivro,
  consultarLivros,
  listarDisponibilidade,
} from "../../services/api.js";

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

const LIVRO_EXISTENTE = {
  id: 101,
  titulo: "Fundamentos de Sistemas de Informação",
  autor: "Ana Silva",
  isbn: "9780000000001",
  quantidadeExemplares: 3,
  quantidadeDisponivel: 2,
};

const LIVRO_NOVO = {
  id: 103,
  titulo: "Engenharia de Software",
  autor: "Ian Sommerville",
  isbn: "9780000000003",
  quantidadeExemplares: 4,
  quantidadeDisponivel: 4,
};

const DISPONIVEIS = [
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

describe("E2 · AcervoPage (#785, #789, 6.14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('tem h1 "Acervo", o formulário de cadastro e o de pesquisa', async () => {
    // E2 · AcervoPage · h1 + CadastroLivro + PesquisaLivros (#785, #789, 6.14)
    consultarLivros.mockResolvedValue({
      livros: [LIVRO_EXISTENTE],
      total: 1,
      pagina: 1,
      tamanho: 20,
    });
    render(<AcervoPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Acervo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Cadastrar livro" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Pesquisar livros" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("table", { name: "Livros" }),
    ).toBeInTheDocument();
    expect(consultarLivros).toHaveBeenCalledTimes(1);
  });

  it("após cadastro com sucesso a pesquisa é refeita e o novo livro aparece na tabela", async () => {
    // E2 · AcervoPage · onCadastrado incrementa a versao da pesquisa (#785, #789, 6.14)
    consultarLivros
      .mockResolvedValueOnce({
        livros: [LIVRO_EXISTENTE],
        total: 1,
        pagina: 1,
        tamanho: 20,
      })
      .mockResolvedValue({
        livros: [LIVRO_EXISTENTE, LIVRO_NOVO],
        total: 2,
        pagina: 1,
        tamanho: 20,
      });
    cadastrarLivro.mockResolvedValue(LIVRO_NOVO);
    const user = userEvent.setup();
    render(<AcervoPage />);
    const tabela = await screen.findByRole("table", { name: "Livros" });
    await waitFor(() => expect(linhasDeDados(tabela)).toHaveLength(1));

    await user.type(screen.getByLabelText("Título"), LIVRO_NOVO.titulo);
    await user.type(screen.getByLabelText("Autor"), LIVRO_NOVO.autor);
    await user.type(screen.getByLabelText("ISBN"), LIVRO_NOVO.isbn);
    await user.type(screen.getByLabelText("Quantidade de exemplares"), "4");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(
      await screen.findByText(`Livro "${LIVRO_NOVO.titulo}" cadastrado.`),
    ).toBeInTheDocument();
    await waitFor(() => expect(consultarLivros).toHaveBeenCalledTimes(2));
    expect(consultarLivros).toHaveBeenLastCalledWith({
      pagina: 1,
      tamanho: 20,
    });
    await waitFor(() =>
      expect(
        within(screen.getByRole("table", { name: "Livros" })).getByText(
          LIVRO_NOVO.titulo,
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Total: 2")).toBeInTheDocument();
  });

  it("cadastro com erro não refaz a pesquisa", async () => {
    // E2 · AcervoPage · versao só muda quando onCadastrado é chamado (#785, 6.6, 6.14)
    consultarLivros.mockResolvedValue({
      livros: [LIVRO_EXISTENTE],
      total: 1,
      pagina: 1,
      tamanho: 20,
    });
    cadastrarLivro.mockRejectedValue(
      Object.assign(new Error("x"), {
        codigo: "ISBN_DUPLICADO",
        mensagem: "servidor",
      }),
    );
    const user = userEvent.setup();
    render(<AcervoPage />);
    await screen.findByText("Total: 1");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await screen.findByRole("alert");
    expect(consultarLivros).toHaveBeenCalledTimes(1);
  });
});

describe("E2 · PainelPage (#791, 6.14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('tem h1 "Painel de disponibilidade" e a tabela "Livros disponíveis"', async () => {
    // E2 · PainelPage · h1 + PainelDisponibilidade (#791, 6.14)
    listarDisponibilidade.mockResolvedValue({ livros: DISPONIVEIS });
    render(<PainelPage evento={null} reconexoes={0} />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Painel de disponibilidade",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("table", { name: "Livros disponíveis" }),
    ).toBeInTheDocument();
    await screen.findByText("Banco de Dados");
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
    expect(listarDisponibilidade).toHaveBeenCalledWith();
  });

  it("repassa o evento ao painel (a linha é atualizada sem nova chamada)", async () => {
    // E2 · PainelPage · repassa evento a PainelDisponibilidade (#791, 6.14, CT13)
    listarDisponibilidade.mockResolvedValue({
      livros: DISPONIVEIS.map((l) => ({ ...l })),
    });
    const { rerender } = render(<PainelPage evento={null} reconexoes={0} />);
    await screen.findByText("Banco de Dados");
    rerender(
      <PainelPage
        evento={{
          tipo: "emprestimo_registrado",
          livroId: 101,
          emprestimoId: 9001,
          status: "ativo",
          quantidadeDisponivel: 1,
          atualizadaEm: "2026-10-13T19:20:00",
        }}
        reconexoes={0}
      />,
    );
    await waitFor(() =>
      expect(
        linhasDeDados(
          screen.getByRole("table", { name: "Livros disponíveis" }),
        )[0],
      ).toEqual(["Fundamentos de Sistemas de Informação", "1", "3"]),
    );
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("repassa reconexoes ao painel (nova chamada ao reconectar)", async () => {
    // E2 · PainelPage · repassa reconexoes (#791, 6.14, F10)
    listarDisponibilidade.mockResolvedValue({ livros: DISPONIVEIS });
    const { rerender } = render(<PainelPage evento={null} reconexoes={0} />);
    await screen.findByText("Banco de Dados");
    rerender(<PainelPage evento={null} reconexoes={1} />);
    await waitFor(() => expect(listarDisponibilidade).toHaveBeenCalledTimes(2));
  });
});
