import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import PainelDisponibilidade from "../../features/livros/PainelDisponibilidade.jsx";
import { listarDisponibilidade } from "../../services/api.js";

vi.mock("../../services/api.js", () => {
  class ApiError extends Error {
    constructor({ codigo, mensagem, status } = {}) {
      super(mensagem);
      this.name = "ApiError";
      this.codigo = codigo;
      this.mensagem = mensagem;
      this.status = status;
    }
  }
  return {
    API_BASE_URL: "http://localhost:8000",
    ApiError,
    cadastrarLivro: vi.fn(),
    consultarLivros: vi.fn(),
    listarDisponibilidade: vi.fn(),
    cadastrarUsuario: vi.fn(),
    consultarUsuarios: vi.fn(),
    registrarEmprestimo: vi.fn(),
    consultarEmprestimos: vi.fn(),
    registrarDevolucao: vi.fn(),
  };
});

const LIVROS = [
  {
    id: 101,
    titulo: "Fundamentos de Sistemas de Informação",
    quantidadeExemplares: 3,
    quantidadeDisponivel: 2,
    disponivel: true,
  },
  {
    id: 102,
    titulo: "Banco de Dados",
    quantidadeExemplares: 5,
    quantidadeDisponivel: 1,
    disponivel: true,
  },
];

const ANTIGO = "2026-10-13T19:20:00";
const NOVO = "2026-10-13T19:25:00";

function evento(livroId, quantidadeDisponivel, atualizadaEm, extra = {}) {
  return {
    tipo: "devolucao_registrada",
    livroId,
    emprestimoId: 9001,
    status: "devolvido",
    quantidadeDisponivel,
    atualizadaEm,
    ...extra,
  };
}

function disponiveis(titulo) {
  const linha = screen
    .getAllByRole("row")
    .find((l) => within(l).queryAllByRole("cell")[0]?.textContent === titulo);
  return linha ? within(linha).getAllByRole("cell")[1].textContent : null;
}

async function montar() {
  listarDisponibilidade.mockResolvedValue({
    livros: LIVROS.map((l) => ({ ...l })),
  });
  const utils = render(<PainelDisponibilidade evento={null} />);
  await screen.findByText("Banco de Dados");
  return utils;
}

describe("E7 · PainelDisponibilidade ignora evento antigo (F12, CT13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("evento mais antigo do mesmo livro, chegando depois, não desfaz o mais novo", async () => {
    const { rerender } = await montar();
    rerender(<PainelDisponibilidade evento={evento(101, 1, NOVO)} />);
    await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("1"));

    rerender(<PainelDisponibilidade evento={evento(101, 2, ANTIGO)} />);

    await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("1"));
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it("evento mais novo depois do antigo é aplicado", async () => {
    const { rerender } = await montar();
    rerender(<PainelDisponibilidade evento={evento(101, 1, ANTIGO)} />);
    await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("1"));

    rerender(<PainelDisponibilidade evento={evento(101, 3, NOVO)} />);

    await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("3"));
  });

  it("mesmo atualizadaEm: vale o último a chegar", async () => {
    const { rerender } = await montar();
    rerender(<PainelDisponibilidade evento={evento(101, 1, NOVO)} />);
    await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("1"));

    rerender(<PainelDisponibilidade evento={evento(101, 2, NOVO)} />);

    await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("2"));
  });

  it("a comparação é por livro: evento antigo de outro livro é aplicado", async () => {
    const { rerender } = await montar();
    rerender(<PainelDisponibilidade evento={evento(101, 1, NOVO)} />);
    await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("1"));

    rerender(<PainelDisponibilidade evento={evento(102, 4, ANTIGO)} />);

    await waitFor(() => expect(disponiveis(LIVROS[1].titulo)).toBe("4"));
    expect(disponiveis(LIVROS[0].titulo)).toBe("1");
  });

  it("evento antigo com quantidade 0 não remove a linha", async () => {
    const { rerender } = await montar();
    rerender(<PainelDisponibilidade evento={evento(102, 5, NOVO)} />);
    await waitFor(() => expect(disponiveis(LIVROS[1].titulo)).toBe("5"));

    rerender(<PainelDisponibilidade evento={evento(102, 0, ANTIGO)} />);

    await waitFor(() => expect(disponiveis(LIVROS[1].titulo)).toBe("5"));
  });

  it("evento antigo de livro que saiu da lista não o traz de volta nem recarrega", async () => {
    const { rerender } = await montar();
    rerender(<PainelDisponibilidade evento={evento(102, 0, NOVO)} />);
    await waitFor(() => expect(disponiveis(LIVROS[1].titulo)).toBeNull());

    rerender(<PainelDisponibilidade evento={evento(102, 1, ANTIGO)} />);

    await waitFor(() => expect(disponiveis(LIVROS[1].titulo)).toBeNull());
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ausente", undefined],
    ["fora do formato de texto", 20261013],
  ])(
    "atualizadaEm %s: o evento é aplicado e não bloqueia os seguintes",
    async (_nome, valor) => {
      const { rerender } = await montar();
      rerender(<PainelDisponibilidade evento={evento(101, 1, valor)} />);
      await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("1"));

      rerender(<PainelDisponibilidade evento={evento(101, 2, ANTIGO)} />);

      await waitFor(() => expect(disponiveis(LIVROS[0].titulo)).toBe("2"));
    },
  );
});
