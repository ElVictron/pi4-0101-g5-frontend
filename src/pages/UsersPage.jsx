import React, { useState } from 'react';
import Modal from '../components/ui/Modal';
import SkeletonLoader from '../components/feedback/SkeletonLoader';
import './UsersPage.css';

export default function UsersPage({ users, onAddUser, searchTerm, loading }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    doc: '',
    email: '',
    phone: '',
    role: 'Estudante'
  });

  if (loading) return <SkeletonLoader />;

  const filteredUsers = users.filter((u) => {
    const name = u.name || '';
    const doc = u.doc || u.cpf || '';
    const email = u.email || '';
    const term = searchTerm.toLowerCase();

    return (
      name.toLowerCase().includes(term) ||
      doc.includes(term) ||
      email.toLowerCase().includes(term)
    );
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.doc || !formData.email) return;
    onAddUser(formData);
    setFormData({ name: '', doc: '', email: '', phone: '', role: 'Estudante' });
    setIsModalOpen(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Usuários & Leitores</h1>
          <p>Gerencie o cadastro de leitores autorizados no banco de dados.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          👤 Cadastrar Usuário
        </button>
      </div>

      <div className="content-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF / Documento</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Perfil</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem' }} className="text-muted">
                  Nenhum usuário cadastrado no banco. Clique no botão para adicionar um leitor.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td className="font-mono">{u.doc || u.cpf}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '-'}</td>
                  <td><span className="role-pill">{u.role || 'Estudante'}</span></td>
                  <td>
                    <span className={`badge badge-${(u.status || 'ativo').toLowerCase()}`}>{u.status || 'Ativo'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Cadastro de Usuários */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Leitor no Banco">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Nome Completo *</label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              placeholder="Ex: Maria Oliveira"
            />
          </div>
          <div className="form-group-row">
            <div className="form-group">
              <label>CPF / Documento *</label>
              <input 
                type="text" 
                required 
                value={formData.doc} 
                onChange={(e) => setFormData({ ...formData, doc: e.target.value })} 
                placeholder="000.000.000-00"
              />
            </div>
            <div className="form-group">
              <label>Perfil do Leitor</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="Estudante">Estudante</option>
                <option value="Professor">Professor</option>
                <option value="Comunidade">Comunidade</option>
              </select>
            </div>
          </div>
          <div className="form-group-row">
            <div className="form-group">
              <label>E-mail *</label>
              <input 
                type="email" 
                required 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                placeholder="leitor@email.com"
              />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input 
                type="text" 
                value={formData.phone} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                placeholder="(00) 90000-0000"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Salvar Leitor</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
