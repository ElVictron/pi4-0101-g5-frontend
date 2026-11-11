import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../services/api.js", () => {
  class ApiError extends Error {
    constructor({ codigo, mensagem, status }) {
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
  listarDisponibilidade,
  consultarUsuarios,
  registrarEmprestimo,
  consultarEmprestimos,
} from "../../services/api.js";
import EmprestimosPage from "../../pages/EmprestimosPage.jsx";

const LIVROS = [
  {
    id: 101,
    titulo: "Fundamentos de Sistemas de Informação",
    quantidadeExemplares: 3,
    quantidadeDisponivel: 2,
    disponivel: true,
  },
];
const USUARIOS = [
  {
    id: 55,
    nome: "Lucas Joaquim",
    cpf: "12345678900",
    contato: "lucas@email.com",
    emprestimos: [],
  },
];
const EMPRESTIMO_ANTIGO = {
  emprestimoId: 8000,
  usuarioId: 57,
  usuarioNome: "Maria Souza",
  livroId: 102,
  livroTitulo: "Banco de Dados",
  status: "ativo",
  emprestadoEm: "2026-10-01T10:00:00",
  dataLimiteDevolucao: "2026-10-16T10:00:00",
  devolvidoEm: null,
};
const RESPOSTA_CT5 = {
  emprestimoId: 9001,
  usuarioId: 55,
  livroId: 101,
  status: "ativo",
  emprestadoEm: "2026-10-13T19:20:00",
  dataLimiteDevolucao: "2026-10-28T19:20:00",
  devolvidoEm: null,
};
const EMPRESTIMO_NOVO = {
  emprestimoId: 9001,
  usuarioId: 55,
  usuarioNome: "Lucas Joaquim",
  livroId: 101,
  livroTitulo: "Fundamentos de Sistemas de Informação",
  status: "ativo",
  emprestadoEm: "2026-10-13T19:20:00",
  dataLimiteDevolucao: "2026-10-28T19:20:00",
  devolvidoEm: null,
};
const EVENTO_CT13 = {
  tipo: "emprestimo_registrado",
  livroId: 101,
  emprestimoId: 9001,
  status: "ativo",
  quantidadeDisponivel: 1,
  atualizadaEm: "2026-10-13T19:20:00",
};

async function renderizar(props = { evento: null, reconexoes: 0 }) {
  const user = userEvent.setup();
  const utils = render(<EmprestimosPage {...props} />);
  await screen.findByText("Maria Souza");
  await screen.findByRole("option", {
    name: "Fundamentos de Sistemas de Informação (disponíveis: 2)",
  });
  return { user, ...utils };
}

beforeEach(() => {
  vi.resetAllMocks();
  listarDisponibilidade.mockResolvedValue({ livros: LIVROS });
  consultarUsuarios.mockResolvedValue({
    usuarios: USUARIOS,
    total: 1,
    pagina: 1,
    tamanho: 20,
  });
  registrarEmprestimo.mockResolvedValue(RESPOSTA_CT5);
  consultarEmprestimos.mockResolvedValue({
    emprestimos: [EMPRESTIMO_ANTIGO],
    total: 1,
  });
});

afterEach(() => {
  cleanup();
});

describe("E4 · EmprestimosPage (#794, #797, 6.14)", () => {
  it("renderiza título, formulário de registro, pesquisa e tabela de empréstimos", async () => {
    // E4 · EmprestimosPage · composição da página (#794, #797, 6.14)
    await renderizar();
    expect(
      screen.getByRole("heading", { level: 1, name: "Empréstimos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Registrar empréstimo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Pesquisar empréstimos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Empréstimos" }),
    ).toBeInTheDocument();
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
  });

  it("após registrar com sucesso a lista de empréstimos é recarregada", async () => {
    // E4 · EmprestimosPage · onRegistrado incrementa versao da lista (#794, #797, 6.14)
    const { user } = await renderizar();
    consultarEmprestimos.mockResolvedValue({
      emprestimos: [EMPRESTIMO_NOVO, EMPRESTIMO_ANTIGO],
      total: 2,
    });
    await user.type(
      screen.getByLabelText("Buscar usuário", { selector: "input" }),
      "Lucas",
    );
    await user.click(screen.getByRole("button", { name: "Buscar usuário" }));
    await user.click(
      await screen.findByRole("radio", {
        name: "Lucas Joaquim (CPF 12345678900)",
      }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Livro" }),
      "101",
    );
    await user.click(
      screen.getByRole("button", { name: "Registrar empréstimo" }),
    );
    await waitFor(() =>
      expect(registrarEmprestimo).toHaveBeenCalledWith({
        usuarioId: 55,
        livroId: 101,
      }),
    );
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(2));
    const chamada = consultarEmprestimos.mock.calls[1];
    expect(chamada).toHaveLength(1);
    expect(chamada[0].status).toBeUndefined();
    expect(chamada[0].busca).toBeUndefined();
    expect(
      await screen.findByRole("cell", { name: "Lucas Joaquim" }),
    ).toBeInTheDocument();
  });

  it("registro com erro não recarrega a lista", async () => {
    // E4 · EmprestimosPage · onRegistrado só no sucesso (#794, 6.11, 6.14)
    registrarEmprestimo.mockRejectedValue(
      new ApiError({
        codigo: "LIVRO_INDISPONIVEL",
        mensagem: "x",
        status: 409,
      }),
    );
    const { user } = await renderizar();
    await user.click(
      screen.getByRole("button", { name: "Registrar empréstimo" }),
    );
    await screen.findByRole("alert");
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
  });

  it("evento repassado pela página recarrega a lista", async () => {
    // E4 · EmprestimosPage · evento CT13 chega à ListaEmprestimos (#797, CT13, 6.14)
    const { rerender } = await renderizar({ evento: null, reconexoes: 0 });
    rerender(<EmprestimosPage evento={{ ...EVENTO_CT13 }} reconexoes={0} />);
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(2));
  });

  it("reconexoes repassado pela página recarrega a lista", async () => {
    // E4 · EmprestimosPage · reconexão chega à ListaEmprestimos (#797, F10, 6.14)
    const { rerender } = await renderizar({ evento: null, reconexoes: 0 });
    rerender(<EmprestimosPage evento={null} reconexoes={1} />);
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(2));
  });
});
