import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useBibliotecaTempoReal } from "../../hooks/useBibliotecaTempoReal.js";

class FakeWebSocket {
  static instancias = [];

  constructor(url) {
    this.url = url;
    this.fechamentos = 0;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    FakeWebSocket.instancias.push(this);
  }

  // Simula um socket que dispara onclose a cada close(), sem proteção.
  close() {
    this.fechamentos += 1;
    if (this.onclose) this.onclose({});
  }

  abrir() {
    if (this.onopen) this.onopen({});
  }

  receber(evento) {
    if (this.onmessage) this.onmessage(evento);
  }
}

const ultima = () =>
  FakeWebSocket.instancias[FakeWebSocket.instancias.length - 1];

const MSG = {
  tipo: "emprestimo_registrado",
  livroId: 7,
  quantidadeDisponivel: 0,
};

function montar(props = {}) {
  return renderHook((p) => useBibliotecaTempoReal(p), {
    initialProps: {
      WebSocketImpl: FakeWebSocket,
      intervaloReconexaoMs: 100,
      ...props,
    },
  });
}

beforeEach(() => {
  FakeWebSocket.instancias = [];
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("E5 · useBibliotecaTempoReal (unitário)", () => {
  it("onclose repetido do mesmo socket agenda uma única reconexão", () => {
    const { result } = montar();
    const primeira = ultima();
    act(() => primeira.abrir());
    act(() => primeira.onerror({}));
    act(() => primeira.onclose({}));
    expect(result.current.conectado).toBe(false);
    act(() => vi.advanceTimersByTime(100));
    expect(FakeWebSocket.instancias).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeWebSocket.instancias).toHaveLength(2);
  });

  it("evento sem data é ignorado sem exceção", () => {
    const { result } = montar();
    expect(() => act(() => ultima().receber(undefined))).not.toThrow();
    expect(() => act(() => ultima().receber({}))).not.toThrow();
    expect(result.current.evento).toBeNull();
  });

  it("objeto aceito é cópia, não a referência do JSON lido", () => {
    const { result } = montar();
    const parse = vi.spyOn(JSON, "parse");
    act(() => ultima().receber({ data: JSON.stringify(MSG) }));
    const lido = parse.mock.results[0].value;
    parse.mockRestore();
    expect(result.current.evento).toEqual(MSG);
    expect(result.current.evento).not.toBe(lido);
  });

  it("depois de desmontar, handlers do socket antigo não fazem nada", () => {
    const { result, unmount } = montar();
    const socket = ultima();
    unmount();
    expect(socket.fechamentos).toBe(1);
    expect(() => {
      socket.abrir();
      socket.receber({ data: JSON.stringify(MSG) });
      socket.onclose({});
    }).not.toThrow();
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeWebSocket.instancias).toHaveLength(1);
    expect(result.current.conectado).toBe(false);
    expect(result.current.evento).toBeNull();
  });

  it("desmontar com reconexão pendente não fecha socket já perdido", () => {
    const { unmount } = montar();
    const socket = ultima();
    act(() => socket.abrir());
    act(() => socket.onclose({}));
    unmount();
    expect(socket.fechamentos).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeWebSocket.instancias).toHaveLength(1);
  });

  it("trocar a url fecha o socket antigo e conecta na nova sem contar reconexão", () => {
    const { result, rerender } = montar({ url: "ws://a.test/ws" });
    const antiga = ultima();
    act(() => antiga.abrir());
    rerender({
      WebSocketImpl: FakeWebSocket,
      intervaloReconexaoMs: 100,
      url: "ws://b.test/ws",
    });
    expect(antiga.fechamentos).toBe(1);
    expect(FakeWebSocket.instancias).toHaveLength(2);
    expect(ultima().url).toBe("ws://b.test/ws");
    expect(result.current.conectado).toBe(false);
    act(() => ultima().abrir());
    expect(result.current.conectado).toBe(true);
    expect(result.current.reconexoes).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeWebSocket.instancias).toHaveLength(2);
  });

  it("reconexoes não muda com mensagens nem com quedas sem nova abertura", () => {
    const { result } = montar();
    act(() => ultima().abrir());
    act(() => ultima().receber({ data: JSON.stringify(MSG) }));
    act(() => ultima().onclose({}));
    act(() => vi.advanceTimersByTime(100));
    act(() => ultima().onclose({}));
    act(() => vi.advanceTimersByTime(100));
    expect(FakeWebSocket.instancias).toHaveLength(3);
    expect(result.current.reconexoes).toBe(0);
    act(() => ultima().abrir());
    expect(result.current.reconexoes).toBe(1);
    expect(result.current.evento).toEqual(MSG);
  });
});
