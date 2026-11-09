import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
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
  consultarEmprestimos,
  registrarDevolucao,
} from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";
import ListaEmprestimos from "../../features/emprestimos/ListaEmprestimos.jsx";

// Dados no formato do CT8 (EmprestimoResumo)
const ATIVO = {
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
const ATRASADO = {
  emprestimoId: 9002,
  usuarioId: 57,
  usuarioNome: "Maria Souza",
  livroId: 102,
  livroTitulo: "Banco de Dados",
  status: "atrasado",
  emprestadoEm: "2026-09-01T10:05:00",
  dataLimiteDevolucao: "2026-09-16T10:05:00",
  devolvidoEm: null,
};
const DEVOLVIDO = {
  emprestimoId: 9003,
  usuarioId: 58,
  usuarioNome: "Ana Lima",
  livroId: 103,
  livroTitulo: "Engenharia de Software",
  status: "devolvido",
  emprestadoEm: "2026-08-10T08:00:00",
  dataLimiteDevolucao: "2026-08-25T08:00:00",
  devolvidoEm: "2026-08-20T14:45:00",
};
const LISTA = { emprestimos: [ATIVO, ATRASADO, DEVOLVIDO], total: 3 };

// Evento no formato do CT13
function eventoCt13(extra = {}) {
  return {
    tipo: "devolucao_registrada",
    livroId: 101,
    emprestimoId: 9001,
    status: "devolvido",
    quantidadeDisponivel: 3,
    atualizadaEm: "2026-10-15T16:30:00",
    ...extra,
  };
}

const COL = {
  usuario: 0,
  livro: 1,
  emprestadoEm: 2,
  devolverAte: 3,
  devolvidoEm: 4,
  situacao: 5,
  acao: 6,
};

// role="alert" contém só o texto da mensagem (esclarecimento do PM, 6.5)
function textoDe(el) {
  return el.textContent.replace(/\s+/g, " ").trim();
}

function erroApi(codigo, status = 400) {
  return new ApiError({
    codigo,
    mensagem: `mensagem do servidor para ${codigo}`,
    status,
  });
}

function adiado() {
  let resolver;
  const promessa = new Promise((res) => {
    resolver = res;
  });
  return { promessa, resolver };
}

function tabela() {
  return screen.getByRole("table", { name: "Empréstimos" });
}

function linhaDe(nomeUsuario) {
  const linhas = within(tabela()).getAllByRole("row");
  const linha = linhas.find((l) => within(l).queryByText(nomeUsuario));
  if (!linha) throw new Error(`linha de ${nomeUsuario} não encontrada`);
  return linha;
}

function celulas(linha) {
  return within(linha).getAllByRole("cell");
}

function campoBusca() {
  return screen.getByLabelText("Buscar empréstimos", { selector: "input" });
}

function aba(nome) {
  return screen.getByRole("button", { name: nome });
}

function ultimaChamada() {
  const chamadas = consultarEmprestimos.mock.calls;
  return chamadas[chamadas.length - 1];
}

async function renderizar(props = {}) {
  const user = userEvent.setup();
  const utils = render(<ListaEmprestimos {...props} />);
  await screen.findByText("Lucas Joaquim");
  return { user, ...utils };
}

async function buscar(user, termo) {
  await user.clear(campoBusca());
  await user.type(campoBusca(), termo);
  await user.click(screen.getByRole("button", { name: "Buscar" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  consultarEmprestimos.mockResolvedValue(LISTA);
});

afterEach(() => {
  cleanup();
});

describe("E4 · ListaEmprestimos · carga, abas e busca (#797, CT8)", () => {
  it("ao montar chama consultarEmprestimos uma vez com um único objeto sem status e sem busca", async () => {
    // E4 · ListaEmprestimos · carga inicial consultarEmprestimos({}) (#797, CT8, 6.12)
    await renderizar();
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
    const chamada = consultarEmprestimos.mock.calls[0];
    expect(chamada).toHaveLength(1);
    expect(chamada[0]).toEqual(expect.objectContaining({}));
    expect(typeof chamada[0]).toBe("object");
    expect(chamada[0]).not.toBeNull();
    expect(chamada[0].status).toBeUndefined();
    expect(chamada[0].busca).toBeUndefined();
  });

  it('mostra "Carregando..." enquanto a lista carrega', async () => {
    // E4 · ListaEmprestimos · estado de carregamento (#797, 6.5)
    const pendente = adiado();
    consultarEmprestimos.mockReturnValue(pendente.promessa);
    render(<ListaEmprestimos />);
    expect(await screen.findByText("Carregando...")).toBeInTheDocument();
    pendente.resolver(LISTA);
    expect(await screen.findByText("Lucas Joaquim")).toBeInTheDocument();
    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
  });

  it("abas Todos, Ativos, Atrasados, Devolvidos com aria-pressed e Todos selecionada por padrão", async () => {
    // E4 · ListaEmprestimos · abas de situação (#797, F7)
    await renderizar();
    expect(aba("Todos")).toHaveAttribute("aria-pressed", "true");
    expect(aba("Ativos")).toHaveAttribute("aria-pressed", "false");
    expect(aba("Atrasados")).toHaveAttribute("aria-pressed", "false");
    expect(aba("Devolvidos")).toHaveAttribute("aria-pressed", "false");
  });

  it('clicar em "Atrasados" chama com status "atrasado" e marca a aba', async () => {
    // E4 · ListaEmprestimos · filtro atrasado (#797, CT8, F7)
    const { user } = await renderizar();
    await user.click(aba("Atrasados"));
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(2));
    const chamada = ultimaChamada();
    expect(chamada).toHaveLength(1);
    expect(chamada[0].status).toBe("atrasado");
    expect([undefined, ""]).toContain(chamada[0].busca);
    expect(aba("Atrasados")).toHaveAttribute("aria-pressed", "true");
    expect(aba("Todos")).toHaveAttribute("aria-pressed", "false");
  });

  it.each([
    ["Ativos", "ativo"],
    ["Atrasados", "atrasado"],
    ["Devolvidos", "devolvido"],
  ])(
    'aba "%s" envia status "%s" mantendo a última busca enviada',
    async (nomeAba, status) => {
      // E4 · ListaEmprestimos · aba mantém a última busca enviada (#797, CT8, 6.12)
      const { user } = await renderizar();
      await buscar(user, "Lucas");
      await waitFor(() =>
        expect(consultarEmprestimos).toHaveBeenCalledTimes(2),
      );
      // texto digitado e não enviado não entra na consulta da aba
      await user.type(campoBusca(), " Joaquim");
      await user.click(aba(nomeAba));
      await waitFor(() =>
        expect(consultarEmprestimos).toHaveBeenCalledTimes(3),
      );
      expect(ultimaChamada()).toEqual([{ status, busca: "Lucas" }]);
      expect(aba(nomeAba)).toHaveAttribute("aria-pressed", "true");
    },
  );

  it('voltar para "Todos" envia status undefined mantendo a busca', async () => {
    // E4 · ListaEmprestimos · aba Todos sem filtro de status (#797, CT8)
    const { user } = await renderizar();
    await buscar(user, "Maria");
    await user.click(aba("Atrasados"));
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(3));
    await user.click(aba("Todos"));
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(4));
    const chamada = ultimaChamada();
    expect(chamada).toHaveLength(1);
    expect(chamada[0].status).toBeUndefined();
    expect(chamada[0].busca).toBe("Maria");
    expect(aba("Todos")).toHaveAttribute("aria-pressed", "true");
    expect(aba("Atrasados")).toHaveAttribute("aria-pressed", "false");
  });

  it('formulário "Pesquisar empréstimos" envia { status da aba atual, busca }', async () => {
    // E4 · ListaEmprestimos · busca com aba atual (#797, CT8)
    const { user } = await renderizar();
    expect(
      screen.getByRole("form", { name: "Pesquisar empréstimos" }),
    ).toBeInTheDocument();
    await buscar(user, "Lucas");
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(2));
    expect(ultimaChamada()).toHaveLength(1);
    expect(ultimaChamada()[0].busca).toBe("Lucas");
    expect(ultimaChamada()[0].status).toBeUndefined();
    await user.click(aba("Devolvidos"));
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(3));
    await buscar(user, "Ana");
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(4));
    expect(ultimaChamada()).toEqual([{ status: "devolvido", busca: "Ana" }]);
  });

  it("busca é enviada como digitada, sem trim", async () => {
    // E4 · ListaEmprestimos · busca sem trim (#797, CT8, esclarecimento 6.5)
    const { user } = await renderizar();
    await buscar(user, "  Lucas ");
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(2));
    expect(ultimaChamada()[0].busca).toBe("  Lucas ");
  });

  it("erro ao recarregar pela aba mostra role alert e mantém a lista anterior", async () => {
    // E4 · ListaEmprestimos · erro de recarga mantém lista (#797, F4, esclarecimento 6.5)
    const { user } = await renderizar();
    consultarEmprestimos.mockRejectedValue(erroApi("STATUS_INVALIDO", 400));
    await user.click(aba("Atrasados"));
    const alerta = await screen.findByRole("alert");
    expect(textoDe(alerta)).toBe(MENSAGENS_ERRO.STATUS_INVALIDO);
    expect(within(tabela()).getByText("Lucas Joaquim")).toBeInTheDocument();
    expect(within(tabela()).getByText("Maria Souza")).toBeInTheDocument();
    expect(within(tabela()).getByText("Ana Lima")).toBeInTheDocument();
  });

  it('lista vazia mostra "Nenhum empréstimo encontrado."', async () => {
    // E4 · ListaEmprestimos · estado vazio (#797, CT8)
    consultarEmprestimos.mockResolvedValue({ emprestimos: [], total: 0 });
    render(<ListaEmprestimos />);
    expect(
      await screen.findByText("Nenhum empréstimo encontrado."),
    ).toBeInTheDocument();
  });

  it.each([["STATUS_INVALIDO"], ["BUSCA_INVALIDA"], ["SEM_CONEXAO"]])(
    "erro de carga %s aparece em role alert",
    async (codigo) => {
      // E4 · ListaEmprestimos · erro de carga (#797, CT8, F6)
      consultarEmprestimos.mockRejectedValue(
        erroApi(codigo, codigo === "SEM_CONEXAO" ? 0 : 400),
      );
      render(<ListaEmprestimos />);
      const alerta = await screen.findByRole("alert");
      expect(textoDe(alerta)).toBe(MENSAGENS_ERRO[codigo]);
    },
  );
});

describe("E4 · ListaEmprestimos · tabela e situação (#797, CT8, F7)", () => {
  it('tabela "Empréstimos" tem as colunas na ordem do contrato interno', async () => {
    // E4 · ListaEmprestimos · cabeçalhos da tabela (#797, 6.12)
    await renderizar();
    const cabecalhos = within(tabela())
      .getAllByRole("columnheader")
      .map((c) => c.textContent.trim());
    expect(cabecalhos).toEqual([
      "Usuário",
      "Livro",
      "Emprestado em",
      "Devolver até",
      "Devolvido em",
      "Situação",
      "Ação",
    ]);
  });

  it('linha ativa: dados, datas formatadas, "—" sem devolução, selo Ativo e botão Devolver', async () => {
    // E4 · ListaEmprestimos · linha de empréstimo ativo (#797, #799, CT8)
    await renderizar();
    const linha = linhaDe("Lucas Joaquim");
    const c = celulas(linha);
    expect(c).toHaveLength(7);
    expect(c[COL.usuario]).toHaveTextContent("Lucas Joaquim");
    expect(c[COL.livro]).toHaveTextContent(
      "Fundamentos de Sistemas de Informação",
    );
    expect(c[COL.emprestadoEm]).toHaveTextContent(/^13\/10\/2026 19:20$/);
    expect(c[COL.devolverAte]).toHaveTextContent(/^28\/10\/2026 19:20$/);
    expect(c[COL.devolvidoEm]).toHaveTextContent(/^—$/);
    const selo = within(c[COL.situacao]).getByText("Ativo");
    expect(selo).toHaveClass("selo", "selo-ativo");
    expect(c[COL.devolverAte]).not.toHaveClass("data-atrasada");
    expect(linha.querySelector(".data-atrasada")).toBeNull();
    expect(
      within(c[COL.acao]).getByRole("button", {
        name: "Devolver empréstimo 9001",
      }),
    ).toHaveTextContent("Devolver");
  });

  it('linha atrasada: selo vermelho (selo-atrasado), "Devolver até" com classe data-atrasada e botão Devolver', async () => {
    // E4 · ListaEmprestimos · destaque de atrasado (#797, #799, F7)
    await renderizar();
    const linha = linhaDe("Maria Souza");
    const c = celulas(linha);
    expect(c[COL.devolverAte]).toHaveTextContent(/^16\/09\/2026 10:05$/);
    expect(c[COL.devolverAte]).toHaveClass("data-atrasada");
    expect(c[COL.devolvidoEm]).toHaveTextContent(/^—$/);
    expect(within(c[COL.situacao]).getByText("Atrasado")).toHaveClass(
      "selo",
      "selo-atrasado",
    );
    for (const i of [
      COL.usuario,
      COL.livro,
      COL.emprestadoEm,
      COL.devolvidoEm,
      COL.situacao,
      COL.acao,
    ]) {
      expect(c[i]).not.toHaveClass("data-atrasada");
    }
    expect(
      within(c[COL.acao]).getByRole("button", {
        name: "Devolver empréstimo 9002",
      }),
    ).toBeInTheDocument();
  });

  it("linha devolvida: data de devolução formatada, selo Devolvido, sem data-atrasada e sem botão", async () => {
    // E4 · ListaEmprestimos · linha devolvida sem ação (#797, #799, CT8)
    await renderizar();
    const linha = linhaDe("Ana Lima");
    const c = celulas(linha);
    expect(c[COL.devolvidoEm]).toHaveTextContent(/^20\/08\/2026 14:45$/);
    expect(within(c[COL.situacao]).getByText("Devolvido")).toHaveClass(
      "selo",
      "selo-devolvido",
    );
    expect(linha.querySelector(".data-atrasada")).toBeNull();
    expect(within(linha).queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Devolver empréstimo 9003" }),
    ).not.toBeInTheDocument();
  });
});

describe("E4 · ListaEmprestimos · devolução (#799, CT6)", () => {
  it("devolução de ativo: chama registrarDevolucao(id) e atualiza a linha sem recarregar", async () => {
    // E4 · ListaEmprestimos · devolução de ativo (#799, CT6)
    registrarDevolucao.mockResolvedValue({
      emprestimoId: 9001,
      livroId: 101,
      status: "devolvido",
      devolvidoEm: "2026-10-15T16:30:00",
      quantidadeDisponivel: 3,
    });
    const { user } = await renderizar();
    await user.click(
      screen.getByRole("button", { name: "Devolver empréstimo 9001" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      /^Devolução registrada\.$/,
    );
    expect(registrarDevolucao).toHaveBeenCalledTimes(1);
    expect(registrarDevolucao).toHaveBeenCalledWith(9001);
    const c = celulas(linhaDe("Lucas Joaquim"));
    expect(within(c[COL.situacao]).getByText("Devolvido")).toHaveClass(
      "selo",
      "selo-devolvido",
    );
    expect(c[COL.devolvidoEm]).toHaveTextContent(/^15\/10\/2026 16:30$/);
    expect(
      screen.queryByRole("button", { name: "Devolver empréstimo 9001" }),
    ).not.toBeInTheDocument();
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("devolução de atrasado: linha vira devolvida e perde o destaque vermelho", async () => {
    // E4 · ListaEmprestimos · devolução de atrasado (#799, CT6)
    registrarDevolucao.mockResolvedValue({
      emprestimoId: 9002,
      livroId: 102,
      status: "devolvido",
      devolvidoEm: "2026-10-20T09:15:00",
      quantidadeDisponivel: 1,
    });
    const { user } = await renderizar();
    await user.click(
      screen.getByRole("button", { name: "Devolver empréstimo 9002" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Devolução registrada.",
    );
    expect(registrarDevolucao).toHaveBeenCalledWith(9002);
    const linha = linhaDe("Maria Souza");
    const c = celulas(linha);
    expect(within(c[COL.situacao]).getByText("Devolvido")).toHaveClass(
      "selo-devolvido",
    );
    expect(within(linha).queryByText("Atrasado")).not.toBeInTheDocument();
    expect(c[COL.devolvidoEm]).toHaveTextContent(/^20\/10\/2026 09:15$/);
    expect(c[COL.devolverAte]).not.toHaveClass("data-atrasada");
    expect(within(linha).queryByRole("button")).not.toBeInTheDocument();
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
    // as outras linhas não mudam
    expect(
      screen.getByRole("button", { name: "Devolver empréstimo 9001" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["EMPRESTIMO_NAO_ENCONTRADO", 404],
    ["EMPRESTIMO_JA_DEVOLVIDO", 409],
    ["SEM_CONEXAO", 0],
  ])(
    "erro %s na devolução: role alert com a mensagem do mapa e linha inalterada",
    async (codigo, httpStatus) => {
      // E4 · ListaEmprestimos · erro da ficha CT6 / SEM_CONEXAO (#799, CT6, F4, F6)
      registrarDevolucao.mockRejectedValue(erroApi(codigo, httpStatus));
      const { user } = await renderizar();
      await user.click(
        screen.getByRole("button", { name: "Devolver empréstimo 9001" }),
      );
      const alerta = await screen.findByRole("alert");
      expect(textoDe(alerta)).toBe(MENSAGENS_ERRO[codigo]);
      expect(alerta).not.toHaveTextContent(
        `mensagem do servidor para ${codigo}`,
      );
      const c = celulas(linhaDe("Lucas Joaquim"));
      expect(within(c[COL.situacao]).getByText("Ativo")).toHaveClass(
        "selo-ativo",
      );
      expect(c[COL.devolvidoEm]).toHaveTextContent(/^—$/);
      expect(
        screen.getByRole("button", { name: "Devolver empréstimo 9001" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
    },
  );
});

describe("E4 · ListaEmprestimos · recarga por tempo real e versão (#797, CT13, F10)", () => {
  it("evento CT13 novo (via rerender) recarrega com a aba e a busca atuais; evento null não recarrega", async () => {
    // E4 · ListaEmprestimos · recarga por bibliotecaAtualizada (#797, CT13)
    const { user, rerender } = await renderizar({ evento: null });
    await buscar(user, "Lucas");
    await user.click(aba("Atrasados"));
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(3));

    rerender(<ListaEmprestimos evento={eventoCt13()} />);
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(4));
    expect(ultimaChamada()).toEqual([{ status: "atrasado", busca: "Lucas" }]);

    // novo objeto com os mesmos campos também é um novo evento (6.13)
    rerender(<ListaEmprestimos evento={eventoCt13()} />);
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(5));
    expect(ultimaChamada()).toEqual([{ status: "atrasado", busca: "Lucas" }]);

    rerender(<ListaEmprestimos evento={null} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(consultarEmprestimos).toHaveBeenCalledTimes(5);
  });

  it("evento null na montagem e em rerender não causa recarga", async () => {
    // E4 · ListaEmprestimos · evento null ignorado (#797, CT13)
    const { rerender } = await renderizar({ evento: null });
    rerender(<ListaEmprestimos evento={null} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
  });

  it("mudança de reconexoes recarrega com a aba e a busca atuais", async () => {
    // E4 · ListaEmprestimos · reconexão do WebSocket busca de novo (#797, F10, CT13)
    const { user, rerender } = await renderizar({ reconexoes: 0 });
    await user.click(aba("Ativos"));
    await buscar(user, "Maria");
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(3));
    rerender(<ListaEmprestimos reconexoes={1} />);
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(4));
    expect(ultimaChamada()).toEqual([{ status: "ativo", busca: "Maria" }]);
  });

  it("mudança de versao recarrega com a aba e a busca atuais", async () => {
    // E4 · ListaEmprestimos · versao incrementada recarrega (#797, 6.12, 6.14)
    const { user, rerender } = await renderizar({ versao: 0 });
    await user.click(aba("Devolvidos"));
    await buscar(user, "Ana");
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(3));
    rerender(<ListaEmprestimos versao={1} />);
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(4));
    expect(ultimaChamada()).toEqual([{ status: "devolvido", busca: "Ana" }]);
  });

  it("recarga após evento mostra a lista nova devolvida pelo servidor", async () => {
    // E4 · ListaEmprestimos · lista atualizada após evento (#797, CT8, CT13)
    const { rerender } = await renderizar();
    consultarEmprestimos.mockResolvedValue({
      emprestimos: [
        { ...ATIVO, status: "devolvido", devolvidoEm: "2026-10-15T16:30:00" },
      ],
      total: 1,
    });
    rerender(<ListaEmprestimos evento={eventoCt13()} />);
    await waitFor(() =>
      expect(screen.queryByText("Maria Souza")).not.toBeInTheDocument(),
    );
    const c = celulas(linhaDe("Lucas Joaquim"));
    expect(c[COL.devolvidoEm]).toHaveTextContent(/^15\/10\/2026 16:30$/);
    expect(within(c[COL.situacao]).getByText("Devolvido")).toBeInTheDocument();
  });
});
