import React from 'react';
import './Header.css';

export default function Header({ searchTerm, setSearchTerm, wsConnected, onRetryConnect }) {
  return (
    <header className="top-header" role="banner">
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input 
          type="search" 
          className="search-input" 
          placeholder="Buscar título, leitor ou ISBN..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar no sistema"
        />
      </div>

      <div className="header-status-area">
        {/* Indicador visual de conexão com os dois backends */}
        <div className="connection-badges">
          <span className={`ws-badge ${wsConnected ? 'connected' : 'disconnected'}`}>
            <span className="dot" />
            Backend 2 (WS): {wsConnected ? 'Ao Vivo' : 'Desconectado'}
          </span>
          <button className="btn-retry-api" onClick={onRetryConnect} title="Recarregar dados da API REST (Backend 1)">
            🔄 Sincronizar API
          </button>
        </div>

        <div className="header-user">
          <div className="user-info">
            <span className="user-name">Bibliotecário(a)</span>
            <span className="user-role">Administrador</span>
          </div>
          <div className="avatar">BIB</div>
        </div>
      </div>
    </header>
  );
}
