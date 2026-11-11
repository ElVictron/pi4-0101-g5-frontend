export const MENSAGENS_ERRO = {
  CAMPOS_OBRIGATORIOS: "Preencha todos os campos obrigatórios.",
  DADOS_INVALIDOS: "Dados inválidos. Confira os campos e tente novamente.",
  QUANTIDADE_INVALIDA:
    "A quantidade de exemplares deve ser um número inteiro maior que zero.",
  ISBN_DUPLICADO: "Já existe um livro com este ISBN.",
  CPF_DUPLICADO: "Já existe um usuário com este CPF.",
  PAGINACAO_INVALIDA: "Página ou tamanho de página inválido.",
  BUSCA_INVALIDA: "O termo de busca deve ter no máximo 100 caracteres.",
  STATUS_INVALIDO: "Situação inválida.",
  USUARIO_NAO_ENCONTRADO: "Usuário não encontrado.",
  LIVRO_NAO_ENCONTRADO: "Livro não encontrado.",
  LIVRO_INDISPONIVEL: "Não há exemplar disponível deste livro.",
  EMPRESTIMO_NAO_ENCONTRADO: "Empréstimo não encontrado.",
  EMPRESTIMO_JA_DEVOLVIDO: "Este empréstimo já foi devolvido.",
  ERRO_INTERNO: "Erro interno no servidor. Tente novamente mais tarde.",
  SEM_CONEXAO:
    "Não foi possível conectar ao servidor. Verifique se o Backend 1 está em execução.",
};

export const MENSAGEM_PADRAO = "Ocorreu um erro inesperado.";

// Código presente em MENSAGENS_ERRO → esse texto; senão erro.mensagem não
// vazia; senão MENSAGEM_PADRAO. Aceita qualquer valor sem lançar exceção.
export function mensagemDeErro(erro) {
  if (erro === null || typeof erro !== "object") {
    return MENSAGEM_PADRAO;
  }
  const { codigo, mensagem } = erro;
  if (typeof codigo === "string" && Object.hasOwn(MENSAGENS_ERRO, codigo)) {
    return MENSAGENS_ERRO[codigo];
  }
  if (typeof mensagem === "string" && mensagem !== "") {
    return mensagem;
  }
  return MENSAGEM_PADRAO;
}
