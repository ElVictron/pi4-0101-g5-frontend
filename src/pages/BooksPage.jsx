import React, { useState } from "react";
import Modal from "../components/ui/Modal";
import SkeletonLoader from "../components/feedback/SkeletonLoader";
import "./BooksPage.css";

export default function BooksPage({ books, onAddBook, searchTerm, loading }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    totalCopies: 1,
  });

  if (loading) return <SkeletonLoader />;

  const filteredBooks = books.filter((b) => {
    const title = b.title || "";
    const author = b.author || "";
    const isbn = b.isbn || "";
    const category = b.category || "";
    const term = searchTerm.toLowerCase();

    return (
      title.toLowerCase().includes(term) ||
      author.toLowerCase().includes(term) ||
      isbn.includes(term) ||
      category.toLowerCase().includes(term)
    );
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.isbn) return;
    onAddBook(formData);
    setFormData({
      title: "",
      author: "",
      isbn: "",
      category: "",
      totalCopies: 1,
    });
    setIsModalOpen(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Acervo de Livros</h1>
          <p>
            Consulte a disponibilidade em tempo real e cadastre novos títulos
            (Backend 1 / API).
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          📖 Cadastrar Novo Livro
        </button>
      </div>

      <div className="content-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Autor</th>
              <th>ISBN</th>
              <th>Categoria</th>
              <th>Total Exemplares</th>
              <th>Disponíveis</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "2.5rem" }}
                  className="text-muted"
                >
                  Nenhum livro encontrado no banco de dados. Clique em
                  &quot;Cadastrar Novo Livro&quot; para adicionar.
                </td>
              </tr>
            ) : (
              filteredBooks.map((b) => {
                const total = b.totalCopies ?? b.total_copies ?? 0;
                const avail = b.availableCopies ?? b.available_copies ?? 0;
                return (
                  <tr key={b.id}>
                    <td className="font-semibold">{b.title}</td>
                    <td>{b.author}</td>
                    <td className="font-mono">{b.isbn}</td>
                    <td>
                      <span className="category-pill">
                        {b.category || "Geral"}
                      </span>
                    </td>
                    <td>{total}</td>
                    <td>
                      <strong>{avail}</strong>
                    </td>
                    <td>
                      {avail > 0 ? (
                        <span className="badge badge-ativo">Disponível</span>
                      ) : (
                        <span className="badge badge-inativo">Esgotado</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Cadastro de Livros */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Livro no Banco"
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Título do Livro *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Engenharia de Software"
            />
          </div>
          <div className="form-group">
            <label>Autor *</label>
            <input
              type="text"
              required
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
              placeholder="Ex: Ian Sommerville"
            />
          </div>
          <div className="form-group-row">
            <div className="form-group">
              <label>ISBN *</label>
              <input
                type="text"
                required
                value={formData.isbn}
                onChange={(e) =>
                  setFormData({ ...formData, isbn: e.target.value })
                }
                placeholder="978-85..."
              />
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="Ex: Tecnologia / Computação"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Quantidade de Exemplares</label>
            <input
              type="number"
              min="1"
              value={formData.totalCopies}
              onChange={(e) =>
                setFormData({ ...formData, totalCopies: e.target.value })
              }
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar no Banco
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
