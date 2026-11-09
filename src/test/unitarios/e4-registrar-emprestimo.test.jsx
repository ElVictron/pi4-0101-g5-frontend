import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../services/api.js", () => ({
  listarDisponibilidade: vi.fn(),
  consultarUsuarios: vi.fn(),
  registrarEmprestimo: vi.fn(),
}));

import {
  listarDisponibilidade,
  consultarUsuarios,
  registrarEmprestimo,
} from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";
import RegistrarEmprestimo from "../../features/emprestimos/RegistrarEmprestimo.jsx";

const LIVROS = [
  { id: 101, titulo: "Livro A", quantidadeDisponivel: 2 },
  { id: 102, titulo: "Livro B", quantidadeDisponivel: 1 },
];
const ANA = { id: 1, nome: "Ana", cpf: "111" };
const BETO = { id: 2, nome: "Beto", cpf: "222" };

function adiado() {
  let resolver;
  const promessa = new Promise((res) => {
    resolver = res;
  });
  return { promessa, resolver };
}

function campoBusca() {
  return screen.getByLabelText("Buscar usuário", { selector: "input" });
}

async function renderizar(props = {}) {
  const user = userEvent.setup();
  render(<RegistrarEmprestimo {...props} />);
  await screen.findByRole("option", { name: "Livro A (disponíveis: 2)" });
  return user;
}

beforeEach(() => {
  vi.resetAllMocks();
  listarDisponibilidade.mockResolvedValue({ livros: LIVROS });
  consultarUsuarios.mockResolvedValue({ usuarios: [ANA, BETO] });
  registrarEmprestimo.mockResolvedValue({
    dataLimiteDevolucao: "2026-10-28T19:20:00",
  });
});

afterEach(() => {
  cleanup();
});

describe("E4 · RegistrarEmprestimo (unitário)", () => {
  it("Enter no campo de busca busca usuários e não registra", async () => {
    const user = await renderizar();
    await user.type(campoBusca(), "An{Enter}");
    expect(
      await screen.findByRole("radio", { name: "Ana (CPF 111)" }),
    ).toBeInTheDocument();
    expect(consultarUsuarios).toHaveBeenCalledWith({
      busca: "An",
      pagina: 1,
      tamanho: 20,
    });
    expect(registrarEmprestimo).not.toHaveBeenCalled();
  });

  it("não mostra 'Nenhum usuário encontrado.' antes de buscar", async () => {
    await renderizar();
    expect(
      screen.queryByText("Nenhum usuário encontrado."),
    ).not.toBeInTheDocument();
  });

  it("falha ao carregar livros aparece no role alert", async () => {
    listarDisponibilidade.mockRejectedValue({ codigo: "SEM_CONEXAO" });
    render(<RegistrarEmprestimo />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.SEM_CONEXAO,
    );
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("falha na busca de usuário aparece no role alert", async () => {
    consultarUsuarios.mockRejectedValue({ codigo: "BUSCA_INVALIDA" });
    const user = await renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar usuário" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.BUSCA_INVALIDA,
    );
  });

  it("resposta de busca sem lista mostra vazio", async () => {
    consultarUsuarios.mockResolvedValue({});
    const user = await renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar usuário" }));
    expect(
      await screen.findByText("Nenhum usuário encontrado."),
    ).toBeInTheDocument();
  });

  it("ignora resposta de busca de usuário antiga", async () => {
    const antiga = adiado();
    consultarUsuarios
      .mockReturnValueOnce(antiga.promessa)
      .mockResolvedValueOnce({ usuarios: [BETO] });
    const user = await renderizar();
    const botao = screen.getByRole("button", { name: "Buscar usuário" });
    await user.click(botao);
    // Enter dispara nova busca mesmo com o botão desabilitado
    await user.type(campoBusca(), "{Enter}");
    expect(
      await screen.findByRole("radio", { name: "Beto (CPF 222)" }),
    ).toBeInTheDocument();
    antiga.resolver({ usuarios: [ANA] });
    await new Promise((r) => setTimeout(r, 20));
    expect(
      screen.queryByRole("radio", { name: "Ana (CPF 111)" }),
    ).not.toBeInTheDocument();
  });

  it("usuário escolhido continua marcado após o sucesso", async () => {
    const user = await renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar usuário" }));
    const radio = await screen.findByRole("radio", { name: "Beto (CPF 222)" });
    await user.click(radio);
    await user.click(
      screen.getByRole("button", { name: "Registrar empréstimo" }),
    );
    await screen.findByRole("status");
    expect(radio).toBeChecked();
    expect(registrarEmprestimo).toHaveBeenCalledWith({
      usuarioId: 2,
      livroId: null,
    });
  });

  it("nova busca sem o usuário escolhido limpa a escolha", async () => {
    const user = await renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar usuário" }));
    await user.click(
      await screen.findByRole("radio", { name: "Ana (CPF 111)" }),
    );
    consultarUsuarios.mockResolvedValue({ usuarios: [BETO] });
    await user.click(screen.getByRole("button", { name: "Buscar usuário" }));
    await screen.findByRole("radio", { name: "Beto (CPF 222)" });
    await waitFor(() =>
      expect(
        screen.queryByRole("radio", { name: "Ana (CPF 111)" }),
      ).not.toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: "Registrar empréstimo" }),
    );
    await waitFor(() =>
      expect(registrarEmprestimo).toHaveBeenCalledWith({
        usuarioId: null,
        livroId: null,
      }),
    );
  });

  it("sucesso sem onRegistrado não lança exceção", async () => {
    const user = await renderizar();
    await user.click(
      screen.getByRole("button", { name: "Registrar empréstimo" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Empréstimo registrado. Devolver até 28/10/2026 19:20.",
    );
  });

  it("falha ao recarregar livros após sucesso troca o status pelo alert", async () => {
    const onRegistrado = vi.fn();
    const user = await renderizar({ onRegistrado });
    listarDisponibilidade.mockRejectedValue({ codigo: "ERRO_INTERNO" });
    await user.click(
      screen.getByRole("button", { name: "Registrar empréstimo" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.ERRO_INTERNO,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(onRegistrado).toHaveBeenCalledTimes(1);
    // F4: opções anteriores mantidas
    expect(
      screen.getByRole("option", { name: "Livro A (disponíveis: 2)" }),
    ).toBeInTheDocument();
  });

  it("resposta de livros sem lista deixa só a opção vazia", async () => {
    listarDisponibilidade.mockResolvedValue({});
    render(<RegistrarEmprestimo />);
    await waitFor(() => expect(listarDisponibilidade).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });
});
