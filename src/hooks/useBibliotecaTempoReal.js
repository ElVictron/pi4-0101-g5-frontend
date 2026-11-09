import { useEffect, useState } from "react";

// Canal do Backend 2 (CT13). VITE_WS_URL vazio vale como não definido (F9).
export const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:8001/ws/biblioteca";

const TIPOS_VALIDOS = ["emprestimo_registrado", "devolucao_registrada"];

// Lê a mensagem do CT13 (JSON sem envelope). Devolve um novo objeto ou null.
function interpretarMensagem(data) {
  let dados;
  try {
    dados = JSON.parse(data);
  } catch {
    return null;
  }
  if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
    return null;
  }
  const { tipo, livroId, quantidadeDisponivel } = dados;
  if (!TIPOS_VALIDOS.includes(tipo)) return null;
  if (!Number.isInteger(livroId)) return null;
  if (!Number.isInteger(quantidadeDisponivel) || quantidadeDisponivel < 0) {
    return null;
  }
  return { ...dados };
}

export function useBibliotecaTempoReal({
  url = WS_URL,
  WebSocketImpl,
  intervaloReconexaoMs = 3000,
} = {}) {
  const [conectado, setConectado] = useState(false);
  const [evento, setEvento] = useState(null);
  const [reconexoes, setReconexoes] = useState(0);

  useEffect(() => {
    let ativo = true;
    let socket = null;
    let tentativa = null;
    let aberturas = 0;

    function conectar() {
      tentativa = null;
      const Impl = WebSocketImpl ?? globalThis.WebSocket;
      const ws = new Impl(url);
      socket = ws;

      ws.onopen = () => {
        if (!ativo) return;
        aberturas += 1;
        setConectado(true);
        if (aberturas > 1) setReconexoes((n) => n + 1);
      };

      ws.onmessage = (mensagem) => {
        if (!ativo) return;
        const novo = interpretarMensagem(mensagem?.data);
        if (novo) setEvento(novo);
      };

      ws.onclose = () => {
        // Ignora fechamento após desmontar e um segundo onclose do mesmo socket.
        if (!ativo || socket !== ws) return;
        socket = null;
        setConectado(false);
        tentativa = setTimeout(conectar, intervaloReconexaoMs);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    conectar();

    return () => {
      ativo = false;
      clearTimeout(tentativa);
      const aberto = socket;
      socket = null;
      if (aberto) aberto.close();
      setConectado(false);
    };
  }, [url, WebSocketImpl, intervaloReconexaoMs]);

  return { conectado, evento, reconexoes };
}
