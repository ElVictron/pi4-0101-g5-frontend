import React, { useState, useEffect, lazy, Suspense, useCallback } from "react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import SkeletonLoader from "./components/feedback/SkeletonLoader";
import ErrorMessage from "./components/feedback/ErrorMessage";
import {
  cadastrarLivro,
  cadastrarUsuario,
  consultarEmprestimos,
  consultarLivros,
  consultarUsuarios,
  registrarDevolucao,
  registrarEmprestimo,
} from "./services/api";

// Adaptador provisório para o App antigo (será reescrito no E5).
const itens = (resposta) => resposta?.itens ?? [];
const api = {
  getBooks: () => consultarLivros().then(itens),
  getUsers: () => consultarUsuarios().then(itens),
  getLoans: () => consultarEmprestimos().then(itens),
  createBook: cadastrarLivro,
  createUser: cadastrarUsuario,
  createLoan: registrarEmprestimo,
  returnLoan: registrarDevolucao,
};
import { useWebSocket } from "./hooks/useWebSocket";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const LoansPage = lazy(() => import("./pages/LoansPage"));

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  // Estado dinâmico vindo da API Backend 1 / PostgreSQL (sem dados estáticos hardcoded)
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Busca dados iniciais da API REST (Backend 1)
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [booksData, usersData, loansData] = await Promise.all([
        api.getBooks().catch(() => []),
        api.getUsers().catch(() => []),
        api.getLoans().catch(() => []),
      ]);
      setBooks(booksData);
      setUsers(usersData);
      setLoans(loansData);
    } catch (err) {
      console.error("Erro ao conectar ao Backend 1:", err);
      setError(
        "Servidor Backend 1 (API REST) não encontrado ou sem resposta. Certifique-se de que a API Python está em execução.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Listener para atualizações em tempo real do Backend 2 (WebSocket)
  const handleWebSocketMessage = useCallback(
    (event) => {
      console.log("📡 Evento Real-Time Recebido:", event);
      const { type, payload } = event;

      switch (type) {
        case "BOOK_ADDED":
        case "BOOK_UPDATED":
          setBooks((prev) => {
            const index = prev.findIndex((b) => b.id === payload.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = payload;
              return updated;
            }
            return [payload, ...prev];
          });
          break;

        case "USER_ADDED":
        case "USER_UPDATED":
          setUsers((prev) => {
            const index = prev.findIndex((u) => u.id === payload.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = payload;
              return updated;
            }
            return [payload, ...prev];
          });
          break;

        case "LOAN_CREATED":
        case "LOAN_RETURNED":
        case "LOAN_UPDATED":
          // Atualiza a lista de empréstimos
          setLoans((prev) => {
            const index = prev.findIndex((l) => l.id === payload.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = payload;
              return updated;
            }
            return [payload, ...prev];
          });
          // Atualiza a disponibilidade do livro afetado se vier no evento
          if (payload.book) {
            setBooks((prev) =>
              prev.map((b) => (b.id === payload.book.id ? payload.book : b)),
            );
          }
          break;

        case "REFRESH_ALL":
          fetchInitialData();
          break;

        default:
          break;
      }
    },
    [fetchInitialData],
  );

  const { isConnected: wsConnected } = useWebSocket(handleWebSocketMessage);

  // Ações chamadas pelas telas -> Disparam requisição HTTP para o Backend 1
  const handleAddBook = async (newBookData) => {
    try {
      const createdBook = await api.createBook(newBookData);
      setBooks((prev) => [createdBook, ...prev]);
    } catch (err) {
      // Caso a API não esteja rodando ainda, aplica otimista local para teste
      const mockBook = {
        ...newBookData,
        id: Date.now(),
        availableCopies: Number(newBookData.totalCopies),
      };
      setBooks((prev) => [mockBook, ...prev]);
    }
  };

  const handleAddUser = async (newUserData) => {
    try {
      const createdUser = await api.createUser(newUserData);
      setUsers((prev) => [createdUser, ...prev]);
    } catch (err) {
      const mockUser = { ...newUserData, id: Date.now(), status: "Ativo" };
      setUsers((prev) => [mockUser, ...prev]);
    }
  };

  const handleAddLoan = async (loanData) => {
    try {
      const createdLoan = await api.createLoan(loanData);
      setLoans((prev) => [createdLoan, ...prev]);
      // Atualiza o estoque do livro
      setBooks((prev) =>
        prev.map((b) =>
          b.id === Number(loanData.bookId)
            ? { ...b, availableCopies: Math.max(0, b.availableCopies - 1) }
            : b,
        ),
      );
    } catch (err) {
      const selectedBook = books.find((b) => b.id === Number(loanData.bookId));
      const selectedUser = users.find((u) => u.id === Number(loanData.userId));
      if (selectedBook && selectedUser) {
        const today = new Date().toISOString().split("T")[0];
        const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const mockLoan = {
          id: Date.now(),
          bookId: selectedBook.id,
          bookTitle: selectedBook.title,
          userId: selectedUser.id,
          userName: selectedUser.name,
          loanDate: today,
          returnDueDate: dueDate,
          status: "Ativo",
        };
        setLoans((prev) => [mockLoan, ...prev]);
        setBooks((prev) =>
          prev.map((b) =>
            b.id === selectedBook.id
              ? { ...b, availableCopies: b.availableCopies - 1 }
              : b,
          ),
        );
      }
    }
  };

  const handleReturnLoan = async (loanId) => {
    try {
      const updatedLoan = await api.returnLoan(loanId);
      setLoans((prev) => prev.map((l) => (l.id === loanId ? updatedLoan : l)));
      if (updatedLoan.bookId) {
        setBooks((prev) =>
          prev.map((b) =>
            b.id === updatedLoan.bookId
              ? { ...b, availableCopies: b.availableCopies + 1 }
              : b,
          ),
        );
      }
    } catch (err) {
      const targetLoan = loans.find((l) => l.id === loanId);
      if (targetLoan) {
        setLoans((prev) =>
          prev.map((l) =>
            l.id === loanId ? { ...l, status: "Devolvido" } : l,
          ),
        );
        setBooks((prev) =>
          prev.map((b) =>
            b.id === targetLoan.bookId
              ? { ...b, availableCopies: b.availableCopies + 1 }
              : b,
          ),
        );
      }
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-wrapper">
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          wsConnected={wsConnected}
          onRetryConnect={fetchInitialData}
        />
        <main className="main-content" id="main-content">
          {error && <ErrorMessage message={error} />}

          <Suspense fallback={<SkeletonLoader />}>
            {activeTab === "dashboard" && (
              <Dashboard
                books={books}
                users={users}
                loans={loans}
                loading={loading}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === "books" && (
              <BooksPage
                books={books}
                onAddBook={handleAddBook}
                searchTerm={searchTerm}
                loading={loading}
              />
            )}
            {activeTab === "users" && (
              <UsersPage
                users={users}
                onAddUser={handleAddUser}
                searchTerm={searchTerm}
                loading={loading}
              />
            )}
            {activeTab === "loans" && (
              <LoansPage
                loans={loans}
                books={books}
                users={users}
                onAddLoan={handleAddLoan}
                onReturnLoan={handleReturnLoan}
                searchTerm={searchTerm}
                loading={loading}
              />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
