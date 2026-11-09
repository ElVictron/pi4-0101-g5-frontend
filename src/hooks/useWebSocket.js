import { useEffect, useState, useRef, useCallback } from 'react';

// Hook para conectar ao Backend 2 (Python / WebSocket Server) e ouvir atualizações em tempo real
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws';

export function useWebSocket(onMessageCallback) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('⚡ Conectado ao Backend 2 (WebSocket)');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageCallback) {
            onMessageCallback(data);
          }
        } catch (err) {
          console.error('Erro ao processar mensagem do WebSocket:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('🔌 WebSocket desconectado. Tentando reconectar em 3s...');
        setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn('Alerta WebSocket:', err.message || 'Servidor WS indisponível');
        ws.close();
      };

      wsRef.current = ws;
    } catch (e) {
      console.warn('Falha ao instanciar WebSocket:', e);
    }
  }, [onMessageCallback]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
}
