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
  cadastrarLivro,
  consultarLivros,
  listarDisponibilidade,
} from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";
import CadastroLivro from "../../features/livros/CadastroLivro.jsx";
import PesquisaLivros from "../../features/livros/PesquisaLivros.jsx";
import PainelDisponibilidade from "../../features/livros/PainelDisponibilidade.jsx";

// Dados no formato do CT2
const LIVRO_A = {
  id: 101,
  titulo: "Fundamentos de Sistemas de Informação",
  autor: "Ana Silva",
  isbn: "9780000000001",
  quantidadeExemplares: 3,
  quantidadeDisponivel: 2,
};
const LIVRO_B = {
  id: 102,
  titulo: "Banco de Dados",
  autor: "Carlos Souza",
  isbn: "9780000000002",
  quantidadeExemplares: 5,
  quantidadeDisponivel: 0,
};

// Dados no formato do CT7
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

// Evento no formato do CT13 (livro fora da lista, com exemplares)
const EVENTO_CT13 = {
  tipo: "devolucao_registrada",
  livroId: 103,
  emprestimoId: 9003,
  status: "devolvido",
  quantidadeDisponivel: 4,
  atualizadaEm: "2026-10-15T16:30:00",
};

function resposta(
  livros,
  { total = livros.length, pagina = 1, tamanho = 20 } = {},
) {
  return { livros, total, pagina, tamanho };
}

function respostaEco(total, livros = [LIVRO_A, LIVRO_B]) {
  return async ({ pagina = 1, tamanho = 20 } = {}) => ({
    livros,
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
  const campo = screen.getByLabelText("Buscar livros");
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

describe("E6 · PesquisaLivros · reforço (#789, CT2, 6.7, 6.15)", () => {
  it("busca é enviada sem trim", async () => {
    // E6 · PesquisaLivros · campo de busca enviado como digitado, sem trim (6.5 esclarecimentos)
    consultarLivros.mockResolvedValue(resposta([LIVRO_A, LIVRO_B]));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Total: 2");
    await buscar(user, "  abc  ");
    expect(consultarLivros).toHaveBeenLastCalledWith({
      busca: "  abc  ",
      pagina: 1,
      tamanho: 20,
    });
  });

  it("Próxima antes de qualquer busca enviada manda busca ''", async () => {
    // E6 · PesquisaLivros · navegar antes de buscar → busca '' (6.5 esclarecimentos, 6.7)
    consultarLivros.mockImplementation(respostaEco(45));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Página 1 de 3");
    // texto digitado sem enviar não conta como busca enviada
    await user.type(screen.getByLabelText("Buscar livros"), "rascunho");
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3");
    expect(consultarLivros).toHaveBeenLastCalledWith({
      busca: "",
      pagina: 2,
      tamanho: 20,
    });
  });

  it("Carregando... não tem role status", async () => {
    // E6 · PesquisaLivros · Carregando... é texto simples, sem role status (6.5 esclarecimentos)
    const d = adiado();
    consultarLivros.mockReturnValue(d.promessa);
    render(<PesquisaLivros />);
    expect(await screen.findByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    d.resolver(resposta([LIVRO_A]));
    await screen.findByText("Total: 1");
  });

  it("role alert contém exatamente o texto da mensagem", async () => {
    // E6 · PesquisaLivros · alert só com a mensagem de BUSCA_INVALIDA (6.5 esclarecimentos, F6)
    consultarLivros.mockResolvedValueOnce(resposta([LIVRO_A]));
    consultarLivros.mockRejectedValueOnce(erroApi("BUSCA_INVALIDA"));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Total: 1");
    await buscar(user, "x");
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.BUSCA_INVALIDA);
  });

  it("erro ao paginar mantém a lista (F4)", async () => {
    // E6 · PesquisaLivros · Próxima falha → alert e lista anterior mantida (F4, 6.5 esclarecimentos)
    consultarLivros.mockResolvedValueOnce(resposta([LIVRO_A], { total: 45 }));
    consultarLivros.mockRejectedValueOnce(erroApi("ERRO_INTERNO", 500));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText(LIVRO_A.titulo);
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.ERRO_INTERNO);
    const tabela = screen.getByRole("table", { name: "Livros" });
    expect(within(tabela).getByText(LIVRO_A.titulo)).toBeInTheDocument();
  });

  it("erro na recarga por versao mantém a lista (F4)", async () => {
    // E6 · PesquisaLivros · recarga por versao falha → alert e lista mantida (F4, 6.7)
    consultarLivros.mockResolvedValueOnce(resposta([LIVRO_A, LIVRO_B]));
    consultarLivros.mockRejectedValueOnce(erroApi("SEM_CONEXAO", 0));
    const { rerender } = render(<PesquisaLivros versao={0} />);
    await screen.findByText(LIVRO_B.titulo);
    rerender(<PesquisaLivros versao={1} />);
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.SEM_CONEXAO);
    expect(consultarLivros).toHaveBeenCalledTimes(2);
    const tabela = screen.getByRole("table", { name: "Livros" });
    expect(within(tabela).getByText(LIVRO_A.titulo)).toBeInTheDocument();
    expect(within(tabela).getByText(LIVRO_B.titulo)).toBeInTheDocument();
  });

  it("antes da primeira resposta com sucesso não há Total, Página nem botões de paginação", async () => {
    // E6 · PesquisaLivros · sem paginação antes do primeiro sucesso (6.15.2)
    const d = adiado();
    consultarLivros.mockReturnValue(d.promessa);
    render(<PesquisaLivros />);
    await screen.findByText("Carregando...");
    semPaginacao();
    d.resolver(resposta([LIVRO_A]));
    expect(await screen.findByText("Total: 1")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("carga inicial com erro não mostra paginação; aparece depois do primeiro sucesso", async () => {
    // E6 · PesquisaLivros · falha inicial sem Total/Página/botões; surgem após sucesso (6.15.2)
    consultarLivros.mockRejectedValueOnce(erroApi("ERRO_INTERNO", 500));
    consultarLivros.mockResolvedValueOnce(resposta([LIVRO_A], { total: 30 }));
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByRole("alert");
    semPaginacao();
    await buscar(user, "Fundamentos");
    expect(await screen.findByText("Total: 30")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Anterior" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();
  });

  it("respostas fora de ordem: vale a busca mais nova", async () => {
    // E6 · PesquisaLivros · resposta antiga que chega depois é ignorada (6.15.3)
    consultarLivros.mockResolvedValueOnce(resposta([]));
    const d1 = adiado();
    const d2 = adiado();
    consultarLivros.mockReturnValueOnce(d1.promessa);
    consultarLivros.mockReturnValueOnce(d2.promessa);
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Nenhum livro encontrado.");
    await buscar(user, "Fundamentos");
    await buscar(user, "Banco");
    await act(async () => {
      d2.resolver(resposta([LIVRO_B]));
    });
    await screen.findByText(LIVRO_B.titulo);
    await act(async () => {
      d1.resolver(resposta([LIVRO_A]));
    });
    await aguardar();
    expect(screen.getByText(LIVRO_B.titulo)).toBeInTheDocument();
    expect(screen.queryByText(LIVRO_A.titulo)).toBeNull();
    expect(screen.getByText("Total: 1")).toBeInTheDocument();
  });

  it("respostas fora de ordem: erro da busca antiga é ignorado", async () => {
    // E6 · PesquisaLivros · erro de consulta antiga que chega depois é ignorado (6.15.3)
    consultarLivros.mockResolvedValueOnce(resposta([]));
    const d1 = adiado();
    const d2 = adiado();
    consultarLivros.mockReturnValueOnce(d1.promessa);
    consultarLivros.mockReturnValueOnce(d2.promessa);
    const user = userEvent.setup();
    render(<PesquisaLivros />);
    await screen.findByText("Nenhum livro encontrado.");
    await buscar(user, "Fundamentos");
    await buscar(user, "Banco");
    await act(async () => {
      d2.resolver(resposta([LIVRO_B]));
    });
    await screen.findByText(LIVRO_B.titulo);
    await act(async () => {
      d1.rejeitar(erroApi("ERRO_INTERNO", 500));
    });
    await aguardar();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(LIVRO_B.titulo)).toBeInTheDocument();
  });
});

describe("E6 · PainelDisponibilidade · reforço (#791, CT7, CT13, 6.8)", () => {
  it("Carregando... não tem role status", async () => {
    // E6 · PainelDisponibilidade · Carregando... sem role status (6.5 esclarecimentos)
    const d = adiado();
    listarDisponibilidade.mockReturnValue(d.promessa);
    render(<PainelDisponibilidade />);
    expect(await screen.findByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    d.resolver({ livros: DISPONIVEIS });
    await screen.findByText(DISPONIVEIS[0].titulo);
  });

  it("evento já não nulo na montagem não gera chamada extra", async () => {
    // E6 · PainelDisponibilidade · evento recebido antes da montagem não recarrega (6.13, 6.8)
    listarDisponibilidade.mockResolvedValue({ livros: DISPONIVEIS });
    render(<PainelDisponibilidade evento={EVENTO_CT13} />);
    await screen.findByText(DISPONIVEIS[0].titulo);
    await aguardar();
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("role alert contém exatamente o texto da mensagem", async () => {
    // E6 · PainelDisponibilidade · alert só com a mensagem de ERRO_INTERNO (6.5 esclarecimentos)
    listarDisponibilidade.mockRejectedValue(erroApi("ERRO_INTERNO", 500));
    render(<PainelDisponibilidade />);
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.ERRO_INTERNO);
  });
});

describe("E6 · CadastroLivro · reforço (#785, CT1, 6.6)", () => {
  it("role alert contém exatamente o texto da mensagem", async () => {
    // E6 · CadastroLivro · alert só com a mensagem de ISBN_DUPLICADO (6.5 esclarecimentos, F6)
    cadastrarLivro.mockRejectedValue(erroApi("ISBN_DUPLICADO", 409));
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await user.type(screen.getByLabelText("Título"), "Livro");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO.ISBN_DUPLICADO);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cadastrar" })).toBeEnabled(),
    );
  });
});
