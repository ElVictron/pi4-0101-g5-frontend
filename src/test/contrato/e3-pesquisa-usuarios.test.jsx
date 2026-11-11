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

import { ApiError, consultarUsuarios } from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";
import PesquisaUsuarios from "../../features/usuarios/PesquisaUsuarios.jsx";

// ---------- dados no formato do CT4 / CT8 ----------

function emprestimo(campos) {
  return {
    emprestimoId: 9001,
    usuarioId: 55,
    usuarioNome: "Lucas Joaquim",
    livroId: 101,
    livroTitulo: "Fundamentos de Sistemas de Informação",
    status: "ativo",
    emprestadoEm: "2026-10-13T19:20:00",
    dataLimiteDevolucao: "2026-10-28T19:20:00",
    devolvidoEm: null,
    ...campos,
  };
}

const LUCAS = {
  id: 55,
  nome: "Lucas Joaquim",
  cpf: "12345678900",
  contato: "lucas@email.com",
  emprestimos: [
    emprestimo({}),
    emprestimo({
      emprestimoId: 9002,
      livroId: 102,
      livroTitulo: "Banco de Dados",
      status: "atrasado",
      emprestadoEm: "2026-09-01T08:05:00",
      dataLimiteDevolucao: "2026-09-16T08:05:00",
    }),
    emprestimo({
      emprestimoId: 9003,
      livroId: 103,
      livroTitulo: "Engenharia de Software",
      status: "devolvido",
      emprestadoEm: "2026-08-01T10:00:00",
      dataLimiteDevolucao: "2026-08-16T10:00:00",
      devolvidoEm: "2026-08-10T14:30:00",
    }),
  ],
};

const MARIA = {
  id: 56,
  nome: "Maria Souza",
  cpf: "98765432100",
  contato: "(19) 99999-0000",
  emprestimos: [],
};

function resposta(
  usuarios,
  { total = usuarios.length, pagina = 1, tamanho = 20 } = {},
) {
  return { usuarios, total, pagina, tamanho };
}

function adiado() {
  let resolver;
  let rejeitar;
  const promessa = new Promise((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

function erroApi(codigo, status = 400) {
  return new ApiError({
    codigo,
    mensagem: `mensagem do servidor para ${codigo}`,
    status,
  });
}

function ultimaChamada() {
  const chamadas = vi.mocked(consultarUsuarios).mock.calls;
  return chamadas[chamadas.length - 1];
}

function renderizar(props = {}) {
  const user = userEvent.setup();
  const utils = render(<PesquisaUsuarios {...props} />);
  const form = screen.getByRole("form", { name: "Pesquisar usuários" });
  return {
    ...utils,
    user,
    form,
    campo: within(form).getByLabelText("Buscar usuários"),
    buscar: within(form).getByRole("button", { name: "Buscar" }),
  };
}

async function buscar(t, termo) {
  await t.user.clear(t.campo);
  if (termo) await t.user.type(t.campo, termo);
  await t.user.click(t.buscar);
}

beforeEach(() => {
  vi.mocked(consultarUsuarios).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("E3 · PesquisaUsuarios · consulta (#800, CT4, 6.10)", () => {
  it("renderiza o formulário com campo e botão e usa noValidate", async () => {
    // E3 · PesquisaUsuarios · form "Pesquisar usuários" (#800, 6.10, 6.5)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([]));
    const t = renderizar();
    expect(t.form).toHaveAttribute("novalidate");
    expect(t.campo).toBeInTheDocument();
    expect(t.buscar).toBeInTheDocument();
    await screen.findByText("Nenhum usuário encontrado.");
  });

  it("carga inicial chama consultarUsuarios({ pagina: 1, tamanho: 20 }) uma única vez", async () => {
    // E3 · PesquisaUsuarios · carga inicial (#800, CT4, 6.7/6.10, F8)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([LUCAS]));
    renderizar();
    await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(consultarUsuarios).toHaveBeenCalledTimes(1);
    expect(vi.mocked(consultarUsuarios).mock.calls[0]).toStrictEqual([
      { pagina: 1, tamanho: 20 },
    ]);
  });

  it("carga inicial respeita a prop tamanho", async () => {
    // E3 · PesquisaUsuarios · prop tamanho (#800, 6.10)
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([], { tamanho: 5 }),
    );
    renderizar({ tamanho: 5 });
    await screen.findByText("Nenhum usuário encontrado.");
    expect(vi.mocked(consultarUsuarios).mock.calls[0]).toStrictEqual([
      { pagina: 1, tamanho: 5 },
    ]);
  });

  it('mostra "Carregando..." enquanto a lista carrega', async () => {
    // E3 · PesquisaUsuarios · carregando (#800, 6.5)
    const pendente = adiado();
    vi.mocked(consultarUsuarios).mockReturnValue(pendente.promessa);
    renderizar();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    pendente.resolver(resposta([LUCAS]));
    await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(screen.queryByText("Carregando...")).toBeNull();
  });

  it("busca envia { busca, pagina: 1, tamanho } com o texto digitado", async () => {
    // E3 · PesquisaUsuarios · busca (#800, CT4, 6.7/6.10)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([LUCAS]));
    const t = renderizar({ tamanho: 10 });
    await screen.findByRole("article", { name: "Lucas Joaquim" });
    await buscar(t, "Lucas");
    await waitFor(() => expect(consultarUsuarios).toHaveBeenCalledTimes(2));
    expect(ultimaChamada()).toStrictEqual([
      { busca: "Lucas", pagina: 1, tamanho: 10 },
    ]);
  });

  it("busca vazia vai como texto vazio", async () => {
    // E3 · PesquisaUsuarios · busca vazia vai como '' (#800, 6.7/6.10)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([LUCAS]));
    const t = renderizar();
    await screen.findByRole("article", { name: "Lucas Joaquim" });
    await t.user.click(t.buscar);
    await waitFor(() => expect(consultarUsuarios).toHaveBeenCalledTimes(2));
    expect(ultimaChamada()).toStrictEqual([
      { busca: "", pagina: 1, tamanho: 20 },
    ]);
  });

  it("busca mostra o resultado devolvido", async () => {
    // E3 · PesquisaUsuarios · resultado da busca substitui a lista (#800, CT4)
    vi.mocked(consultarUsuarios)
      .mockResolvedValueOnce(resposta([LUCAS, MARIA]))
      .mockResolvedValueOnce(resposta([MARIA]));
    const t = renderizar();
    await screen.findByRole("article", { name: "Lucas Joaquim" });
    await buscar(t, "Maria");
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: "Lucas Joaquim" }),
      ).toBeNull(),
    );
    expect(
      screen.getByRole("article", { name: "Maria Souza" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Total: 1")).toBeInTheDocument();
  });

  it('mostra "Total: N" com o total da resposta', async () => {
    // E3 · PesquisaUsuarios · total (#800, CT4)
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([LUCAS, MARIA], { total: 45 }),
    );
    renderizar();
    expect(await screen.findByText("Total: 45")).toBeInTheDocument();
  });

  it('lista vazia mostra "Nenhum usuário encontrado."', async () => {
    // E3 · PesquisaUsuarios · vazio (#800, 6.10)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([], { total: 0 }));
    renderizar();
    expect(
      await screen.findByText("Nenhum usuário encontrado."),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("erro PAGINACAO_INVALIDA na carga mostra alerta com a mensagem do mapa", async () => {
    // E3 · PesquisaUsuarios · erro PAGINACAO_INVALIDA (#800, CT4, F6)
    vi.mocked(consultarUsuarios).mockRejectedValue(
      erroApi("PAGINACAO_INVALIDA"),
    );
    renderizar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.PAGINACAO_INVALIDA,
    );
  });

  it("erro BUSCA_INVALIDA na busca mostra alerta e não altera a lista", async () => {
    // E3 · PesquisaUsuarios · erro BUSCA_INVALIDA (#800, CT4, F4, F6)
    vi.mocked(consultarUsuarios)
      .mockResolvedValueOnce(resposta([LUCAS]))
      .mockRejectedValueOnce(erroApi("BUSCA_INVALIDA"));
    const t = renderizar();
    await screen.findByRole("article", { name: "Lucas Joaquim" });
    await buscar(t, "x".repeat(101));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.BUSCA_INVALIDA,
    );
    expect(
      screen.getByRole("article", { name: "Lucas Joaquim" }),
    ).toBeInTheDocument();
  });

  it("erro SEM_CONEXAO mostra alerta com a mensagem do mapa", async () => {
    // E3 · PesquisaUsuarios · erro de rede (#800, 6.1, F6)
    vi.mocked(consultarUsuarios).mockRejectedValue(erroApi("SEM_CONEXAO", 0));
    renderizar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.SEM_CONEXAO,
    );
  });

  it("o alerta some quando uma nova busca dá certo", async () => {
    // E3 · PesquisaUsuarios · mensagem limpa ao enviar de novo (#800, 6.5)
    vi.mocked(consultarUsuarios)
      .mockRejectedValueOnce(erroApi("PAGINACAO_INVALIDA"))
      .mockResolvedValueOnce(resposta([LUCAS]));
    const t = renderizar();
    await screen.findByRole("alert");
    await buscar(t, "Lucas");
    await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("E3 · PesquisaUsuarios · paginação e versao (#800, CT4, 6.7/6.10)", () => {
  it('mostra "Página 1 de 3" e desabilita Anterior na primeira página', async () => {
    // E3 · PesquisaUsuarios · paginação no limite inicial (#800, 6.7)
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([LUCAS], { total: 45 }),
    );
    renderizar();
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();
  });

  it('total 0 mostra "Página 1 de 1" com os dois botões desabilitados', async () => {
    // E3 · PesquisaUsuarios · totalPaginas = max(1, ceil(total/tamanho)) (#800, 6.7)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([], { total: 0 }));
    renderizar();
    expect(await screen.findByText("Página 1 de 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it('total exatamente múltiplo do tamanho: 40 / 20 → "Página 1 de 2"', async () => {
    // E3 · PesquisaUsuarios · cálculo de totalPaginas (#800, 6.7)
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([LUCAS], { total: 40 }),
    );
    renderizar();
    expect(await screen.findByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("Próxima e Anterior repetem a última busca ENVIADA com pagina ± 1", async () => {
    // E3 · PesquisaUsuarios · navegação repete a última busca enviada (#800, 6.7)
    vi.mocked(consultarUsuarios).mockImplementation(
      async ({ pagina = 1 } = {}) => resposta([LUCAS], { total: 45, pagina }),
    );
    const t = renderizar();
    await screen.findByText("Página 1 de 3");
    await buscar(t, "Lu");
    await waitFor(() => expect(consultarUsuarios).toHaveBeenCalledTimes(2));
    await screen.findByText("Página 1 de 3");
    // texto digitado e não enviado não entra na navegação
    await t.user.type(t.campo, "cas");
    await t.user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3");
    expect(ultimaChamada()).toStrictEqual([
      { busca: "Lu", pagina: 2, tamanho: 20 },
    ]);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();

    await t.user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 3 de 3");
    expect(ultimaChamada()).toStrictEqual([
      { busca: "Lu", pagina: 3, tamanho: 20 },
    ]);
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();

    await t.user.click(screen.getByRole("button", { name: "Anterior" }));
    await screen.findByText("Página 2 de 3");
    expect(ultimaChamada()).toStrictEqual([
      { busca: "Lu", pagina: 2, tamanho: 20 },
    ]);
  });

  it("Próxima sem busca enviada pede a página 2 com o mesmo tamanho", async () => {
    // E3 · PesquisaUsuarios · navegação a partir da carga inicial (#800, 6.7)
    vi.mocked(consultarUsuarios).mockImplementation(
      async ({ pagina = 1 } = {}) => resposta([LUCAS], { total: 45, pagina }),
    );
    renderizar();
    await screen.findByText("Página 1 de 3");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3");
    const [argumento] = ultimaChamada();
    expect(argumento).toMatchObject({ pagina: 2, tamanho: 20 });
    expect([undefined, ""]).toContain(argumento.busca);
  });

  it("versao mudando repete a consulta atual (mesma busca e página)", async () => {
    // E3 · PesquisaUsuarios · versao repete a consulta atual (#800, 6.7/6.10, 6.14)
    vi.mocked(consultarUsuarios).mockImplementation(
      async ({ pagina = 1 } = {}) => resposta([LUCAS], { total: 45, pagina }),
    );
    const t = renderizar({ versao: 0 });
    await screen.findByText("Página 1 de 3");
    await buscar(t, "Lu");
    await waitFor(() => expect(consultarUsuarios).toHaveBeenCalledTimes(2));
    await t.user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3");
    expect(consultarUsuarios).toHaveBeenCalledTimes(3);

    t.rerender(<PesquisaUsuarios versao={1} />);
    await waitFor(() => expect(consultarUsuarios).toHaveBeenCalledTimes(4));
    expect(ultimaChamada()).toStrictEqual([
      { busca: "Lu", pagina: 2, tamanho: 20 },
    ]);
  });

  it("versao mudando sem busca repete a carga inicial e mostra a lista nova", async () => {
    // E3 · PesquisaUsuarios · versao repete a consulta atual (#800, 6.7/6.10)
    vi.mocked(consultarUsuarios)
      .mockResolvedValueOnce(resposta([LUCAS]))
      .mockResolvedValueOnce(resposta([LUCAS, MARIA]));
    const t = renderizar({ versao: 0 });
    await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(consultarUsuarios).toHaveBeenCalledTimes(1);
    t.rerender(<PesquisaUsuarios versao={1} />);
    await screen.findByRole("article", { name: "Maria Souza" });
    expect(consultarUsuarios).toHaveBeenCalledTimes(2);
    const [argumento] = ultimaChamada();
    expect(argumento).toMatchObject({ pagina: 1, tamanho: 20 });
    expect([undefined, ""]).toContain(argumento.busca);
  });
});

describe("E3 · PesquisaUsuarios · cartão do usuário e empréstimos (#800, CT4, CT8, 6.10)", () => {
  it("cada usuário é um article com nome, CPF e contato", async () => {
    // E3 · PesquisaUsuarios · article por usuário (#800, CT4, 6.10)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([LUCAS, MARIA]));
    renderizar();
    const lucas = await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(within(lucas).getByText("Lucas Joaquim")).toBeInTheDocument();
    expect(within(lucas).getByText("CPF: 12345678900")).toBeInTheDocument();
    expect(
      within(lucas).getByText("Contato: lucas@email.com"),
    ).toBeInTheDocument();

    const maria = screen.getByRole("article", { name: "Maria Souza" });
    expect(within(maria).getByText("Maria Souza")).toBeInTheDocument();
    expect(within(maria).getByText("CPF: 98765432100")).toBeInTheDocument();
    expect(
      within(maria).getByText("Contato: (19) 99999-0000"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it('usuário sem empréstimos mostra "Sem empréstimos."', async () => {
    // E3 · PesquisaUsuarios · sem empréstimos (#800, 6.10)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([LUCAS, MARIA]));
    renderizar();
    const maria = await screen.findByRole("article", { name: "Maria Souza" });
    expect(within(maria).getByText("Sem empréstimos.")).toBeInTheDocument();
    const lucas = screen.getByRole("article", { name: "Lucas Joaquim" });
    expect(within(lucas).queryByText("Sem empréstimos.")).toBeNull();
  });

  it('empréstimo ativo: título, selo Ativo e "Devolver até DD/MM/AAAA HH:MM"', async () => {
    // E3 · PesquisaUsuarios · empréstimo ativo (#800, CT8, 6.3, 6.4)
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([{ ...LUCAS, emprestimos: [LUCAS.emprestimos[0]] }]),
    );
    renderizar();
    const lucas = await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(
      within(lucas).getByText("Fundamentos de Sistemas de Informação"),
    ).toBeInTheDocument();
    const selo = within(lucas).getByText("Ativo");
    expect(selo).toHaveClass("selo", "selo-ativo");
    expect(
      within(lucas).getByText("Devolver até 28/10/2026 19:20"),
    ).toBeInTheDocument();
    expect(within(lucas).queryByText(/Devolvido em/)).toBeNull();
  });

  it('empréstimo atrasado: selo Atrasado e "Devolver até ..."', async () => {
    // E3 · PesquisaUsuarios · empréstimo atrasado (#800, CT8, F7, 6.4)
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([{ ...LUCAS, emprestimos: [LUCAS.emprestimos[1]] }]),
    );
    renderizar();
    const lucas = await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(within(lucas).getByText("Banco de Dados")).toBeInTheDocument();
    const selo = within(lucas).getByText("Atrasado");
    expect(selo).toHaveClass("selo", "selo-atrasado");
    expect(
      within(lucas).getByText("Devolver até 16/09/2026 08:05"),
    ).toBeInTheDocument();
    expect(within(lucas).queryByText(/Devolvido em/)).toBeNull();
  });

  it('empréstimo devolvido: selo Devolvido e "Devolvido em ...", sem "Devolver até"', async () => {
    // E3 · PesquisaUsuarios · empréstimo devolvido (#800, CT8, 6.3, 6.4)
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([{ ...LUCAS, emprestimos: [LUCAS.emprestimos[2]] }]),
    );
    renderizar();
    const lucas = await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(
      within(lucas).getByText("Engenharia de Software"),
    ).toBeInTheDocument();
    const selo = within(lucas).getByText("Devolvido");
    expect(selo).toHaveClass("selo", "selo-devolvido");
    expect(
      within(lucas).getByText("Devolvido em 10/08/2026 14:30"),
    ).toBeInTheDocument();
    expect(within(lucas).queryByText(/Devolver até/)).toBeNull();
  });

  it("usuário com vários empréstimos mostra todos, cada um com sua situação", async () => {
    // E3 · PesquisaUsuarios · lista de empréstimos do usuário (#800, CT4, CT8)
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([LUCAS, MARIA]));
    renderizar();
    const lucas = await screen.findByRole("article", { name: "Lucas Joaquim" });
    expect(
      within(lucas).getByText("Fundamentos de Sistemas de Informação"),
    ).toBeInTheDocument();
    expect(within(lucas).getByText("Banco de Dados")).toBeInTheDocument();
    expect(
      within(lucas).getByText("Engenharia de Software"),
    ).toBeInTheDocument();
    expect(within(lucas).getByText("Ativo")).toHaveClass("selo-ativo");
    expect(within(lucas).getByText("Atrasado")).toHaveClass("selo-atrasado");
    expect(within(lucas).getByText("Devolvido")).toHaveClass("selo-devolvido");
    expect(within(lucas).getAllByText(/^Devolver até /)).toHaveLength(2);
    expect(within(lucas).getAllByText(/^Devolvido em /)).toHaveLength(1);
    const maria = screen.getByRole("article", { name: "Maria Souza" });
    expect(within(maria).queryByText("Ativo")).toBeNull();
  });
});
