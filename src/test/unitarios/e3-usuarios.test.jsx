import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  within,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../services/api.js", () => ({
  cadastrarUsuario: vi.fn(),
  consultarUsuarios: vi.fn(),
}));

import { cadastrarUsuario, consultarUsuarios } from "../../services/api.js";
import { MENSAGEM_PADRAO } from "../../services/mensagens.js";
import CadastroUsuario from "../../features/usuarios/CadastroUsuario.jsx";
import PesquisaUsuarios from "../../features/usuarios/PesquisaUsuarios.jsx";

function adiado() {
  let resolver;
  let rejeitar;
  const promessa = new Promise((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

function usuario(id, nome, emprestimos = []) {
  return { id, nome, cpf: `000${id}`, contato: `${id}@x.com`, emprestimos };
}

function resposta(usuarios, total = usuarios.length) {
  return { usuarios, total, pagina: 1, tamanho: 20 };
}

beforeEach(() => {
  vi.mocked(cadastrarUsuario).mockReset();
  vi.mocked(consultarUsuarios).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("E3 · CadastroUsuario · unitários", () => {
  it("funciona sem a prop onCadastrado", async () => {
    vi.mocked(cadastrarUsuario).mockResolvedValue({ id: 1, nome: "Ana" });
    const user = userEvent.setup();
    render(<CadastroUsuario />);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      'Usuário "Ana" cadastrado.',
    );
  });

  it("erro sem código nem mensagem mostra o texto padrão", async () => {
    vi.mocked(cadastrarUsuario).mockRejectedValue(new Error(""));
    const user = userEvent.setup();
    render(<CadastroUsuario onCadastrado={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAGEM_PADRAO);
  });

  it("não mostra status nem alerta antes do primeiro envio", () => {
    render(<CadastroUsuario />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("E3 · PesquisaUsuarios · unitários", () => {
  it("ignora a resposta antiga quando uma nova busca é enviada antes", async () => {
    const inicial = adiado();
    const nova = adiado();
    vi.mocked(consultarUsuarios)
      .mockReturnValueOnce(inicial.promessa)
      .mockReturnValueOnce(nova.promessa);
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await user.type(screen.getByLabelText("Buscar usuários"), "Bia");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(consultarUsuarios).toHaveBeenCalledTimes(2);

    await act(async () => {
      nova.resolver(resposta([usuario(2, "Bia")]));
    });
    await screen.findByRole("article", { name: "Bia" });

    await act(async () => {
      inicial.resolver(resposta([usuario(1, "Antigo")]));
    });
    expect(screen.queryByRole("article", { name: "Antigo" })).toBeNull();
    expect(screen.getByRole("article", { name: "Bia" })).toBeInTheDocument();
    expect(screen.getByText("Total: 1")).toBeInTheDocument();
  });

  it("ignora o erro de uma consulta antiga", async () => {
    const inicial = adiado();
    vi.mocked(consultarUsuarios)
      .mockReturnValueOnce(inicial.promessa)
      .mockResolvedValueOnce(resposta([usuario(2, "Bia")]));
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByRole("article", { name: "Bia" });
    await act(async () => {
      inicial.rejeitar({ codigo: "ERRO_INTERNO" });
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("erro ao paginar mantém a lista anterior e mostra o alerta", async () => {
    vi.mocked(consultarUsuarios)
      .mockResolvedValueOnce(resposta([usuario(1, "Ana")], 45))
      .mockRejectedValueOnce({ codigo: "PAGINACAO_INVALIDA" });
    const user = userEvent.setup();
    render(<PesquisaUsuarios />);
    await screen.findByRole("article", { name: "Ana" });
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("article", { name: "Ana" })).toBeInTheDocument();
    expect(screen.getByText("Total: 45")).toBeInTheDocument();
    expect(screen.queryByText("Carregando...")).toBeNull();
  });

  it("não chama a API em dobro na montagem com versao inicial diferente de 0", async () => {
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([]));
    render(<PesquisaUsuarios versao={3} />);
    await screen.findByText("Nenhum usuário encontrado.");
    expect(consultarUsuarios).toHaveBeenCalledTimes(1);
  });

  it("não mostra 'Nenhum usuário encontrado.' antes da primeira resposta", () => {
    vi.mocked(consultarUsuarios).mockReturnValue(adiado().promessa);
    render(<PesquisaUsuarios />);
    expect(screen.queryByText("Nenhum usuário encontrado.")).toBeNull();
    expect(screen.queryByText(/^Total:/)).toBeNull();
  });

  it("usuário sem o campo emprestimos mostra 'Sem empréstimos.'", async () => {
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([{ id: 9, nome: "Caio", cpf: "1", contato: "c" }]),
    );
    render(<PesquisaUsuarios />);
    const artigo = await screen.findByRole("article", { name: "Caio" });
    expect(within(artigo).getByText("Sem empréstimos.")).toBeInTheDocument();
  });

  it("data limite de empréstimo atrasado recebe a classe data-atrasada", async () => {
    vi.mocked(consultarUsuarios).mockResolvedValue(
      resposta([
        usuario(1, "Ana", [
          {
            emprestimoId: 1,
            livroTitulo: "Livro A",
            status: "atrasado",
            dataLimiteDevolucao: "2026-09-16T08:05:00",
            devolvidoEm: null,
          },
          {
            emprestimoId: 2,
            livroTitulo: "Livro B",
            status: "ativo",
            dataLimiteDevolucao: "2026-12-16T08:05:00",
            devolvidoEm: null,
          },
        ]),
      ]),
    );
    render(<PesquisaUsuarios />);
    expect(
      await screen.findByText("Devolver até 16/09/2026 08:05"),
    ).toHaveClass("data-atrasada");
    expect(screen.getByText("Devolver até 16/12/2026 08:05")).not.toHaveClass(
      "data-atrasada",
    );
  });

  it("resposta sem usuarios/total vira lista vazia e total 0", async () => {
    vi.mocked(consultarUsuarios).mockResolvedValue({});
    render(<PesquisaUsuarios />);
    expect(
      await screen.findByText("Nenhum usuário encontrado."),
    ).toBeInTheDocument();
    expect(screen.getByText("Total: 0")).toBeInTheDocument();
  });

  it("mudar tamanho consulta de novo com o novo tamanho", async () => {
    vi.mocked(consultarUsuarios).mockResolvedValue(resposta([]));
    const { rerender } = render(<PesquisaUsuarios tamanho={20} />);
    await screen.findByText("Nenhum usuário encontrado.");
    rerender(<PesquisaUsuarios tamanho={5} />);
    await waitFor(() => expect(consultarUsuarios).toHaveBeenCalledTimes(2));
    expect(vi.mocked(consultarUsuarios).mock.calls[1][0]).toMatchObject({
      pagina: 1,
      tamanho: 5,
    });
  });
});
