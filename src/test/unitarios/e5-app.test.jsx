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

vi.mock("../../services/api.js", () => ({
  cadastrarLivro: vi.fn(),
  consultarLivros: vi.fn(),
  listarDisponibilidade: vi.fn(),
  cadastrarUsuario: vi.fn(),
  consultarUsuarios: vi.fn(),
  registrarEmprestimo: vi.fn(),
  consultarEmprestimos: vi.fn(),
  registrarDevolucao: vi.fn(),
}));

import * as api from "../../services/api.js";
import App from "../../App.jsx";

class FakeWebSocket {
  static instancias = [];

  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    FakeWebSocket.instancias.push(this);
  }

  close() {
    if (this.fechado) return;
    this.fechado = true;
    if (this.onclose) this.onclose({});
  }

  abrir() {
    if (this.onopen) this.onopen({});
  }

  receber(data) {
    if (this.onmessage) this.onmessage({ data });
  }
}

const ultima = () =>
  FakeWebSocket.instancias[FakeWebSocket.instancias.length - 1];
const botaoNav = (nome) =>
  within(screen.getByRole("navigation", { name: "Principal" })).getByRole(
    "button",
    { name: nome },
  );
const indicador = () =>
  screen
    .getAllByRole("status")
    .find((el) => /Tempo real:/.test(el.textContent));

const MSG = JSON.stringify({
  tipo: "devolucao_registrada",
  livroId: 5,
  status: "devolvido",
  quantidadeDisponivel: 1,
  atualizadaEm: "2026-10-13T19:20:00",
});

beforeEach(() => {
  FakeWebSocket.instancias = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
  vi.resetAllMocks();
  api.consultarLivros.mockResolvedValue({ livros: [], total: 0 });
  api.listarDisponibilidade.mockResolvedValue({ livros: [] });
  api.consultarUsuarios.mockResolvedValue({ usuarios: [], total: 0 });
  api.consultarEmprestimos.mockResolvedValue({ emprestimos: [], total: 0 });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("E5 · App (unitário)", () => {
  it("cabeçalho mostra o título do sistema sem criar um segundo h1", async () => {
    render(<App />);
    expect(screen.getByText("Biblioteca")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await waitFor(() => expect(api.listarDisponibilidade).toHaveBeenCalled());
  });

  it("conecta uma única vez no WS_URL padrão", async () => {
    render(<App />);
    expect(FakeWebSocket.instancias).toHaveLength(1);
    expect(ultima().url).toBe(
      import.meta.env.VITE_WS_URL || "ws://localhost:8001/ws/biblioteca",
    );
    await waitFor(() => expect(api.listarDisponibilidade).toHaveBeenCalled());
  });

  it("indicador troca a classe (ponto verde/cinza) conforme a conexão", async () => {
    render(<App />);
    expect(indicador()).toHaveClass("app-tempo-real", "desconectado");
    expect(indicador().querySelector(".app-tempo-real-ponto")).not.toBeNull();
    act(() => ultima().abrir());
    expect(indicador()).toHaveClass("conectado");
    expect(indicador()).not.toHaveClass("desconectado");
    await waitFor(() => expect(api.listarDisponibilidade).toHaveBeenCalled());
  });

  it("item ativo da navegação recebe a classe ativo", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(botaoNav("Painel")).toHaveClass("ativo");
    await user.click(botaoNav("Usuários"));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Usuários" }),
    ).toBeInTheDocument();
    expect(botaoNav("Usuários")).toHaveClass("ativo");
    expect(botaoNav("Painel")).not.toHaveClass("ativo");
    await waitFor(() => expect(api.consultarUsuarios).toHaveBeenCalled());
  });

  it("evento recebido antes de abrir Empréstimos não gera recarga extra", async () => {
    const user = userEvent.setup();
    render(<App />);
    act(() => ultima().abrir());
    act(() => ultima().receber(MSG));
    await user.click(botaoNav("Empréstimos"));
    await screen.findByRole("heading", { level: 1, name: "Empréstimos" });
    await waitFor(() =>
      expect(api.consultarEmprestimos).toHaveBeenCalledTimes(1),
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(api.consultarEmprestimos).toHaveBeenCalledTimes(1);
  });

  it("Acervo não reage a eventos do tempo real", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(botaoNav("Acervo"));
    await waitFor(() => expect(api.consultarLivros).toHaveBeenCalledTimes(1));
    act(() => ultima().abrir());
    act(() => ultima().receber(MSG));
    await new Promise((r) => setTimeout(r, 20));
    expect(api.consultarLivros).toHaveBeenCalledTimes(1);
  });

  it("desmontar o App fecha o WebSocket", async () => {
    const { unmount } = render(<App />);
    const socket = ultima();
    act(() => socket.abrir());
    await waitFor(() => expect(api.listarDisponibilidade).toHaveBeenCalled());
    unmount();
    expect(socket.fechado).toBe(true);
  });
});
