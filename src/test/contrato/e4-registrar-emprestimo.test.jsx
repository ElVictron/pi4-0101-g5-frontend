import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../services/api.js", () => {
  class ApiError extends Error {
    constructor({ codigo, mensagem, status }) {
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

import {
  ApiError,
  listarDisponibilidade,
  consultarUsuarios,
  registrarEmprestimo,
} from "../../services/api.js";
import { MENSAGENS_ERRO } from "../../services/mensagens.js";
import RegistrarEmprestimo from "../../features/emprestimos/RegistrarEmprestimo.jsx";

// Dados no formato do CT7 (LivroDisponibilidade)
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
    quantidadeExemplares: 1,
    quantidadeDisponivel: 1,
    disponivel: true,
  },
];

// Dados no formato do CT4 (UsuarioResumo)
const USUARIOS = [
  {
    id: 55,
    nome: "Lucas Joaquim",
    cpf: "12345678900",
    contato: "lucas@email.com",
    emprestimos: [],
  },
  {
    id: 56,
    nome: "Lucas Silva",
    cpf: "98765432100",
    contato: "19999990000",
    emprestimos: [],
  },
];

// Resposta no formato do CT5
const RESPOSTA_CT5 = {
  emprestimoId: 9001,
  usuarioId: 55,
  livroId: 101,
  status: "ativo",
  emprestadoEm: "2026-10-13T19:20:00",
  dataLimiteDevolucao: "2026-10-28T19:20:00",
  devolvidoEm: null,
};

const OPCAO_101 = "Fundamentos de Sistemas de Informação (disponíveis: 2)";
const OPCAO_102 = "Banco de Dados (disponíveis: 1)";
const RADIO_55 = "Lucas Joaquim (CPF 12345678900)";
const RADIO_56 = "Lucas Silva (CPF 98765432100)";

// role="alert" contém só o texto da mensagem (esclarecimento do PM, 6.5)
function textoDe(el) {
  return el.textContent.replace(/\s+/g, " ").trim();
}

function erroApi(codigo, status = 400) {
  return new ApiError({
    codigo,
    mensagem: `mensagem do servidor para ${codigo}`,
    status,
  });
}

function adiado() {
  let resolver;
  let rejeitar;
  const promessa = new Promise((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

function campoBuscaUsuario() {
  return screen.getByLabelText("Buscar usuário", { selector: "input" });
}

function botaoBuscaUsuario() {
  return screen.getByRole("button", { name: "Buscar usuário" });
}

function selectLivro() {
  return screen.getByRole("combobox", { name: "Livro" });
}

function botaoRegistrar() {
  return screen.getByRole("button", { name: "Registrar empréstimo" });
}

async function renderizar(props = {}) {
  const user = userEvent.setup();
  const onRegistrado = props.onRegistrado ?? vi.fn();
  render(<RegistrarEmprestimo onRegistrado={onRegistrado} />);
  await screen.findByRole("option", { name: OPCAO_101 });
  return { user, onRegistrado };
}

async function buscarEEscolherUsuario(
  user,
  busca = "Lucas",
  nomeRadio = RADIO_55,
) {
  await user.type(campoBuscaUsuario(), busca);
  await user.click(botaoBuscaUsuario());
  const radio = await screen.findByRole("radio", { name: nomeRadio });
  await user.click(radio);
  return radio;
}

beforeEach(() => {
  vi.resetAllMocks();
  listarDisponibilidade.mockResolvedValue({ livros: LIVROS });
  consultarUsuarios.mockResolvedValue({
    usuarios: USUARIOS,
    total: 2,
    pagina: 1,
    tamanho: 20,
  });
  registrarEmprestimo.mockResolvedValue(RESPOSTA_CT5);
});

afterEach(() => {
  cleanup();
});

describe("E4 · RegistrarEmprestimo (#794, CT4, CT5, CT7)", () => {
  it("renderiza o formulário com nome acessível", async () => {
    // E4 · RegistrarEmprestimo · form aria-label "Registrar empréstimo" (#794, 6.11)
    await renderizar();
    expect(
      screen.getByRole("form", { name: "Registrar empréstimo" }),
    ).toBeInTheDocument();
    expect(botaoRegistrar()).toBeEnabled();
  });

  it("carrega os livros ao montar com listarDisponibilidade() sem argumentos", async () => {
    // E4 · RegistrarEmprestimo · carga do select por listarDisponibilidade() (#794, CT7)
    await renderizar();
    expect(listarDisponibilidade).toHaveBeenCalledTimes(1);
    expect(listarDisponibilidade.mock.calls[0]).toHaveLength(0);
  });

  it('select "Livro" tem a opção vazia e uma opção por livro com valor = id', async () => {
    // E4 · RegistrarEmprestimo · opções do select de livro (#794, CT7, 6.11)
    await renderizar();
    const select = selectLivro();
    const opcoes = screen.getAllByRole("option");
    expect(opcoes).toHaveLength(3);
    expect(opcoes[0]).toHaveTextContent("Selecione um livro");
    expect(opcoes[0]).toHaveValue("");
    expect(opcoes[1]).toHaveTextContent(OPCAO_101);
    expect(opcoes[1]).toHaveValue("101");
    expect(opcoes[2]).toHaveTextContent(OPCAO_102);
    expect(opcoes[2]).toHaveValue("102");
    expect(select).toHaveValue("");
  });

  it('botão "Buscar usuário" chama consultarUsuarios({ busca, pagina: 1, tamanho: 20 }) sem enviar o formulário', async () => {
    // E4 · RegistrarEmprestimo · busca de usuário por CT4 (#794, CT4)
    const { user } = await renderizar();
    await user.type(campoBuscaUsuario(), "Lucas");
    await user.click(botaoBuscaUsuario());
    await waitFor(() => expect(consultarUsuarios).toHaveBeenCalledTimes(1));
    expect(consultarUsuarios).toHaveBeenCalledWith({
      busca: "Lucas",
      pagina: 1,
      tamanho: 20,
    });
    expect(botaoBuscaUsuario()).toHaveAttribute("type", "button");
    expect(registrarEmprestimo).not.toHaveBeenCalled();
  });

  it("busca de usuário é enviada como digitada, sem trim", async () => {
    // E4 · RegistrarEmprestimo · busca sem trim (#794, CT4, esclarecimento 6.5)
    const { user } = await renderizar();
    await user.type(campoBuscaUsuario(), " 123.456 ");
    await user.click(botaoBuscaUsuario());
    await waitFor(() => expect(consultarUsuarios).toHaveBeenCalledTimes(1));
    expect(consultarUsuarios).toHaveBeenCalledWith({
      busca: " 123.456 ",
      pagina: 1,
      tamanho: 20,
    });
  });

  it('mostra cada usuário encontrado como botão de rádio "nome (CPF cpf)"', async () => {
    // E4 · RegistrarEmprestimo · resultados da busca como rádio (#794, CT4)
    const { user } = await renderizar();
    await user.type(campoBuscaUsuario(), "Lucas");
    await user.click(botaoBuscaUsuario());
    expect(
      await screen.findByRole("radio", { name: RADIO_55 }),
    ).not.toBeChecked();
    expect(screen.getByRole("radio", { name: RADIO_56 })).not.toBeChecked();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it('busca sem resultado mostra "Nenhum usuário encontrado."', async () => {
    // E4 · RegistrarEmprestimo · busca de usuário vazia (#794, CT4)
    consultarUsuarios.mockResolvedValue({
      usuarios: [],
      total: 0,
      pagina: 1,
      tamanho: 20,
    });
    const { user } = await renderizar();
    await user.type(campoBuscaUsuario(), "Inexistente");
    await user.click(botaoBuscaUsuario());
    expect(
      await screen.findByText("Nenhum usuário encontrado."),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("envio com usuário e livro escolhidos chama registrarEmprestimo com ids numéricos", async () => {
    // E4 · RegistrarEmprestimo · envio caminho feliz (#794, CT5)
    const { user } = await renderizar();
    await buscarEEscolherUsuario(user);
    await user.selectOptions(selectLivro(), "101");
    await user.click(botaoRegistrar());
    await waitFor(() => expect(registrarEmprestimo).toHaveBeenCalledTimes(1));
    expect(registrarEmprestimo).toHaveBeenCalledWith({
      usuarioId: 55,
      livroId: 101,
    });
    const [arg] = registrarEmprestimo.mock.calls[0];
    expect(typeof arg.usuarioId).toBe("number");
    expect(typeof arg.livroId).toBe("number");
  });

  it("envio usa o usuário escolhido entre vários resultados", async () => {
    // E4 · RegistrarEmprestimo · usuarioId = id do rádio marcado (#794, CT5)
    const { user } = await renderizar();
    await buscarEEscolherUsuario(user, "Lucas", RADIO_56);
    await user.selectOptions(selectLivro(), "102");
    await user.click(botaoRegistrar());
    await waitFor(() => expect(registrarEmprestimo).toHaveBeenCalledTimes(1));
    expect(registrarEmprestimo).toHaveBeenCalledWith({
      usuarioId: 56,
      livroId: 102,
    });
  });

  it("envio sem escolher nada chama registrarEmprestimo({ usuarioId: null, livroId: null })", async () => {
    // E4 · RegistrarEmprestimo · validação fica no Backend 1, sempre envia (#794, CT5, F5)
    const { user } = await renderizar();
    await user.click(botaoRegistrar());
    await waitFor(() => expect(registrarEmprestimo).toHaveBeenCalledTimes(1));
    expect(registrarEmprestimo.mock.calls[0]).toEqual([
      { usuarioId: null, livroId: null },
    ]);
    expect(registrarEmprestimo.mock.calls[0][0].usuarioId).toBeNull();
    expect(registrarEmprestimo.mock.calls[0][0].livroId).toBeNull();
  });

  it("envio com usuário escolhido e sem livro manda livroId null", async () => {
    // E4 · RegistrarEmprestimo · livroId null sem seleção (#794, CT5, F5)
    const { user } = await renderizar();
    await buscarEEscolherUsuario(user);
    await user.click(botaoRegistrar());
    await waitFor(() => expect(registrarEmprestimo).toHaveBeenCalledTimes(1));
    expect(registrarEmprestimo.mock.calls[0]).toEqual([
      { usuarioId: 55, livroId: null },
    ]);
    expect(registrarEmprestimo.mock.calls[0][0].livroId).toBeNull();
  });

  it('botão "Registrar empréstimo" fica desabilitado enquanto a requisição está pendente', async () => {
    // E4 · RegistrarEmprestimo · botão desabilitado durante envio (#794, 6.5)
    const pendente = adiado();
    registrarEmprestimo.mockReturnValue(pendente.promessa);
    const { user } = await renderizar();
    await buscarEEscolherUsuario(user);
    await user.selectOptions(selectLivro(), "101");
    await user.click(botaoRegistrar());
    await waitFor(() => expect(botaoRegistrar()).toBeDisabled());
    pendente.resolver(RESPOSTA_CT5);
    await waitFor(() => expect(botaoRegistrar()).toBeEnabled());
  });

  it("sucesso: mensagem com data limite formatada, onRegistrado, select limpo e nova carga de livros", async () => {
    // E4 · RegistrarEmprestimo · sucesso mostra dataLimiteDevolucao (#794, CT5, CT7)
    const { user, onRegistrado } = await renderizar();
    await buscarEEscolherUsuario(user);
    await user.selectOptions(selectLivro(), "101");
    expect(selectLivro()).toHaveValue("101");
    await user.click(botaoRegistrar());
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      /^Empréstimo registrado\. Devolver até 28\/10\/2026 19:20\.$/,
    );
    expect(onRegistrado).toHaveBeenCalledTimes(1);
    expect(onRegistrado).toHaveBeenCalledWith(RESPOSTA_CT5);
    await waitFor(() => expect(listarDisponibilidade).toHaveBeenCalledTimes(2));
    expect(listarDisponibilidade.mock.calls[1]).toHaveLength(0);
    await waitFor(() => expect(selectLivro()).toHaveValue(""));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  const ERROS_CT5 = [
    ["USUARIO_NAO_ENCONTRADO", 404],
    ["LIVRO_NAO_ENCONTRADO", 404],
    ["LIVRO_INDISPONIVEL", 409],
    ["CAMPOS_OBRIGATORIOS", 400],
    ["DADOS_INVALIDOS", 400],
    ["SEM_CONEXAO", 0],
  ];

  it.each(ERROS_CT5)(
    "erro %s: role alert com a mensagem do mapa, seleções mantidas, onRegistrado não chamado",
    async (codigo, httpStatus) => {
      // E4 · RegistrarEmprestimo · erro da ficha CT5 / SEM_CONEXAO (#794, CT5, F6)
      registrarEmprestimo.mockRejectedValue(erroApi(codigo, httpStatus));
      const { user, onRegistrado } = await renderizar();
      const radio = await buscarEEscolherUsuario(user);
      await user.selectOptions(selectLivro(), "101");
      await user.click(botaoRegistrar());
      const alerta = await screen.findByRole("alert");
      expect(textoDe(alerta)).toBe(MENSAGENS_ERRO[codigo]);
      expect(alerta).not.toHaveTextContent(
        `mensagem do servidor para ${codigo}`,
      );
      expect(onRegistrado).not.toHaveBeenCalled();
      expect(radio).toBeChecked();
      expect(selectLivro()).toHaveValue("101");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(botaoRegistrar()).toBeEnabled();
    },
  );

  it("mensagem de erro é limpa ao enviar de novo", async () => {
    // E4 · RegistrarEmprestimo · mensagens limpas ao reenviar (#794, 6.5)
    registrarEmprestimo
      .mockRejectedValueOnce(erroApi("LIVRO_INDISPONIVEL", 409))
      .mockResolvedValueOnce(RESPOSTA_CT5);
    const { user } = await renderizar();
    await buscarEEscolherUsuario(user);
    await user.selectOptions(selectLivro(), "101");
    await user.click(botaoRegistrar());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      MENSAGENS_ERRO.LIVRO_INDISPONIVEL,
    );
    await user.click(botaoRegistrar());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Empréstimo registrado. Devolver até 28/10/2026 19:20.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
