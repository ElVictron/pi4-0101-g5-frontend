// Cliente HTTP configurado para conectar ao Backend 1 (API REST Python / PostgreSQL)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Falha na requisição API (${endpoint}):`, error);
    throw error;
  }
}

export const api = {
  // --- Livros ---
  getBooks: () => request('/books'),
  createBook: (bookData) => request('/books', { method: 'POST', body: JSON.stringify(bookData) }),

  // --- Usuários / Leitores ---
  getUsers: () => request('/users'),
  createUser: (userData) => request('/users', { method: 'POST', body: JSON.stringify(userData) }),

  // --- Empréstimos & Devoluções ---
  getLoans: () => request('/loans'),
  createLoan: (loanData) => request('/loans', { method: 'POST', body: JSON.stringify(loanData) }),
  returnLoan: (loanId) => request(`/loans/${loanId}/return`, { method: 'POST' }),
};
