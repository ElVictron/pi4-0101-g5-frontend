import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
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
  consultarEmprestimos,
  registrarDevolucao,
  listarDisponibilidade,
  consultarUsuarios,
  registrarEmprestimo,
} from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";
import ListaEmprestimos from "../../features/emprestimos/ListaEmprestimos.jsx";
import RegistrarEmprestimo from "../../features/emprestimos/RegistrarEmprestimo.jsx";

// ---------- dados no formato do CT8 ----------
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
const LISTA = { emprestimos: [ATIVO, ATRASADO], total: 2 };

// Resposta no formato do CT6
const DEVOLUCAO_CT6 = {
  ...ATIVO,
  status: "devolvido",
  devolvidoEm: "2026-10-20T09:15:00",
};

// Evento no formato do CT13
const EVENTO_CT13 = {
  tipo: "devolucao_registrada",
  livroId: 101,
  emprestimoId: 9001,
  status: "devolvido",
  quantidadeDisponivel: 3,
  atualizadaEm: "2026-10-15T16:30:00",
};

// ---------- dados do RegistrarEmprestimo (CT4, CT5, CT7) ----------
const LIVROS = [
  {
    id: 101,
    titulo: "Fundamentos de Sistemas de Informação",
    quantidadeExemplares: 3,
    quantidadeDisponivel: 2,
    disponivel: true,
  },
];
const LUCAS = {
  id: 55,
  nome: "Lucas Joaquim",
  cpf: "12345678900",
  contato: "lucas@email.com",
  emprestimos: [],
};
const SILVA = {
  id: 56,
  nome: "Lucas Silva",
  cpf: "98765432100",
  contato: "19999990000",
  emprestimos: [],
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
const OPCAO_101 = "Fundamentos de Sistemas de Informação (disponíveis: 2)";
const RADIO_55 = "Lucas Joaquim (CPF 12345678900)";
const RADIO_56 = "Lucas Silva (CPF 98765432100)";

function usuarios(lista) {
  return { usuarios: lista, total: lista.length, pagina: 1, tamanho: 20 };
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
  let rejeitar;
  const promessa = new Promise((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

async function aguardar(ms = 30) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

// ---------- helpers ListaEmprestimos ----------
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

async function renderizarLista(props = {}) {
  const user = userEvent.setup();
  render(<ListaEmprestimos {...props} />);
  await screen.findByText("Lucas Joaquim");
  return { user };
}

async function buscarEmprestimos(user, termo) {
  await user.clear(campoBusca());
  await user.type(campoBusca(), termo);
  await user.click(screen.getByRole("button", { name: "Buscar" }));
}

// ---------- helpers RegistrarEmprestimo ----------
function campoBuscaUsuario() {
  return screen.getByLabelText("Buscar usuário", { selector: "input" });
}

function botaoBuscaUsuario() {
  return screen.getByRole("button", { name: "Buscar usuário" });
}

function selectLivro() {
  return screen.getByRole("combobox", { name: "Livro" });
}

function botaoRegistrar() {
  return screen.getByRole("button", { name: "Registrar empréstimo" });
}

async function renderizarRegistro() {
  const user = userEvent.setup();
  const onRegistrado = vi.fn();
  render(<RegistrarEmprestimo onRegistrado={onRegistrado} />);
  await screen.findByRole("option", { name: OPCAO_101 });
  return { user, onRegistrado };
}

async function escolherLucas(user) {
  await user.type(campoBuscaUsuario(), "Lucas");
  await user.click(botaoBuscaUsuario());
  const radio = await screen.findByRole("radio", { name: RADIO_55 });
  await user.click(radio);
  return radio;
}

beforeEach(() => {
  vi.resetAllMocks();
  consultarEmprestimos.mockResolvedValue(LISTA);
  registrarDevolucao.mockResolvedValue(DEVOLUCAO_CT6);
  listarDisponibilidade.mockResolvedValue({ livros: LIVROS });
  consultarUsuarios.mockResolvedValue(usuarios([LUCAS, SILVA]));
  registrarEmprestimo.mockResolvedValue(RESPOSTA_CT5);
});

afterEach(() => {
  cleanup();
});

describe("E6 · ListaEmprestimos · reforço (#797, #799, CT6, CT8, CT13, 6.12)", () => {
  it("busca é enviada sem trim", async () => {
    // E6 · ListaEmprestimos · campo de busca enviado como digitado, sem trim (6.5 esclarecimentos)
    const { user } = await renderizarLista();
    await buscarEmprestimos(user, "  abc  ");
    const chamada = ultimaChamada();
    expect(chamada).toHaveLength(1);
    expect(chamada[0].busca).toBe("  abc  ");
    expect(chamada[0].status).toBeUndefined();
  });

  it("Carregando... não tem role status", async () => {
    // E6 · ListaEmprestimos · Carregando... é texto simples, sem role status (6.5 esclarecimentos)
    const d = adiado();
    consultarEmprestimos.mockReturnValue(d.promessa);
    render(<ListaEmprestimos />);
    expect(await screen.findByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    d.resolver(LISTA);
    await screen.findByText("Lucas Joaquim");
  });

  it("role alert contém exatamente o texto da mensagem", async () => {
    // E6 · ListaEmprestimos · alert só com a mensagem de BUSCA_INVALIDA (6.5 esclarecimentos, F6)
    const { user } = await renderizarLista();
    consultarEmprestimos.mockRejectedValueOnce(erroApi("BUSCA_INVALIDA"));
    await buscarEmprestimos(user, "x");
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.BUSCA_INVALIDA);
  });

  it("evento já não nulo na montagem não gera chamada extra", async () => {
    // E6 · ListaEmprestimos · evento recebido antes da montagem não recarrega (6.13, 6.12)
    render(<ListaEmprestimos evento={EVENTO_CT13} />);
    await screen.findByText("Lucas Joaquim");
    await aguardar();
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
  });

  it("status de devolução some quando uma nova busca começa", async () => {
    // E6 · ListaEmprestimos · status some ao iniciar nova busca (6.15.1)
    const { user } = await renderizarLista();
    await user.click(
      screen.getByRole("button", { name: "Devolver empréstimo 9001" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Devolução registrada.",
    );
    const d = adiado();
    consultarEmprestimos.mockReturnValueOnce(d.promessa);
    await buscarEmprestimos(user, "Maria");
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => {
      d.resolver(LISTA);
    });
  });

  it("status de devolução some quando a troca de aba começa", async () => {
    // E6 · ListaEmprestimos · status some ao trocar de aba (6.15.1)
    const { user } = await renderizarLista();
    await user.click(
      screen.getByRole("button", { name: "Devolver empréstimo 9001" }),
    );
    await screen.findByRole("status");
    const d = adiado();
    consultarEmprestimos.mockReturnValueOnce(d.promessa);
    await user.click(aba("Ativos"));
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => {
      d.resolver(LISTA);
    });
  });

  it("erro some quando a troca de aba começa", async () => {
    // E6 · ListaEmprestimos · alert some ao trocar de aba (6.15.1)
    const { user } = await renderizarLista();
    consultarEmprestimos.mockRejectedValueOnce(erroApi("ERRO_INTERNO", 500));
    await buscarEmprestimos(user, "x");
    await screen.findByRole("alert");
    const d = adiado();
    consultarEmprestimos.mockReturnValueOnce(d.promessa);
    await user.click(aba("Atrasados"));
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      d.resolver(LISTA);
    });
  });

  it("respostas fora de ordem ao trocar de aba: vale a aba mais nova", async () => {
    // E6 · ListaEmprestimos · resposta de aba anterior que chega depois é ignorada (6.15.3)
    const { user } = await renderizarLista();
    const d1 = adiado();
    const d2 = adiado();
    consultarEmprestimos.mockReturnValueOnce(d1.promessa);
    consultarEmprestimos.mockReturnValueOnce(d2.promessa);
    await user.click(aba("Ativos"));
    await user.click(aba("Atrasados"));
    await act(async () => {
      d2.resolver({ emprestimos: [ATRASADO], total: 1 });
    });
    await aguardar();
    await act(async () => {
      d1.resolver({ emprestimos: [ATIVO], total: 1 });
    });
    await aguardar();
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.queryByText("Lucas Joaquim")).toBeNull();
    expect(aba("Atrasados")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("E6 · RegistrarEmprestimo · reforço (#794, CT4, CT5, CT7, 6.11)", () => {
  it("Buscar usuário envia a busca sem trim", async () => {
    // E6 · RegistrarEmprestimo · busca de usuário enviada como digitada, sem trim (6.5 esclarecimentos)
    const { user } = await renderizarRegistro();
    await user.type(campoBuscaUsuario(), "  Lucas  ");
    await user.click(botaoBuscaUsuario());
    await screen.findByRole("radio", { name: RADIO_55 });
    expect(consultarUsuarios).toHaveBeenLastCalledWith({
      busca: "  Lucas  ",
      pagina: 1,
      tamanho: 20,
    });
  });

  it("role alert contém exatamente o texto da mensagem", async () => {
    // E6 · RegistrarEmprestimo · alert só com a mensagem de LIVRO_INDISPONIVEL (6.5 esclarecimentos, F6)
    registrarEmprestimo.mockRejectedValue(erroApi("LIVRO_INDISPONIVEL", 409));
    const { user } = await renderizarRegistro();
    await escolherLucas(user);
    await user.selectOptions(selectLivro(), "101");
    await user.click(botaoRegistrar());
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.LIVRO_INDISPONIVEL);
  });

  it("status de registro some quando uma nova busca de usuário começa", async () => {
    // E6 · RegistrarEmprestimo · status some ao iniciar nova busca de usuário (6.15.1)
    const { user } = await renderizarRegistro();
    await escolherLucas(user);
    await user.selectOptions(selectLivro(), "101");
    await user.click(botaoRegistrar());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Empréstimo registrado.",
    );
    const d = adiado();
    consultarUsuarios.mockReturnValueOnce(d.promessa);
    await user.click(botaoBuscaUsuario());
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => {
      d.resolver(usuarios([LUCAS, SILVA]));
    });
  });

  it("Enter no campo Buscar usuário busca usuários e não registra", async () => {
    // E6 · RegistrarEmprestimo · Enter em Buscar usuário faz a busca de usuário (6.15.4)
    const { user } = await renderizarRegistro();
    await user.type(campoBuscaUsuario(), "Lucas{Enter}");
    await screen.findByRole("radio", { name: RADIO_55 });
    await aguardar();
    expect(consultarUsuarios).toHaveBeenCalledWith({
      busca: "Lucas",
      pagina: 1,
      tamanho: 20,
    });
    expect(registrarEmprestimo).not.toHaveBeenCalled();
  });

  it("nova busca sem o usuário escolhido faz o envio mandar usuarioId null", async () => {
    // E6 · RegistrarEmprestimo · escolha desmarcada quando a nova busca não traz o usuário (6.15.4)
    const { user } = await renderizarRegistro();
    await escolherLucas(user);
    consultarUsuarios.mockResolvedValueOnce(usuarios([SILVA]));
    await user.clear(campoBuscaUsuario());
    await user.type(campoBuscaUsuario(), "Silva");
    await user.click(botaoBuscaUsuario());
    await screen.findByRole("radio", { name: RADIO_56 });
    expect(screen.queryByRole("radio", { name: RADIO_55 })).toBeNull();
    await user.selectOptions(selectLivro(), "101");
    await user.click(botaoRegistrar());
    await screen.findByRole("status");
    expect(registrarEmprestimo).toHaveBeenCalledTimes(1);
    expect(registrarEmprestimo).toHaveBeenCalledWith({
      usuarioId: null,
      livroId: 101,
    });
  });
});
