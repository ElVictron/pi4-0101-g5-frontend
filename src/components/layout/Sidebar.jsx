import React from 'react';
import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">📚</div>
        <span>BiblioTech</span>
      </div>
      <nav className="sidebar-nav">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Visão Geral
        </button>
        <button 
          className={`nav-item ${activeTab === 'books' ? 'active' : ''}`}
          onClick={() => setActiveTab('books')}
        >
          📖 Livros & Acervo
        </button>
        <button 
          className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuários & Leitores
        </button>
        <button 
          className={`nav-item ${activeTab === 'loans' ? 'active' : ''}`}
          onClick={() => setActiveTab('loans')}
        >
          🔄 Empréstimos & Devoluções
        </button>
      </nav>
    </aside>
  );
}
