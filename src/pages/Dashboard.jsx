import React from 'react';
import StatCard from '../components/ui/StatCard';
import SkeletonLoader from '../components/feedback/SkeletonLoader';
import './Dashboard.css';

export default function Dashboard({ books, users, loans, loading, setActiveTab }) {
  if (loading) return <SkeletonLoader />;

  const totalBooks = books.reduce((acc, b) => acc + Number(b.totalCopies || b.total_copies || 0), 0);
  const availableBooks = books.reduce((acc, b) => acc + Number(b.availableCopies || b.available_copies || 0), 0);
  const activeLoans = loans.filter(l => l.status === 'Ativo' || l.status === 'ACTIVE').length;
  const overdueLoans = loans.filter(l => l.status === 'Atrasado' || l.status === 'OVERDUE').length;
  const lowStockBooks = books.filter(b => (b.availableCopies ?? b.available_copies ?? 0) <= 1);

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1>Painel da Biblioteca</h1>
          <p>Métricas sincronizadas via REST API + WebSocket (sem dados estáticos).</p>
        </div>
        <button className="btn-primary" onClick={() => setActiveTab('loans')}>
          ➕ Novo Empréstimo
        </button>
      </div>

      <div className="stats-grid">
        <StatCard title="Total no Acervo" value={totalBooks} subtitle={`${books.length} títulos no banco`} icon="📚" colorClass="blue" />
        <StatCard title="Disponíveis para Empréstimo" value={availableBooks} subtitle="Nas estantes" icon="✅" colorClass="green" />
        <StatCard title="Empréstimos Ativos" value={activeLoans} subtitle="Com leitores" icon="🔄" colorClass="amber" />
        <StatCard title="Empréstimos Atrasados" value={overdueLoans} subtitle="Requer atenção" icon="⚠️" colorClass="red" />
      </div>

      <div className="dashboard-grid">
        {/* Tabela de Empréstimos Recentes */}
        <div className="content-card">
          <div className="card-header">
            <h2>Últimas Movimentações</h2>
            <button className="btn-secondary btn-sm" onClick={() => setActiveTab('loans')}>Ver Todos</button>
          </div>
          {loans.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum empréstimo registrado no banco de dados.</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Livro</th>
                  <th>Leitor</th>
                  <th>Data Empréstimo</th>
                  <th>Devolução Prevista</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.slice(0, 5).map((l) => (
                  <tr key={l.id}>
                    <td className="font-semibold">{l.bookTitle || l.book_title || l.book?.title}</td>
                    <td>{l.userName || l.user_name || l.user?.name}</td>
                    <td>{l.loanDate || l.loan_date}</td>
                    <td>{l.returnDueDate || l.return_due_date}</td>
                    <td>
                      <span className={`badge badge-${(l.status || '').toLowerCase()}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Resumo do Acervo / Alertas */}
        <div className="content-card">
          <div className="card-header">
            <h2>Acervo com Baixo Estoque</h2>
          </div>
          <div className="card-body">
            {lowStockBooks.length === 0 ? (
              <p className="empty-text">Nenhum livro em estado crítico no estoque.</p>
            ) : (
              <ul className="low-stock-list">
                {lowStockBooks.map((b) => {
                  const avail = b.availableCopies ?? b.available_copies ?? 0;
                  return (
                    <li key={b.id} className="low-stock-item">
                      <div>
                        <strong>{b.title}</strong>
                        <span className="subtext">{b.author}</span>
                      </div>
                      <span className={`badge ${avail === 0 ? 'badge-inativo' : 'badge-pendente'}`}>
                        {avail} disponível
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
