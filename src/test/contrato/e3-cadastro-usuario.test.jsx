import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import { ApiError, cadastrarUsuario } from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";
import CadastroUsuario from "../../features/usuarios/CadastroUsuario.jsx";

const USUARIO_CRIADO = {
  id: 55,
  nome: "Lucas Joaquim",
  cpf: "12345678900",
  contato: "lucas@email.com",
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

function erroApi(codigo, status = 400) {
  return new ApiError({
    codigo,
    mensagem: `mensagem do servidor para ${codigo}`,
    status,
  });
}

function renderizar(props = {}) {
  const onCadastrado = vi.fn();
  const user = userEvent.setup();
  render(<CadastroUsuario onCadastrado={onCadastrado} {...props} />);
  const form = screen.getByRole("form", { name: "Cadastrar usuário" });
  return {
    user,
    onCadastrado,
    form,
    nome: within(form).getByLabelText("Nome"),
    cpf: within(form).getByLabelText("CPF"),
    contato: within(form).getByLabelText("Contato (e-mail ou telefone)"),
    botao: within(form).getByRole("button", { name: "Cadastrar" }),
  };
}

async function preencher(user, campos, valores) {
  if (valores.nome) await user.type(campos.nome, valores.nome);
  if (valores.cpf) await user.type(campos.cpf, valores.cpf);
  if (valores.contato) await user.type(campos.contato, valores.contato);
}

beforeEach(() => {
  vi.mocked(cadastrarUsuario).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("E3 · CadastroUsuario (#787, CT3, 6.9)", () => {
  it("renderiza o formulário com os rótulos exatos e o botão Cadastrar", () => {
    // E3 · CadastroUsuario · form "Cadastrar usuário" com Nome, CPF, Contato (#787, 6.9)
    const { form, nome, cpf, contato, botao } = renderizar();
    expect(form).toBeInTheDocument();
    expect(nome).toBeInTheDocument();
    expect(cpf).toBeInTheDocument();
    expect(contato).toBeInTheDocument();
    expect(botao).toBeEnabled();
  });

  it("não tem campos separados de e-mail, telefone, perfil ou status", () => {
    // E3 · CadastroUsuario · usuário só tem nome, cpf, contato (#787, F3)
    const { form } = renderizar();
    expect(screen.queryByLabelText("E-mail")).toBeNull();
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(screen.queryByLabelText("Telefone")).toBeNull();
    expect(screen.queryByLabelText("Perfil")).toBeNull();
    expect(screen.queryByLabelText("Status")).toBeNull();
    expect(within(form).getAllByRole("textbox")).toHaveLength(3);
    expect(within(form).queryByRole("combobox")).toBeNull();
  });

  it("usa noValidate no formulário", () => {
    // E3 · CadastroUsuario · formulário com noValidate (#787, F5, 6.5)
    const { form } = renderizar();
    expect(form).toHaveAttribute("novalidate");
  });

  it("envia os textos digitados sem alteração", async () => {
    // E3 · CadastroUsuario · envio com textos sem alteração (#787, CT3, 6.9)
    vi.mocked(cadastrarUsuario).mockResolvedValue(USUARIO_CRIADO);
    const campos = renderizar();
    await preencher(campos.user, campos, {
      nome: "  Lucas Joaquim  ",
      cpf: "123.456.789-00",
      contato: " (19) 99999-0000 ",
    });
    await campos.user.click(campos.botao);
    expect(cadastrarUsuario).toHaveBeenCalledTimes(1);
    expect(vi.mocked(cadastrarUsuario).mock.calls[0]).toStrictEqual([
      {
        nome: "  Lucas Joaquim  ",
        cpf: "123.456.789-00",
        contato: " (19) 99999-0000 ",
      },
    ]);
    await screen.findByRole("status");
  });

  it("envio vazio chama a API com textos vazios (validação no Backend 1)", async () => {
    // E3 · CadastroUsuario · envio vazio sempre chama a API (#787, F5)
    vi.mocked(cadastrarUsuario).mockRejectedValue(
      erroApi("CAMPOS_OBRIGATORIOS"),
    );
    const campos = renderizar();
    await campos.user.click(campos.botao);
    expect(cadastrarUsuario).toHaveBeenCalledTimes(1);
    expect(vi.mocked(cadastrarUsuario).mock.calls[0]).toStrictEqual([
      { nome: "", cpf: "", contato: "" },
    ]);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.CAMPOS_OBRIGATORIOS,
    );
  });

  it("desabilita o botão enquanto a requisição está pendente", async () => {
    // E3 · CadastroUsuario · botão desabilitado enquanto pendente (#787, 6.5)
    const pendente = adiado();
    vi.mocked(cadastrarUsuario).mockReturnValue(pendente.promessa);
    const campos = renderizar();
    await preencher(campos.user, campos, {
      nome: "Lucas Joaquim",
      cpf: "12345678900",
      contato: "lucas@email.com",
    });
    await campos.user.click(campos.botao);
    expect(campos.botao).toBeDisabled();
    pendente.resolver(USUARIO_CRIADO);
    await screen.findByRole("status");
    expect(campos.botao).toBeEnabled();
  });

  it("sucesso: mostra status com o nome da resposta, limpa os campos e chama onCadastrado", async () => {
    // E3 · CadastroUsuario · sucesso (#787, CT3, 6.9)
    vi.mocked(cadastrarUsuario).mockResolvedValue(USUARIO_CRIADO);
    const campos = renderizar();
    await preencher(campos.user, campos, {
      nome: "  lucas joaquim ",
      cpf: "123.456.789-00",
      contato: "lucas@email.com",
    });
    await campos.user.click(campos.botao);
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent('Usuário "Lucas Joaquim" cadastrado.');
    expect(campos.nome).toHaveValue("");
    expect(campos.cpf).toHaveValue("");
    expect(campos.contato).toHaveValue("");
    expect(campos.onCadastrado).toHaveBeenCalledTimes(1);
    expect(campos.onCadastrado).toHaveBeenCalledWith(USUARIO_CRIADO);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["CPF_DUPLICADO", 409],
    ["DADOS_INVALIDOS", 400],
    ["CAMPOS_OBRIGATORIOS", 400],
    ["SEM_CONEXAO", 0],
  ])(
    "erro %s: alerta com a mensagem do mapa, campos mantidos, onCadastrado não chamado",
    async (codigo, status) => {
      // E3 · CadastroUsuario · erro por código da ficha CT3 e SEM_CONEXAO (#787, CT3, F6)
      vi.mocked(cadastrarUsuario).mockRejectedValue(erroApi(codigo, status));
      const campos = renderizar();
      await preencher(campos.user, campos, {
        nome: "Lucas Joaquim",
        cpf: "123.456.789-00",
        contato: "lucas@email.com",
      });
      await campos.user.click(campos.botao);
      const alerta = await screen.findByRole("alert");
      expect(alerta).toHaveTextContent(MENSAGENS_ERRO[codigo]);
      expect(campos.nome).toHaveValue("Lucas Joaquim");
      expect(campos.cpf).toHaveValue("123.456.789-00");
      expect(campos.contato).toHaveValue("lucas@email.com");
      expect(campos.onCadastrado).not.toHaveBeenCalled();
      expect(screen.queryByRole("status")).toBeNull();
      expect(campos.botao).toBeEnabled();
    },
  );

  it("erro com código desconhecido mostra a mensagem do servidor", async () => {
    // E3 · CadastroUsuario · código fora do mapa usa a mensagem do servidor (#787, F6)
    vi.mocked(cadastrarUsuario).mockRejectedValue(
      new ApiError({
        codigo: "ERRO_INESPERADO",
        mensagem: "Erro HTTP 418",
        status: 418,
      }),
    );
    const campos = renderizar();
    await campos.user.click(campos.botao);
    expect(await screen.findByRole("alert")).toHaveTextContent("Erro HTTP 418");
  });

  it("limpa a mensagem de erro ao enviar de novo", async () => {
    // E3 · CadastroUsuario · mensagens limpas ao reenviar (#787, 6.5)
    const segundo = adiado();
    vi.mocked(cadastrarUsuario)
      .mockRejectedValueOnce(erroApi("CPF_DUPLICADO", 409))
      .mockReturnValueOnce(segundo.promessa);
    const campos = renderizar();
    await preencher(campos.user, campos, {
      nome: "Lucas Joaquim",
      cpf: "12345678900",
      contato: "lucas@email.com",
    });
    await campos.user.click(campos.botao);
    await screen.findByRole("alert");
    await campos.user.click(campos.botao);
    expect(screen.queryByRole("alert")).toBeNull();
    segundo.resolver(USUARIO_CRIADO);
    expect(await screen.findByRole("status")).toHaveTextContent(
      'Usuário "Lucas Joaquim" cadastrado.',
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("limpa a mensagem de sucesso ao enviar de novo", async () => {
    // E3 · CadastroUsuario · mensagens limpas ao reenviar (#787, 6.5)
    vi.mocked(cadastrarUsuario)
      .mockResolvedValueOnce(USUARIO_CRIADO)
      .mockRejectedValueOnce(erroApi("DADOS_INVALIDOS"));
    const campos = renderizar();
    await preencher(campos.user, campos, {
      nome: "Lucas Joaquim",
      cpf: "12345678900",
      contato: "lucas@email.com",
    });
    await campos.user.click(campos.botao);
    await screen.findByRole("status");
    await campos.user.click(campos.botao);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.DADOS_INVALIDOS,
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});
