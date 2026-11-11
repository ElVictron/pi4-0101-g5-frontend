import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import {
  ApiError,
  cadastrarUsuario,
  consultarUsuarios,
} from "../../services/api.js";
import UsuariosPage from "../../pages/UsuariosPage.jsx";

const NOVO = {
  id: 57,
  nome: "Ana Lima",
  cpf: "11122233344",
  contato: "ana@email.com",
};

function resposta(usuarios) {
  return { usuarios, total: usuarios.length, pagina: 1, tamanho: 20 };
}

beforeEach(() => {
  vi.mocked(cadastrarUsuario).mockReset();
  vi.mocked(consultarUsuarios).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("E3 · UsuariosPage (#787, #800, 6.14)", () => {
  it('mostra o título "Usuários" e os formulários de cadastro e pesquisa', async () => {
    // E3 · UsuariosPage · h1 + CadastroUsuario + PesquisaUsuarios (#787, #800, 6.14)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([]));
    render(<UsuariosPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Usuários" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Cadastrar usuário" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Pesquisar usuários" }),
    ).toBeInTheDocument();
    await screen.findByText("Nenhum usuário encontrado.");
    expect(consultarUsuarios).toHaveBeenCalledTimes(1);
    expect(vi.mocked(consultarUsuarios).mock.calls[0]).toStrictEqual([
      { pagina: 1, tamanho: 20 },
    ]);
  });

  it("após cadastro com sucesso a pesquisa consulta de novo e o novo usuário aparece", async () => {
    // E3 · UsuariosPage · onCadastrado incrementa versao da pesquisa (#787, #800, 6.14, fluxo E3 passo 6)
    vi.mocked(consultarUsuarios)
      .mockResolvedValueOnce(resposta([]))
      .mockResolvedValueOnce(resposta([{ ...NOVO, emprestimos: [] }]));
    vi.mocked(cadastrarUsuario).mockResolvedValue(NOVO);
    const user = userEvent.setup();
    render(<UsuariosPage />);
    await screen.findByText("Nenhum usuário encontrado.");

    const form = screen.getByRole("form", { name: "Cadastrar usuário" });
    await user.type(within(form).getByLabelText("Nome"), "Ana Lima");
    await user.type(within(form).getByLabelText("CPF"), "111.222.333-44");
    await user.type(
      within(form).getByLabelText("Contato (e-mail ou telefone)"),
      "ana@email.com",
    );
    await user.click(within(form).getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      'Usuário "Ana Lima" cadastrado.',
    );
    const artigo = await screen.findByRole("article", { name: "Ana Lima" });
    expect(within(artigo).getByText("CPF: 11122233344")).toBeInTheDocument();
    expect(within(artigo).getByText("Sem empréstimos.")).toBeInTheDocument();
    expect(consultarUsuarios).toHaveBeenCalledTimes(2);
    expect(vi.mocked(consultarUsuarios).mock.calls[1][0]).toMatchObject({
      pagina: 1,
      tamanho: 20,
    });
  });

  it("cadastro com erro não consulta a lista de novo", async () => {
    // E3 · UsuariosPage · erro não altera a lista (#787, F4, 6.14)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([]));
    vi.mocked(cadastrarUsuario).mockRejectedValue(
      new ApiError({ codigo: "CPF_DUPLICADO", mensagem: "x", status: 409 }),
    );
    const user = userEvent.setup();
    render(<UsuariosPage />);
    await screen.findByText("Nenhum usuário encontrado.");
    const form = screen.getByRole("form", { name: "Cadastrar usuário" });
    await user.click(within(form).getByRole("button", { name: "Cadastrar" }));
    await screen.findByRole("alert");
    await waitFor(() => expect(cadastrarUsuario).toHaveBeenCalledTimes(1));
    expect(consultarUsuarios).toHaveBeenCalledTimes(1);
  });
});
