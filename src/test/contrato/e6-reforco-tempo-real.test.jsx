import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useBibliotecaTempoReal } from "../../hooks/useBibliotecaTempoReal.js";

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
}

// Construtor que lança enquanto houver falhas programadas; depois vira um FakeWebSocket.
class WebSocketInstavel extends FakeWebSocket {
  static tentativas = 0;
  static falhas = 0;

  constructor(url) {
    WebSocketInstavel.tentativas += 1;
    if (WebSocketInstavel.falhas > 0) {
      WebSocketInstavel.falhas -= 1;
      throw new Error("falha ao criar o WebSocket");
    }
    super(url);
  }
}

const abertos = () =>
  FakeWebSocket.instances.filter((ws) => ws.readyState !== 3);

beforeEach(() => {
  FakeWebSocket.instances = [];
  WebSocketInstavel.tentativas = 0;
  WebSocketInstavel.falhas = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("E6 · useBibliotecaTempoReal · reforço (CT13, F9, 6.13, 6.15.5)", () => {
  it("construtor que lança: desconectado, sem exceção e nova tentativa após o intervalo", () => {
    // E6 · tempo real · new WebSocketImpl lança → conectado false e nova tentativa agendada (6.15.5)
    WebSocketInstavel.falhas = 1;
    let erro;
    let hook;
    try {
      hook = renderHook(() =>
        useBibliotecaTempoReal({
          url: "ws://instavel.test/ws",
          WebSocketImpl: WebSocketInstavel,
          intervaloReconexaoMs: 1000,
        }),
      );
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeUndefined();
    expect(hook.result.current.conectado).toBe(false);
    expect(WebSocketInstavel.tentativas).toBe(1);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(WebSocketInstavel.tentativas).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(WebSocketInstavel.tentativas).toBe(2);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe("ws://instavel.test/ws");

    act(() => FakeWebSocket.instances[0].abrir());
    expect(hook.result.current.conectado).toBe(true);
  });

  it("StrictMode: depois de montar só um socket fica aberto", () => {
    // E6 · tempo real · StrictMode monta/desmonta/monta e deixa um único socket aberto (6.15.5)
    const { result } = renderHook(
      () =>
        useBibliotecaTempoReal({
          WebSocketImpl: FakeWebSocket,
          intervaloReconexaoMs: 1000,
        }),
      { wrapper: React.StrictMode },
    );
    expect(abertos()).toHaveLength(1);

    // o socket fechado pela desmontagem do StrictMode não agenda reconexão
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(abertos()).toHaveLength(1);

    act(() => abertos()[0].abrir());
    expect(result.current.conectado).toBe(true);
    expect(result.current.reconexoes).toBe(0);
  });

  it("VITE_WS_URL vazio usa o WS_URL padrão", async () => {
    // E6 · tempo real · VITE_WS_URL vazio vale como não definido (F9, 6.13)
    vi.stubEnv("VITE_WS_URL", "");
    vi.resetModules();
    const modulo = await import("../../hooks/useBibliotecaTempoReal.js");
    expect(modulo.WS_URL).toBe(URL_PADRAO);
  });

  it("VITE_WS_URL definido é usado como WS_URL", async () => {
    // E6 · tempo real · WS_URL = VITE_WS_URL quando definido (F9, 6.13)
    vi.stubEnv("VITE_WS_URL", "ws://exemplo.test:9000/ws/biblioteca");
    vi.resetModules();
    const modulo = await import("../../hooks/useBibliotecaTempoReal.js");
    expect(modulo.WS_URL).toBe("ws://exemplo.test:9000/ws/biblioteca");
  });
});
