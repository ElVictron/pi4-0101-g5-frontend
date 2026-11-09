import React, { useState } from 'react';
import Modal from '../components/ui/Modal';
import SkeletonLoader from '../components/feedback/SkeletonLoader';
import './LoansPage.css';

export default function LoansPage({ loans, books, users, onAddLoan, onReturnLoan, searchTerm, loading }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  if (loading) return <SkeletonLoader />;

  const filteredLoans = loans.filter((l) => {
    const bookTitle = l.bookTitle || l.book_title || l.book?.title || '';
    const userName = l.userName || l.user_name || l.user?.name || '';
    const term = searchTerm.toLowerCase();

    return bookTitle.toLowerCase().includes(term) || userName.toLowerCase().includes(term);
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBookId || !selectedUserId) return;
    onAddLoan({ bookId: selectedBookId, userId: selectedUserId });
    setSelectedBookId('');
    setSelectedUserId('');
    setIsModalOpen(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Empréstimos & Devoluções</h1>
          <p>Emissão de retiradas e baixa de devolução conectadas à API e notificações WebSocket.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          🔄 Registrar Empréstimo
        </button>
      </div>

      <div className="content-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Livro Emprestado</th>
              <th>Leitor / Usuário</th>
              <th>Data Retirada</th>
              <th>Devolução Prevista</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem' }} className="text-muted">
                  Nenhum empréstimo ativo no sistema.
                </td>
              </tr>
            ) : (
              filteredLoans.map((l) => {
                const bTitle = l.bookTitle || l.book_title || l.book?.title;
                const uName = l.userName || l.user_name || l.user?.name;
                const lDate = l.loanDate || l.loan_date;
                const rDueDate = l.returnDueDate || l.return_due_date;
                const isReturned = l.status === 'Devolvido' || l.status === 'RETURNED';

                return (
                  <tr key={l.id}>
                    <td className="font-mono">#{l.id}</td>
                    <td className="font-semibold">{bTitle}</td>
                    <td>{uName}</td>
                    <td>{lDate}</td>
                    <td>{rDueDate}</td>
                    <td>
                      <span className={`badge badge-${(l.status || '').toLowerCase()}`}>{l.status}</span>
                    </td>
                    <td>
                      {!isReturned ? (
                        <button 
                          className="btn-primary btn-sm btn-success" 
                          onClick={() => onReturnLoan(l.id)}
                        >
                          ✅ Registrar Devolução
                        </button>
                      ) : (
                        <span className="text-muted">Concluído</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Registrar Empréstimo */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Novo Empréstimo">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Selecione o Livro do Acervo *</label>
            <select 
              required 
              value={selectedBookId} 
              onChange={(e) => setSelectedBookId(e.target.value)}
            >
              <option value="">-- Escolha um livro --</option>
              {books.map((b) => {
                const avail = b.availableCopies ?? b.available_copies ?? 0;
                return (
                  <option key={b.id} value={b.id} disabled={avail <= 0}>
                    {b.title} ({avail} cópias disponíveis)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label>Selecione o Leitor *</label>
            <select 
              required 
              value={selectedUserId} 
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">-- Escolha um leitor --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.doc || u.cpf || u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="loan-info-box">
            ℹ️ As requisições são enviadas diretamente ao <strong>Backend 1 (Python REST)</strong> e distribuídas via <strong>Backend 2 (WebSocket)</strong> para todas as telas abertas.
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Confirmar Empréstimo</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
