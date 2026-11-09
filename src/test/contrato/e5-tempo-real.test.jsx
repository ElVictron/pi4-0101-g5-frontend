import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import {
  WS_URL,
  useBibliotecaTempoReal,
} from "../../hooks/useBibliotecaTempoReal.js";

const URL_PADRAO = "ws://localhost:8001/ws/biblioteca";

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

  // Como um WebSocket real: close() registra a chamada e dispara onclose (uma vez).
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

  falhar() {
    if (this.onerror) this.onerror({});
  }
}

const ultima = () =>
  FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

const MSG_EMPRESTIMO = {
  tipo: "emprestimo_registrado",
  livroId: 101,
  emprestimoId: 9001,
  status: "ativo",
  quantidadeDisponivel: 2,
  atualizadaEm: "2026-10-13T19:20:00",
};

const MSG_DEVOLUCAO = {
  tipo: "devolucao_registrada",
  livroId: 102,
  emprestimoId: 9002,
  status: "devolvido",
  quantidadeDisponivel: 0,
  atualizadaEm: "2026-10-14T08:05:00",
};

function montar(opcoes = {}) {
  return renderHook(() =>
    useBibliotecaTempoReal({
      WebSocketImpl: FakeWebSocket,
      intervaloReconexaoMs: 1000,
      ...opcoes,
    }),
  );
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("E5 · useBibliotecaTempoReal · conexão", () => {
  it("WS_URL é VITE_WS_URL ou o padrão", () => {
    // E5 · tempo real · WS_URL padrão ws://localhost:8001/ws/biblioteca (F9, 6.13)
    const env = import.meta.env.VITE_WS_URL;
    expect(WS_URL).toBe(env ? env : URL_PADRAO);
  });

  it("sem url conecta em WS_URL", () => {
    // E5 · tempo real · url padrão = WS_URL (F9, 6.13)
    montar();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(WS_URL);
  });

  it("conecta na url passada", () => {
    // E5 · tempo real · conecta na url recebida (6.13)
    montar({ url: "ws://exemplo.test:9999/ws/biblioteca" });
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(
      "ws://exemplo.test:9999/ws/biblioteca",
    );
  });

  it("WebSocketImpl padrão é globalThis.WebSocket lido ao conectar", () => {
    // E5 · tempo real · WebSocketImpl padrão = globalThis.WebSocket no momento de conectar (6.13)
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const { result } = renderHook(() =>
      useBibliotecaTempoReal({ url: "ws://global.test/ws" }),
    );
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe("ws://global.test/ws");
    act(() => FakeWebSocket.instances[0].abrir());
    expect(result.current.conectado).toBe(true);
  });

  it("estado inicial: desconectado, sem evento, 0 reconexões", () => {
    // E5 · tempo real · estado inicial { conectado: false, evento: null, reconexoes: 0 } (6.13)
    const { result } = montar();
    expect(result.current.conectado).toBe(false);
    expect(result.current.evento).toBeNull();
    expect(result.current.reconexoes).toBe(0);
  });

  it("onopen marca conectado e a primeira abertura não conta como reconexão", () => {
    // E5 · tempo real · onopen → conectado true; primeira abertura não incrementa reconexoes (6.13)
    const { result } = montar();
    act(() => ultima().abrir());
    expect(result.current.conectado).toBe(true);
    expect(result.current.reconexoes).toBe(0);
  });
});

describe("E5 · useBibliotecaTempoReal · reconexão", () => {
  it("onclose marca desconectado e só reconecta depois do intervalo", () => {
    // E5 · tempo real · onclose → conectado false e nova tentativa após intervaloReconexaoMs (F10, CT13)
    const { result } = montar({ url: "ws://reconecta.test/ws" });
    act(() => ultima().abrir());
    act(() => ultima().cair());
    expect(result.current.conectado).toBe(false);
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(999));
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1));
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[1].url).toBe("ws://reconecta.test/ws");
  });

  it("intervaloReconexaoMs padrão é 3000", () => {
    // E5 · tempo real · intervaloReconexaoMs padrão 3000 (6.13)
    renderHook(() => useBibliotecaTempoReal({ WebSocketImpl: FakeWebSocket }));
    act(() => ultima().abrir());
    act(() => ultima().cair());

    act(() => vi.advanceTimersByTime(2999));
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1));
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("reconexão incrementa reconexoes a cada nova abertura após queda", () => {
    // E5 · tempo real · reconexão incrementa reconexoes (F10, CT13)
    const { result } = montar();
    act(() => ultima().abrir());
    expect(result.current.reconexoes).toBe(0);

    act(() => ultima().cair());
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(result.current.reconexoes).toBe(0);
    act(() => ultima().abrir());
    expect(result.current.conectado).toBe(true);
    expect(result.current.reconexoes).toBe(1);

    act(() => ultima().cair());
    expect(result.current.conectado).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeWebSocket.instances).toHaveLength(3);
    act(() => ultima().abrir());
    expect(result.current.conectado).toBe(true);
    expect(result.current.reconexoes).toBe(2);
  });

  it("onerror fecha o socket", () => {
    // E5 · tempo real · onerror → fecha o socket (6.13)
    const { result } = montar();
    act(() => ultima().abrir());
    act(() => ultima().falhar());
    expect(FakeWebSocket.instances[0].closeCalls).toBeGreaterThanOrEqual(1);
    expect(result.current.conectado).toBe(false);
  });
});

describe("E5 · useBibliotecaTempoReal · mensagens CT13", () => {
  it("emprestimo_registrado válido vira evento com os campos da mensagem", () => {
    // E5 · tempo real · mensagem emprestimo_registrado → evento (CT13, F9)
    const { result } = montar();
    act(() => ultima().abrir());
    act(() => ultima().receber(JSON.stringify(MSG_EMPRESTIMO)));
    expect(result.current.evento).toEqual(MSG_EMPRESTIMO);
  });

  it("devolucao_registrada válido (quantidadeDisponivel 0) vira evento", () => {
    // E5 · tempo real · mensagem devolucao_registrada com quantidadeDisponivel 0 → evento (CT13, F9)
    const { result } = montar();
    act(() => ultima().abrir());
    act(() => ultima().receber(JSON.stringify(MSG_DEVOLUCAO)));
    expect(result.current.evento).toEqual(MSG_DEVOLUCAO);
  });

  it("emprestimoId é opcional", () => {
    // E5 · tempo real · emprestimoId não obrigatório (CT13)
    const { result } = montar();
    const semEmprestimo = { ...MSG_EMPRESTIMO };
    delete semEmprestimo.emprestimoId;
    act(() => ultima().receber(JSON.stringify(semEmprestimo)));
    expect(result.current.evento).toEqual(semEmprestimo);
  });

  it("cada mensagem válida gera um objeto novo, mesmo com conteúdo repetido", () => {
    // E5 · tempo real · evento é um novo objeto a cada mensagem (6.13)
    const { result } = montar();
    act(() => ultima().abrir());
    act(() => ultima().receber(JSON.stringify(MSG_EMPRESTIMO)));
    const primeiro = result.current.evento;
    act(() => ultima().receber(JSON.stringify(MSG_EMPRESTIMO)));
    const segundo = result.current.evento;
    expect(segundo).toEqual(MSG_EMPRESTIMO);
    expect(segundo).not.toBe(primeiro);
  });

  const semCampo = (campo) => {
    const copia = { ...MSG_EMPRESTIMO };
    delete copia[campo];
    return JSON.stringify(copia);
  };

  const invalidas = [
    ["JSON ilegível", "{tipo: emprestimo"],
    ["texto vazio", ""],
    [
      "tipo desconhecido",
      JSON.stringify({ ...MSG_EMPRESTIMO, tipo: "livro_cadastrado" }),
    ],
    [
      "mensagem com envelope bibliotecaAtualizada",
      JSON.stringify({ tipo: "bibliotecaAtualizada", dados: MSG_EMPRESTIMO }),
    ],
    ["livroId texto", JSON.stringify({ ...MSG_EMPRESTIMO, livroId: "101" })],
    [
      "livroId não inteiro",
      JSON.stringify({ ...MSG_EMPRESTIMO, livroId: 1.5 }),
    ],
    ["livroId null", JSON.stringify({ ...MSG_EMPRESTIMO, livroId: null })],
    [
      "quantidadeDisponivel negativa",
      JSON.stringify({ ...MSG_EMPRESTIMO, quantidadeDisponivel: -1 }),
    ],
    [
      "quantidadeDisponivel não inteira",
      JSON.stringify({ ...MSG_EMPRESTIMO, quantidadeDisponivel: 1.5 }),
    ],
    [
      "quantidadeDisponivel texto",
      JSON.stringify({ ...MSG_EMPRESTIMO, quantidadeDisponivel: "2" }),
    ],
    ["sem tipo", semCampo("tipo")],
    ["sem livroId", semCampo("livroId")],
    ["sem quantidadeDisponivel", semCampo("quantidadeDisponivel")],
    ["JSON número", "5"],
    ["JSON null", "null"],
    ["JSON array", "[]"],
    ["JSON texto", '"emprestimo_registrado"'],
    ["JSON booleano", "true"],
  ];

  it.each(invalidas)(
    "ignora mensagem inválida (%s) sem exceção e sem mudar evento",
    (_nome, data) => {
      // E5 · tempo real · mensagem inválida ou JSON ilegível é ignorada sem exceção (6.13, CT13)
      const { result } = montar();
      act(() => ultima().abrir());
      act(() => ultima().receber(JSON.stringify(MSG_DEVOLUCAO)));
      const anterior = result.current.evento;
      expect(anterior).toEqual(MSG_DEVOLUCAO);

      expect(() => act(() => ultima().receber(data))).not.toThrow();
      expect(result.current.evento).toBe(anterior);
      expect(result.current.conectado).toBe(true);
    },
  );

  it("mensagem inválida sem evento anterior mantém evento null", () => {
    // E5 · tempo real · mensagem inválida não cria evento (6.13)
    const { result } = montar();
    act(() => ultima().abrir());
    expect(() => act(() => ultima().receber("não é json"))).not.toThrow();
    expect(() =>
      act(() => ultima().receber(JSON.stringify({ tipo: "outro" }))),
    ).not.toThrow();
    expect(result.current.evento).toBeNull();
  });
});

describe("E5 · useBibliotecaTempoReal · desmontagem", () => {
  it("desmontar fecha o socket aberto e não reconecta", () => {
    // E5 · tempo real · ao desmontar fecha o socket e não reconecta (6.13)
    const { unmount } = montar();
    act(() => ultima().abrir());
    unmount();
    expect(FakeWebSocket.instances[0].closeCalls).toBeGreaterThanOrEqual(1);
    act(() => vi.advanceTimersByTime(60000));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("desmontar cancela a tentativa de reconexão pendente", () => {
    // E5 · tempo real · ao desmontar cancela a tentativa pendente (6.13)
    const { unmount } = montar();
    act(() => ultima().abrir());
    act(() => ultima().cair());
    act(() => vi.advanceTimersByTime(500));
    unmount();
    act(() => vi.advanceTimersByTime(60000));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
