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
  cadastrarUsuario,
  consultarUsuarios,
} from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";
import CadastroUsuario from "../../features/usuarios/CadastroUsuario.jsx";
import PesquisaUsuarios from "../../features/usuarios/PesquisaUsuarios.jsx";

// Dados no formato do CT4
const LUCAS = {
  id: 55,
  nome: "Lucas Joaquim",
  cpf: "12345678900",
  contato: "lucas@email.com",
  emprestimos: [],
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

function respostaEco(total, usuarios = [LUCAS, MARIA]) {
  return async ({ pagina = 1, tamanho = 20 } = {}) => ({
    usuarios,
    total,
    pagina,
    tamanho,
  });
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

async function buscar(user, termo) {
  const campo = screen.getByLabelText("Buscar usuários");
  await user.clear(campo);
  if (termo) await user.type(campo, termo);
  await user.click(screen.getByRole("button", { name: "Buscar" }));
}

function semPaginacao() {
  expect(screen.queryByText(/^Total:/)).toBeNull();
  expect(screen.queryByText(/^Página/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Próxima" })).toBeNull();
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("E6 · PesquisaUsuarios · reforço (#800, CT4, 6.10, 6.15)", () => {
  it("busca é enviada sem trim", async () => {
    // E6 · PesquisaUsuarios · campo de busca enviado como digitado, sem trim (6.5 esclarecimentos)
    consultarUsuarios.mockResolvedValue(resposta([LUCAS, MARIA]));
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await screen.findByText("Total: 2");
    await buscar(user, "  abc  ");
    expect(consultarUsuarios).toHaveBeenLastCalledWith({
      busca: "  abc  ",
      pagina: 1,
      tamanho: 20,
    });
  });

  it("Próxima antes de qualquer busca enviada manda busca ''", async () => {
    // E6 · PesquisaUsuarios · navegar antes de buscar → busca '' (6.5 esclarecimentos, 6.10)
    consultarUsuarios.mockImplementation(respostaEco(45));
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await screen.findByText("Página 1 de 3");
    await user.type(screen.getByLabelText("Buscar usuários"), "rascunho");
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3");
    expect(consultarUsuarios).toHaveBeenLastCalledWith({
      busca: "",
      pagina: 2,
      tamanho: 20,
    });
  });

  it("Carregando... não tem role status", async () => {
    // E6 · PesquisaUsuarios · Carregando... é texto simples, sem role status (6.5 esclarecimentos)
    const d = adiado();
    consultarUsuarios.mockReturnValue(d.promessa);
    render(<PesquisaUsuarios />);
    expect(await screen.findByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    d.resolver(resposta([LUCAS]));
    await screen.findByText("Total: 1");
  });

  it("role alert contém exatamente o texto da mensagem", async () => {
    // E6 · PesquisaUsuarios · alert só com a mensagem de BUSCA_INVALIDA (6.5 esclarecimentos, F6)
    consultarUsuarios.mockResolvedValueOnce(resposta([LUCAS]));
    consultarUsuarios.mockRejectedValueOnce(erroApi("BUSCA_INVALIDA"));
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await screen.findByText("Total: 1");
    await buscar(user, "x");
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.BUSCA_INVALIDA);
  });

  it("erro ao paginar mantém a lista (F4)", async () => {
    // E6 · PesquisaUsuarios · Próxima falha → alert e lista anterior mantida (F4, 6.5 esclarecimentos)
    consultarUsuarios.mockResolvedValueOnce(resposta([LUCAS], { total: 45 }));
    consultarUsuarios.mockRejectedValueOnce(erroApi("ERRO_INTERNO", 500));
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await screen.findByRole("article", { name: LUCAS.nome });
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.ERRO_INTERNO);
    expect(
      screen.getByRole("article", { name: LUCAS.nome }),
    ).toBeInTheDocument();
  });

  it("erro na recarga por versao mantém a lista (F4)", async () => {
    // E6 · PesquisaUsuarios · recarga por versao falha → alert e lista mantida (F4, 6.10)
    consultarUsuarios.mockResolvedValueOnce(resposta([LUCAS, MARIA]));
    consultarUsuarios.mockRejectedValueOnce(erroApi("SEM_CONEXAO", 0));
    const { rerender } = render(<PesquisaUsuarios versao={0} />);
    await screen.findByRole("article", { name: MARIA.nome });
    rerender(<PesquisaUsuarios versao={1} />);
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.SEM_CONEXAO);
    expect(consultarUsuarios).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("article", { name: LUCAS.nome }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: MARIA.nome }),
    ).toBeInTheDocument();
  });

  it("antes da primeira resposta com sucesso não há Total, Página nem botões de paginação", async () => {
    // E6 · PesquisaUsuarios · sem paginação antes do primeiro sucesso (6.15.2)
    const d = adiado();
    consultarUsuarios.mockReturnValue(d.promessa);
    render(<PesquisaUsuarios />);
    await screen.findByText("Carregando...");
    semPaginacao();
    d.resolver(resposta([LUCAS]));
    expect(await screen.findByText("Total: 1")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("carga inicial com erro não mostra paginação; aparece depois do primeiro sucesso", async () => {
    // E6 · PesquisaUsuarios · falha inicial sem Total/Página/botões; surgem após sucesso (6.15.2)
    consultarUsuarios.mockRejectedValueOnce(erroApi("ERRO_INTERNO", 500));
    consultarUsuarios.mockResolvedValueOnce(resposta([LUCAS], { total: 30 }));
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await screen.findByRole("alert");
    semPaginacao();
    await buscar(user, "Lucas");
    expect(await screen.findByText("Total: 30")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Anterior" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();
  });

  it("respostas fora de ordem: vale a busca mais nova", async () => {
    // E6 · PesquisaUsuarios · resposta antiga que chega depois é ignorada (6.15.3)
    consultarUsuarios.mockResolvedValueOnce(resposta([]));
    const d1 = adiado();
    const d2 = adiado();
    consultarUsuarios.mockReturnValueOnce(d1.promessa);
    consultarUsuarios.mockReturnValueOnce(d2.promessa);
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await screen.findByText("Nenhum usuário encontrado.");
    await buscar(user, "Lucas");
    await buscar(user, "Maria");
    await act(async () => {
      d2.resolver(resposta([MARIA]));
    });
    await screen.findByRole("article", { name: MARIA.nome });
    await act(async () => {
      d1.resolver(resposta([LUCAS]));
    });
    await aguardar();
    expect(
      screen.getByRole("article", { name: MARIA.nome }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: LUCAS.nome })).toBeNull();
    expect(screen.getByText("Total: 1")).toBeInTheDocument();
  });
});

describe("E6 · CadastroUsuario · reforço (#787, CT3, 6.9)", () => {
  it("CPF com espaços nas pontas é enviado sem alteração", async () => {
    // E6 · CadastroUsuario · textos digitados enviados sem alteração, sem trim (6.9, F5)
    cadastrarUsuario.mockResolvedValue({ id: 55, ...LUCAS });
    const user = userEvent.setup();
    render(<CadastroUsuario onCadastrado={vi.fn()} />);
    await user.type(screen.getByLabelText("Nome"), "Lucas Joaquim");
    await user.type(screen.getByLabelText("CPF"), "  12345678900  ");
    await user.type(
      screen.getByLabelText("Contato (e-mail ou telefone)"),
      "lucas@email.com",
    );
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await screen.findByRole("status");
    expect(cadastrarUsuario).toHaveBeenCalledTimes(1);
    expect(cadastrarUsuario).toHaveBeenCalledWith({
      nome: "Lucas Joaquim",
      cpf: "  12345678900  ",
      contato: "lucas@email.com",
    });
  });

  it("role alert contém exatamente o texto da mensagem", async () => {
    // E6 · CadastroUsuario · alert só com a mensagem de CPF_DUPLICADO (6.5 esclarecimentos, F6)
    cadastrarUsuario.mockRejectedValue(erroApi("CPF_DUPLICADO", 409));
    const user = userEvent.setup();
    render(<CadastroUsuario onCadastrado={vi.fn()} />);
    await user.type(screen.getByLabelText("CPF"), "12345678900");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.CPF_DUPLICADO);
  });
});
