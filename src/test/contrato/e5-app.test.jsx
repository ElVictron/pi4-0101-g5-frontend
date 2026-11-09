import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  within,
  act,
  cleanup,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import * as api from "../../services/api.js";

vi.mock("../../services/api.js", () => ({
  API_BASE_URL: "http://localhost:8000",
  ApiError: class ApiError extends Error {
    constructor({ codigo, mensagem, status } = {}) {
      super(mensagem);
      this.name = "ApiError";
      this.codigo = codigo;
      this.mensagem = mensagem;
      this.status = status;
    }
  },
  cadastrarLivro: vi.fn(),
  consultarLivros: vi.fn(),
  listarDisponibilidade: vi.fn(),
  cadastrarUsuario: vi.fn(),
  consultarUsuarios: vi.fn(),
  registrarEmprestimo: vi.fn(),
  consultarEmprestimos: vi.fn(),
  registrarDevolucao: vi.fn(),
}));

class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.closeCalls = 0;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closeCalls += 1;
    if (this.readyState === 3) return;
    this.readyState = 3;
    if (this.onclose) this.onclose({ code: 1000, wasClean: true });
  }

  abrir() {
    this.readyState = 1;
    if (this.onopen) this.onopen({});
  }

  receber(data) {
    if (this.onmessage) this.onmessage({ data });
  }

  cair() {
    this.readyState = 3;
    if (this.onclose) this.onclose({ code: 1006, wasClean: false });
  }
}

const ultima = () =>
  FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

const LIVRO_X = {
  id: 101,
  titulo: "Livro X",
  quantidadeExemplares: 3,
  quantidadeDisponivel: 2,
  disponivel: true,
};

const MSG_EMPRESTIMO = {
  tipo: "emprestimo_registrado",
  livroId: 101,
  emprestimoId: 9001,
  status: "ativo",
  quantidadeDisponivel: 1,
  atualizadaEm: "2026-10-13T19:20:00",
};

const BOTOES = ["Painel", "Acervo", "Usuários", "Empréstimos"];

const nav = () => screen.getByRole("navigation", { name: "Principal" });
const botaoNav = (nome) => within(nav()).getByRole("button", { name: nome });
const indicador = () => {
  const el = screen
    .getAllByRole("status")
    .find((s) => /Tempo real:/.test(s.textContent));
  expect(el).toBeTruthy();
  return el;
};

function celulasDoLivro(titulo) {
  const tabela = screen.getByRole("table", { name: "Livros disponíveis" });
  const linha = within(tabela)
    .getAllByRole("row")
    .find((r) => within(r).queryByText(titulo));
  expect(linha).toBeTruthy();
  return within(linha).getAllByRole("cell");
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
  vi.clearAllMocks();
  api.cadastrarLivro.mockResolvedValue({});
  api.consultarLivros.mockResolvedValue({
    livros: [],
    total: 0,
    pagina: 1,
    tamanho: 20,
  });
  api.listarDisponibilidade.mockResolvedValue({ livros: [] });
  api.cadastrarUsuario.mockResolvedValue({});
  api.consultarUsuarios.mockResolvedValue({
    usuarios: [],
    total: 0,
    pagina: 1,
    tamanho: 20,
  });
  api.registrarEmprestimo.mockResolvedValue({});
  api.consultarEmprestimos.mockResolvedValue({ emprestimos: [], total: 0 });
  api.registrarDevolucao.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("E5 · App · navegação", () => {
  it("nav Principal com os quatro botões", async () => {
    // E5 · App · <nav aria-label="Principal"> com Painel, Acervo, Usuários, Empréstimos (6.14)
    render(<App />);
    expect(nav()).toBeInTheDocument();
    for (const nome of BOTOES) {
      expect(botaoNav(nome)).toBeInTheDocument();
    }
    await waitFor(() => expect(api.listarDisponibilidade).toHaveBeenCalled());
  });

  it('página inicial é o Painel com aria-current="page"', async () => {
    // E5 · App · inicial Painel, aria-current="page" no ativo (6.14)
    render(<App />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Painel de disponibilidade",
      }),
    ).toBeInTheDocument();
    expect(botaoNav("Painel")).toHaveAttribute("aria-current", "page");
    for (const nome of ["Acervo", "Usuários", "Empréstimos"]) {
      expect(botaoNav(nome)).not.toHaveAttribute("aria-current", "page");
    }
    await waitFor(() => expect(api.listarDisponibilidade).toHaveBeenCalled());
  });

  it.each([
    ["Acervo", "Acervo"],
    ["Usuários", "Usuários"],
    ["Empréstimos", "Empréstimos"],
    ["Painel", "Painel de disponibilidade"],
  ])(
    'clicar em %s mostra o h1 "%s" e move aria-current',
    async (botao, titulo) => {
      // E5 · App · navegação troca a página e o aria-current (6.14)
      const user = userEvent.setup();
      render(<App />);
      if (botao === "Painel") {
        await user.click(botaoNav("Acervo"));
        await screen.findByRole("heading", { level: 1, name: "Acervo" });
      }
      await user.click(botaoNav(botao));
      expect(
        await screen.findByRole("heading", { level: 1, name: titulo }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(botaoNav(botao)).toHaveAttribute("aria-current", "page");
      for (const outro of BOTOES.filter((b) => b !== botao)) {
        expect(botaoNav(outro)).not.toHaveAttribute("aria-current", "page");
      }
    },
  );
});

describe("E5 · App · indicador de tempo real", () => {
  it("mostra desconectado e passa a conectado depois do onopen", async () => {
    // E5 · App · role="status" com "Tempo real: desconectado" / "Tempo real: conectado" (6.14, 6.13)
    render(<App />);
    expect(indicador()).toHaveTextContent("Tempo real: desconectado");
    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(1);

    act(() => ultima().abrir());
    expect(indicador()).toHaveTextContent("Tempo real: conectado");
    expect(indicador()).not.toHaveTextContent("desconectado");
    await waitFor(() => expect(api.listarDisponibilidade).toHaveBeenCalled());
  });

  it("volta a desconectado quando a conexão cai", async () => {
    // E5 · App · onclose → "Tempo real: desconectado" (6.14, 6.13)
    render(<App />);
    act(() => ultima().abrir());
    expect(indicador()).toHaveTextContent("Tempo real: conectado");
    act(() => ultima().cair());
    expect(indicador()).toHaveTextContent("Tempo real: desconectado");
    await waitFor(() => expect(api.listarDisponibilidade).toHaveBeenCalled());
  });
});

describe("E5 · App · eventos CT13 nas telas", () => {
  it("mensagem válida com o Painel aberto atualiza a quantidade sem nova consulta", async () => {
    // E5 · App · evento do socket chega ao Painel e atualiza quantidadeDisponivel (6.14, 6.8, #791, CT13)
    api.listarDisponibilidade.mockResolvedValue({ livros: [LIVRO_X] });
    render(<App />);
    await screen.findByText("Livro X");
    expect(celulasDoLivro("Livro X")[1]).toHaveTextContent(/^2$/);
    expect(api.listarDisponibilidade).toHaveBeenCalledTimes(1);

    act(() => ultima().abrir());
    act(() => ultima().receber(JSON.stringify(MSG_EMPRESTIMO)));

    await waitFor(() =>
      expect(celulasDoLivro("Livro X")[1]).toHaveTextContent(/^1$/),
    );
    expect(celulasDoLivro("Livro X")[2]).toHaveTextContent(/^3$/);
    expect(api.listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("reconexão com o Painel aberto busca a disponibilidade de novo", async () => {
    // E5 · App · ao reconectar o Painel chama listarDisponibilidade de novo (F10, #791, CT13)
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ["setTimeout", "clearTimeout"],
    });
    api.listarDisponibilidade.mockResolvedValue({ livros: [LIVRO_X] });
    render(<App />);
    await screen.findByText("Livro X");
    expect(api.listarDisponibilidade).toHaveBeenCalledTimes(1);

    const primeira = ultima();
    act(() => primeira.abrir());
    act(() => primeira.cair());
    act(() => vi.advanceTimersByTime(3000));
    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(2);
    const segunda = ultima();
    expect(segunda).not.toBe(primeira);
    expect(api.listarDisponibilidade).toHaveBeenCalledTimes(1);

    act(() => segunda.abrir());
    await waitFor(() =>
      expect(api.listarDisponibilidade).toHaveBeenCalledTimes(2),
    );
    expect(api.listarDisponibilidade).toHaveBeenLastCalledWith();
  });

  it("mensagem válida com Empréstimos aberto recarrega a lista de empréstimos", async () => {
    // E5 · App · evento do socket chega a Empréstimos e recarrega consultarEmprestimos (6.14, 6.12, #797, CT13)
    const user = userEvent.setup();
    render(<App />);
    await user.click(botaoNav("Empréstimos"));
    await screen.findByRole("heading", { level: 1, name: "Empréstimos" });
    await waitFor(() =>
      expect(api.consultarEmprestimos).toHaveBeenCalledTimes(1),
    );

    act(() => ultima().abrir());
    act(() => ultima().receber(JSON.stringify(MSG_EMPRESTIMO)));

    await waitFor(() =>
      expect(api.consultarEmprestimos).toHaveBeenCalledTimes(2),
    );
  });

  it("reconexão com Empréstimos aberto recarrega a lista de empréstimos", async () => {
    // E5 · App · ao reconectar Empréstimos chama consultarEmprestimos de novo (F10, #797, CT13)
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ["setTimeout", "clearTimeout"],
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(botaoNav("Empréstimos"));
    await screen.findByRole("heading", { level: 1, name: "Empréstimos" });
    await waitFor(() =>
      expect(api.consultarEmprestimos).toHaveBeenCalledTimes(1),
    );

    const primeira = ultima();
    act(() => primeira.abrir());
    act(() => primeira.cair());
    act(() => vi.advanceTimersByTime(3000));
    const segunda = ultima();
    expect(segunda).not.toBe(primeira);
    act(() => segunda.abrir());

    await waitFor(() =>
      expect(api.consultarEmprestimos).toHaveBeenCalledTimes(2),
    );
  });

  it("mensagem inválida não altera o Painel", async () => {
    // E5 · App · mensagem fora do CT13 é ignorada (6.13, CT13)
    api.listarDisponibilidade.mockResolvedValue({ livros: [LIVRO_X] });
    render(<App />);
    await screen.findByText("Livro X");
    act(() => ultima().abrir());
    expect(() =>
      act(() =>
        ultima().receber(JSON.stringify({ ...MSG_EMPRESTIMO, livroId: "101" })),
      ),
    ).not.toThrow();
    expect(celulasDoLivro("Livro X")[1]).toHaveTextContent(/^2$/);
    expect(api.listarDisponibilidade).toHaveBeenCalledTimes(1);
  });
});
