import { MENSAGENS_ERRO } from "./mensagens.js";

// Base do Backend 1 (agentes.md F1): sem prefixo /api e sem barra final.
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor({ codigo, mensagem, status }) {
    super(mensagem);
    this.name = "ApiError";
    this.codigo = codigo;
    this.mensagem = mensagem;
    this.status = status;
  }
}

function vazio(valor) {
  return (
    valor === undefined ||
    valor === null ||
    (typeof valor === "string" && valor.trim() === "")
  );
}

// Monta a query na ordem dos pares recebidos, omitindo valores vazios.
function comQuery(caminho, pares) {
  const params = new URLSearchParams();
  for (const [nome, valor] of pares) {
    if (!vazio(valor)) {
      params.append(nome, String(valor));
    }
  }
  const query = params.toString();
  return query ? `${caminho}?${query}` : caminho;
}

async function erroHttp(response) {
  const { status } = response;
  let corpo;
  try {
    corpo = await response.json();
  } catch {
    corpo = undefined;
  }
  const erro =
    corpo !== null && typeof corpo === "object" ? corpo.erro : undefined;
  if (
    erro !== null &&
    typeof erro === "object" &&
    typeof erro.codigo === "string"
  ) {
    const mensagem = typeof erro.mensagem === "string" ? erro.mensagem : "";
    return new ApiError({ codigo: erro.codigo, mensagem, status });
  }
  return new ApiError({
    codigo: status >= 500 ? "ERRO_INTERNO" : "ERRO_INESPERADO",
    mensagem: `Erro HTTP ${status}`,
    status,
  });
}

async function requisitar(caminho, opcoes) {
  let response;
  try {
    response = await globalThis.fetch(`${API_BASE_URL}${caminho}`, opcoes);
  } catch {
    throw new ApiError({
      codigo: "SEM_CONEXAO",
      mensagem: MENSAGENS_ERRO.SEM_CONEXAO,
      status: 0,
    });
  }
  if (!response.ok) {
    throw await erroHttp(response);
  }
  try {
    return await response.json();
  } catch {
    throw new ApiError({
      codigo: "ERRO_INESPERADO",
      mensagem: "Resposta inválida do servidor.",
      status: response.status,
    });
  }
}

function get(caminho, pares) {
  return requisitar(comQuery(caminho, pares), { method: "GET" });
}

function post(caminho, dados) {
  return requisitar(caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
}

export async function cadastrarLivro(dados) {
  return post("/livros", dados);
}

export async function consultarLivros({ busca, pagina, tamanho } = {}) {
  return get("/livros", [
    ["busca", busca],
    ["pagina", pagina],
    ["tamanho", tamanho],
  ]);
}

export async function listarDisponibilidade({ busca } = {}) {
  return get("/livros/disponibilidade", [["busca", busca]]);
}

export async function cadastrarUsuario(dados) {
  return post("/usuarios", dados);
}

export async function consultarUsuarios({ busca, pagina, tamanho } = {}) {
  return get("/usuarios", [
    ["busca", busca],
    ["pagina", pagina],
    ["tamanho", tamanho],
  ]);
}

export async function registrarEmprestimo(dados) {
  return post("/emprestimos", dados);
}

export async function consultarEmprestimos({ status, busca } = {}) {
  return get("/emprestimos", [
    ["status", status],
    ["busca", busca],
  ]);
}

export async function registrarDevolucao(emprestimoId) {
  return requisitar(
    `/emprestimos/${encodeURIComponent(emprestimoId)}/devolucao`,
    { method: "PATCH" },
  );
}
