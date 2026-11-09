import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CadastroLivro from "../../features/livros/CadastroLivro.jsx";
import { cadastrarLivro } from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";

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

const LIVRO_CRIADO = {
  id: 101,
  titulo: "Fundamentos de Sistemas de Informação",
  autor: "Ana Silva",
  isbn: "9780000000001",
  quantidadeExemplares: 3,
  quantidadeDisponivel: 3,
};

function erroApi(codigo, mensagem = "servidor") {
  return Object.assign(new Error("x"), { codigo, mensagem });
}

function campos() {
  return {
    titulo: screen.getByLabelText("Título"),
    autor: screen.getByLabelText("Autor"),
    isbn: screen.getByLabelText("ISBN"),
    quantidade: screen.getByLabelText("Quantidade de exemplares"),
  };
}

async function preencher(user, { titulo, autor, isbn, quantidade }) {
  const c = campos();
  if (titulo) await user.type(c.titulo, titulo);
  if (autor) await user.type(c.autor, autor);
  if (isbn) await user.type(c.isbn, isbn);
  if (quantidade) await user.type(c.quantidade, quantidade);
}

const DADOS = {
  titulo: "Fundamentos de Sistemas de Informação",
  autor: "Ana Silva",
  isbn: "9780000000001",
  quantidade: "3",
};

describe("E2 · CadastroLivro (#785, CT1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("formulário com nome acessível e rótulos exatos", () => {
    // E2 · CadastroLivro · form aria-label "Cadastrar livro", campos Título/Autor/ISBN/Quantidade de exemplares, botão Cadastrar (#785, 6.6)
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    const form = screen.getByRole("form", { name: "Cadastrar livro" });
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute("novalidate");
    const c = campos();
    for (const campo of Object.values(c)) {
      expect(form).toContainElement(campo);
    }
    expect(
      screen.getByRole("button", { name: "Cadastrar" }),
    ).toBeInTheDocument();
  });

  it("envia os textos digitados sem alteração, preservando espaços nas pontas", async () => {
    // E2 · CadastroLivro · envio com textos sem alteração (#785, 6.6, CT1)
    cadastrarLivro.mockResolvedValue(LIVRO_CRIADO);
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await preencher(user, {
      titulo: "  Clean Code  ",
      autor: " Robert Martin ",
      isbn: " 978-0-00-000000-1 ",
      quantidade: "3",
    });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await waitFor(() => expect(cadastrarLivro).toHaveBeenCalledTimes(1));
    expect(cadastrarLivro).toHaveBeenCalledWith({
      titulo: "  Clean Code  ",
      autor: " Robert Martin ",
      isbn: " 978-0-00-000000-1 ",
      quantidadeExemplares: 3,
    });
  });

  it.each([
    ["3", 3],
    ["", ""],
    ["  ", ""],
    ["abc", "abc"],
    ["2.5", 2.5],
  ])("quantidade digitada %j é enviada como %j", async (digitado, esperado) => {
    // E2 · CadastroLivro · regra da quantidade: vazio após trim → '', número finito → Number, senão texto original (#785, 6.6)
    cadastrarLivro.mockResolvedValue(LIVRO_CRIADO);
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await preencher(user, { ...DADOS, quantidade: digitado });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await waitFor(() => expect(cadastrarLivro).toHaveBeenCalledTimes(1));
    expect(cadastrarLivro.mock.calls[0][0].quantidadeExemplares).toStrictEqual(
      esperado,
    );
  });

  it("envio sem preencher nada chama a API (noValidate, validação no Backend 1)", async () => {
    // E2 · CadastroLivro · F5: formulário sempre envia (#785, 6.5)
    cadastrarLivro.mockResolvedValue(LIVRO_CRIADO);
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await waitFor(() => expect(cadastrarLivro).toHaveBeenCalledTimes(1));
    expect(cadastrarLivro).toHaveBeenCalledWith({
      titulo: "",
      autor: "",
      isbn: "",
      quantidadeExemplares: "",
    });
  });

  it("botão Cadastrar fica desabilitado enquanto a requisição está pendente", async () => {
    // E2 · CadastroLivro · botão desabilitado enquanto pendente (#785, 6.5)
    let resolver;
    cadastrarLivro.mockReturnValue(
      new Promise((r) => {
        resolver = r;
      }),
    );
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await preencher(user, DADOS);
    const botao = screen.getByRole("button", { name: "Cadastrar" });
    expect(botao).toBeEnabled();
    await user.click(botao);
    await waitFor(() => expect(botao).toBeDisabled());
    resolver(LIVRO_CRIADO);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cadastrar" })).toBeEnabled(),
    );
  });

  it("sucesso: status com título da resposta, campos limpos e onCadastrado com a resposta", async () => {
    // E2 · CadastroLivro · sucesso (#785, 6.6, CT1)
    const resposta = {
      ...LIVRO_CRIADO,
      titulo: "Título Normalizado Pelo Servidor",
    };
    cadastrarLivro.mockResolvedValue(resposta);
    const onCadastrado = vi.fn();
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={onCadastrado} />);
    await preencher(user, DADOS);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      /^Livro "Título Normalizado Pelo Servidor" cadastrado\.$/,
    );
    const c = campos();
    expect(c.titulo).toHaveValue("");
    expect(c.autor).toHaveValue("");
    expect(c.isbn).toHaveValue("");
    expect(c.quantidade).toHaveValue("");
    expect(onCadastrado).toHaveBeenCalledTimes(1);
    expect(onCadastrado).toHaveBeenCalledWith(resposta);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    "ISBN_DUPLICADO",
    "QUANTIDADE_INVALIDA",
    "DADOS_INVALIDOS",
    "CAMPOS_OBRIGATORIOS",
    "SEM_CONEXAO",
  ])(
    "erro %s: alert com a mensagem do mapa, campos mantidos e onCadastrado não chamado",
    async (codigo) => {
      // E2 · CadastroLivro · erro <codigo> (#785, CT1 e F6)
      cadastrarLivro.mockRejectedValue(erroApi(codigo));
      const onCadastrado = vi.fn();
      const user = userEvent.setup();
      render(<CadastroLivro onCadastrado={onCadastrado} />);
      await preencher(user, DADOS);
      await user.click(screen.getByRole("button", { name: "Cadastrar" }));
      const alerta = await screen.findByRole("alert");
      expect(alerta.textContent.trim()).toBe(MENSAGENS_ERRO[codigo]);
      const c = campos();
      expect(c.titulo).toHaveValue(DADOS.titulo);
      expect(c.autor).toHaveValue(DADOS.autor);
      expect(c.isbn).toHaveValue(DADOS.isbn);
      expect(c.quantidade).toHaveValue(DADOS.quantidade);
      expect(onCadastrado).not.toHaveBeenCalled();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cadastrar" })).toBeEnabled();
    },
  );

  it("erro com código desconhecido mostra a mensagem do servidor", async () => {
    // E2 · CadastroLivro · F6: código fora do mapa usa a mensagem do servidor (#785, 6.5)
    cadastrarLivro.mockRejectedValue(
      erroApi("CODIGO_NOVO", "Mensagem vinda do servidor."),
    );
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await preencher(user, DADOS);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mensagem vinda do servidor.",
    );
  });

  it("mensagem de erro é limpa ao enviar de novo", async () => {
    // E2 · CadastroLivro · mensagens limpas ao reenviar (#785, 6.5)
    cadastrarLivro.mockRejectedValueOnce(erroApi("ISBN_DUPLICADO"));
    cadastrarLivro.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await preencher(user, DADOS);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await waitFor(() => expect(cadastrarLivro).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });

  it("mensagem de sucesso é limpa ao enviar de novo", async () => {
    // E2 · CadastroLivro · mensagens limpas ao reenviar (#785, 6.5)
    cadastrarLivro.mockResolvedValueOnce(LIVRO_CRIADO);
    cadastrarLivro.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    render(<CadastroLivro onCadastrado={vi.fn()} />);
    await preencher(user, DADOS);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await screen.findByRole("status");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    await waitFor(() => expect(cadastrarLivro).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
  });
});
