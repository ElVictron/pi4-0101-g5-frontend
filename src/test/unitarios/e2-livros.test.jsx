import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CadastroLivro from "../../features/livros/CadastroLivro.jsx";
import PesquisaLivros from "../../features/livros/PesquisaLivros.jsx";
import PainelDisponibilidade from "../../features/livros/PainelDisponibilidade.jsx";
import PainelPage from "../../pages/PainelPage.jsx";
import {
  cadastrarLivro,
  consultarLivros,
  listarDisponibilidade,
} from "../../services/api.js";
import { MENSAGEM_PADRAO } from "../../services/mensagens.js";

vi.mock("../../services/api.js", () => ({
  API_BASE_URL: "http://localhost:8000",
  ApiError: class ApiError extends Error {},
  cadastrarLivro: vi.fn(),
  consultarLivros: vi.fn(),
  listarDisponibilidade: vi.fn(),
  cadastrarUsuario: vi.fn(),
  consultarUsuarios: vi.fn(),
  registrarEmprestimo: vi.fn(),
  consultarEmprestimos: vi.fn(),
  registrarDevolucao: vi.fn(),
}));

function adiada() {
  let resolver;
  let rejeitar;
  const promessa = new Promise((r, j) => {
    resolver = r;
    rejeitar = j;
  });
  return { promessa, resolver, rejeitar };
}

function livro(id, titulo, extra = {}) {
  return {
    id,
    titulo,
    autor: "Autor",
    isbn: String(id),
    quantidadeExemplares: 5,
    quantidadeDisponivel: 2,
    ...extra,
  };
}

function linhas(nome) {
  return within(screen.getByRole("table", { name: nome }))
    .getAllByRole("row")
    .filter((l) => within(l).queryAllByRole("cell").length > 0)
    .map((l) =>
      within(l)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("E2 · CadastroLivro · unitários", () => {
  it.each([
    ["1e2", 100],
    [" 7 ", 7],
    ["Infinity", "Infinity"],
    ["0x10", 16],
  ])("quantidade %j vira %j", async (digitado, esperado) => {
    cadastrarLivro.mockResolvedValue(livro(1, "X"));
    const user = userEvent.setup();
    render(<CadastroLivro />);
    await user.type(
      screen.getByLabelText("Quantidade de exemplares"),
      digitado,
    );
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await waitFor(() => expect(cadastrarLivro).toHaveBeenCalledTimes(1));
    expect(cadastrarLivro.mock.calls[0][0].quantidadeExemplares).toStrictEqual(
      esperado,
    );
  });

  it("funciona sem onCadastrado e campo de quantidade é text/numeric", async () => {
    cadastrarLivro.mockResolvedValue(livro(1, "Sem callback"));
    const user = userEvent.setup();
    render(<CadastroLivro />);
    const quantidade = screen.getByLabelText("Quantidade de exemplares");
    expect(quantidade).toHaveAttribute("type", "text");
    expect(quantidade).toHaveAttribute("inputmode", "numeric");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      'Livro "Sem callback" cadastrado.',
    );
  });

  it("erro sem código nem mensagem usa o texto padrão", async () => {
    cadastrarLivro.mockRejectedValue(new Error(""));
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      MENSAGEM_PADRAO,
    );
  });
});

describe("E2 · PesquisaLivros · unitários", () => {
  it("ignora resposta antiga que chega depois da mais nova", async () => {
    const primeira = adiada();
    const segunda = adiada();
    consultarLivros
      .mockReturnValueOnce(primeira.promessa)
      .mockReturnValueOnce(segunda.promessa);
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await user.type(screen.getByLabelText("Buscar livros"), "novo");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(consultarLivros).toHaveBeenCalledTimes(2));

    await act(async () => {
      segunda.resolver({ livros: [livro(2, "Novo")], total: 1 });
    });
    await screen.findByText("Novo");
    await act(async () => {
      primeira.resolver({ livros: [livro(1, "Antigo")], total: 1 });
    });
    expect(screen.queryByText("Antigo")).not.toBeInTheDocument();
    expect(linhas("Livros")).toHaveLength(1);
  });

  it("ignora erro de consulta substituída", async () => {
    const primeira = adiada();
    consultarLivros
      .mockReturnValueOnce(primeira.promessa)
      .mockResolvedValue({ livros: [livro(2, "Ok")], total: 1 });
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText("Ok");
    await act(async () => {
      primeira.rejeitar({ codigo: "ERRO_INTERNO" });
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resposta sem lista ou total vira lista vazia e total 0", async () => {
    consultarLivros.mockResolvedValue({});
    render(<PesquisaLivros />);
    expect(
      await screen.findByText("Nenhum livro encontrado."),
    ).toBeInTheDocument();
    expect(screen.getByText("Total: 0")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
  });

  it("erro na carga inicial não mostra mensagem de vazio", async () => {
    consultarLivros.mockRejectedValue({ codigo: "SEM_CONEXAO" });
    render(<PesquisaLivros />);
    await screen.findByRole("alert");
    expect(
      screen.queryByText("Nenhum livro encontrado."),
    ).not.toBeInTheDocument();
  });

  it("Carregando... não tem role status", async () => {
    consultarLivros.mockReturnValue(new Promise(() => {}));
    render(<PesquisaLivros />);
    expect(screen.getByText("Carregando...")).not.toHaveAttribute("role");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("E2 · PainelDisponibilidade · unitários", () => {
  const LISTA = [livro(1, "Um"), livro(2, "Dois")];
  const evento = (livroId, quantidadeDisponivel) => ({
    tipo: "emprestimo_registrado",
    livroId,
    quantidadeDisponivel,
  });

  it("evento já presente na montagem não dispara nova chamada", async () => {
    listarDisponibilidade.mockResolvedValue({ livros: LISTA });
    render(<PainelDisponibilidade evento={evento(99, 3)} />);
    await screen.findByText("Dois");
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("rerender com o mesmo objeto de evento não reaplica", async () => {
    listarDisponibilidade.mockResolvedValue({ livros: LISTA });
    const ev = evento(99, 3);
    const { rerender } = render(<PainelDisponibilidade evento={null} />);
    await screen.findByText("Dois");
    rerender(<PainelDisponibilidade evento={ev} />);
    await waitFor(() => expect(listarDisponibilidade).toHaveBeenCalledTimes(2));
    rerender(<PainelDisponibilidade evento={ev} />);
    await screen.findByText("Dois");
    expect(listarDisponibilidade).toHaveBeenCalledTimes(2);
  });

  it("ignora resposta antiga quando reconexoes muda durante a carga", async () => {
    const primeira = adiada();
    listarDisponibilidade
      .mockReturnValueOnce(primeira.promessa)
      .mockResolvedValueOnce({ livros: [livro(3, "Nova")] });
    const { rerender } = render(<PainelDisponibilidade reconexoes={0} />);
    rerender(<PainelDisponibilidade reconexoes={1} />);
    await screen.findByText("Nova");
    await act(async () => {
      primeira.resolver({ livros: LISTA });
    });
    expect(linhas("Livros disponíveis")).toEqual([["Nova", "2", "5"]]);
  });

  it("resposta sem lista vira lista vazia", async () => {
    listarDisponibilidade.mockResolvedValue(null);
    render(<PainelDisponibilidade />);
    expect(
      await screen.findByText("Nenhum livro disponível."),
    ).toBeInTheDocument();
  });

  it("evento que não é objeto é ignorado", async () => {
    listarDisponibilidade.mockResolvedValue({ livros: LISTA });
    const { rerender } = render(<PainelDisponibilidade />);
    await screen.findByText("Dois");
    rerender(<PainelDisponibilidade evento="texto" />);
    await screen.findByText("Dois");
    expect(linhas("Livros disponíveis")).toHaveLength(2);
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("PainelPage sem props usa evento null e reconexoes 0", async () => {
    listarDisponibilidade.mockResolvedValue({ livros: LISTA });
    render(<PainelPage />);
    await screen.findByText("Dois");
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });
});
