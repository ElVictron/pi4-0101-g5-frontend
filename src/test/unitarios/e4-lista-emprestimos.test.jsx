import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../services/api.js", () => ({
  consultarEmprestimos: vi.fn(),
  registrarDevolucao: vi.fn(),
}));

import {
  consultarEmprestimos,
  registrarDevolucao,
} from "../../services/api.js";
import ListaEmprestimos from "../../features/emprestimos/ListaEmprestimos.jsx";

const ATIVO = {
  emprestimoId: 1,
  usuarioNome: "Lucas",
  livroTitulo: "Livro A",
  status: "ativo",
  emprestadoEm: "2026-10-13T19:20:00",
  dataLimiteDevolucao: "2026-10-28T19:20:00",
  devolvidoEm: null,
};
const ATRASADO = {
  ...ATIVO,
  emprestimoId: 2,
  usuarioNome: "Maria",
  status: "atrasado",
};

function adiado() {
  let resolver;
  let rejeitar;
  const promessa = new Promise((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

beforeEach(() => {
  vi.resetAllMocks();
  consultarEmprestimos.mockResolvedValue({ emprestimos: [ATIVO, ATRASADO] });
});

afterEach(() => {
  cleanup();
});

describe("E4 · ListaEmprestimos (unitário)", () => {
  it("carga inicial envia objeto vazio, sem chaves undefined", async () => {
    render(<ListaEmprestimos />);
    await screen.findByText("Lucas");
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
    expect(Object.keys(consultarEmprestimos.mock.calls[0][0])).toEqual([]);
  });

  it("ignora resposta antiga quando a aba muda antes de ela chegar", async () => {
    const antiga = adiado();
    const nova = adiado();
    consultarEmprestimos
      .mockResolvedValueOnce({ emprestimos: [ATIVO] })
      .mockReturnValueOnce(antiga.promessa)
      .mockReturnValueOnce(nova.promessa);
    const user = userEvent.setup();
    render(<ListaEmprestimos />);
    await screen.findByText("Lucas");
    await user.click(screen.getByRole("button", { name: "Ativos" }));
    await user.click(screen.getByRole("button", { name: "Atrasados" }));
    nova.resolver({ emprestimos: [ATRASADO] });
    await screen.findByText("Maria");
    antiga.resolver({ emprestimos: [{ ...ATIVO, usuarioNome: "Antigo" }] });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Antigo")).not.toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("ignora erro de consulta substituída", async () => {
    const antiga = adiado();
    consultarEmprestimos
      .mockResolvedValueOnce({ emprestimos: [ATIVO] })
      .mockReturnValueOnce(antiga.promessa)
      .mockResolvedValueOnce({ emprestimos: [ATRASADO] });
    const user = userEvent.setup();
    render(<ListaEmprestimos />);
    await screen.findByText("Lucas");
    await user.click(screen.getByRole("button", { name: "Ativos" }));
    await user.click(screen.getByRole("button", { name: "Atrasados" }));
    await screen.findByText("Maria");
    antiga.rejeitar({ codigo: "ERRO_INTERNO" });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resposta sem lista vira lista vazia", async () => {
    consultarEmprestimos.mockResolvedValue({});
    render(<ListaEmprestimos />);
    expect(
      await screen.findByText("Nenhum empréstimo encontrado."),
    ).toBeInTheDocument();
  });

  it("não mostra vazio quando a carga inicial falha", async () => {
    consultarEmprestimos.mockRejectedValue({ codigo: "ERRO_INTERNO" });
    render(<ListaEmprestimos />);
    await screen.findByRole("alert");
    expect(
      screen.queryByText("Nenhum empréstimo encontrado."),
    ).not.toBeInTheDocument();
  });

  it("botão Devolver fica desabilitado enquanto a devolução está pendente", async () => {
    const pendente = adiado();
    registrarDevolucao.mockReturnValue(pendente.promessa);
    const user = userEvent.setup();
    render(<ListaEmprestimos />);
    await screen.findByText("Lucas");
    const botao = screen.getByRole("button", { name: "Devolver empréstimo 1" });
    await user.click(botao);
    expect(botao).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Devolver empréstimo 2" }),
    ).toBeEnabled();
    pendente.resolver({ devolvidoEm: "2026-10-15T16:30:00" });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Devolução registrada.",
    );
  });

  it("status de devolução some quando uma recarga falha (alert e status nunca juntos)", async () => {
    registrarDevolucao.mockResolvedValue({
      devolvidoEm: "2026-10-15T16:30:00",
    });
    const user = userEvent.setup();
    const { rerender } = render(<ListaEmprestimos versao={0} />);
    await screen.findByText("Lucas");
    await user.click(
      screen.getByRole("button", { name: "Devolver empréstimo 1" }),
    );
    await screen.findByRole("status");
    consultarEmprestimos.mockRejectedValue({ codigo: "SEM_CONEXAO" });
    rerender(<ListaEmprestimos versao={1} />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("evento que volta a null depois de um evento não recarrega", async () => {
    const evento = {
      tipo: "emprestimo_registrado",
      livroId: 1,
      quantidadeDisponivel: 0,
    };
    const { rerender } = render(<ListaEmprestimos evento={evento} />);
    await screen.findByText("Lucas");
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
    rerender(<ListaEmprestimos evento={evento} />);
    rerender(<ListaEmprestimos evento={null} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(consultarEmprestimos).toHaveBeenCalledTimes(1);
  });

  it("aba ativa recebe a classe de destaque", async () => {
    const user = userEvent.setup();
    render(<ListaEmprestimos />);
    await screen.findByText("Lucas");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveClass(
      "emprestimos-aba-ativa",
    );
    await user.click(screen.getByRole("button", { name: "Devolvidos" }));
    expect(screen.getByRole("button", { name: "Devolvidos" })).toHaveClass(
      "emprestimos-aba-ativa",
    );
    expect(screen.getByRole("button", { name: "Todos" })).not.toHaveClass(
      "emprestimos-aba-ativa",
    );
  });

  it("situação desconhecida não tem botão Devolver", async () => {
    consultarEmprestimos.mockResolvedValue({
      emprestimos: [{ ...ATIVO, status: "outro" }],
    });
    render(<ListaEmprestimos />);
    await screen.findByText("Lucas");
    const tabela = screen.getByRole("table", { name: "Empréstimos" });
    expect(within(tabela).queryByRole("button")).not.toBeInTheDocument();
    expect(within(tabela).getByText("outro")).toHaveClass("selo");
  });

  it("evento novo recarrega mesmo sem busca enviada", async () => {
    const { rerender } = render(<ListaEmprestimos />);
    await screen.findByText("Lucas");
    rerender(
      <ListaEmprestimos
        evento={{
          tipo: "devolucao_registrada",
          livroId: 1,
          quantidadeDisponivel: 1,
        }}
      />,
    );
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(2));
    expect(consultarEmprestimos.mock.calls[1]).toEqual([{}]);
  });
  it("evento após devolução mantém Devolução registrada. (recargas automáticas não apagam o status)", async () => {
    registrarDevolucao.mockResolvedValue({
      devolvidoEm: "2026-10-15T16:30:00",
    });
    const user = userEvent.setup();
    const { rerender } = render(<ListaEmprestimos />);
    await screen.findByText("Lucas");
    await user.click(
      screen.getByRole("button", { name: "Devolver empréstimo 1" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Devolução registrada.",
    );
    const evento = {
      tipo: "devolucao_registrada",
      livroId: 1,
      quantidadeDisponivel: 1,
    };
    rerender(<ListaEmprestimos evento={evento} />);
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(2));
    rerender(<ListaEmprestimos evento={evento} reconexoes={1} />);
    rerender(<ListaEmprestimos evento={evento} reconexoes={1} versao={1} />);
    await waitFor(() => expect(consultarEmprestimos).toHaveBeenCalledTimes(4));
    await waitFor(() =>
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Devolução registrada.",
    );
  });
});
