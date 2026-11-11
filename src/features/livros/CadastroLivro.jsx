import { useId, useState } from "react";
import { cadastrarLivro } from "../../services/api.js";
import { mensagemDeErro } from "../../services/mensagens.js";
import "./livros.css";

const VAZIO = { titulo: "", autor: "", isbn: "", quantidade: "" };

// Regra da 6.6: vazio após trim → ''; número finito com Number → número;
// senão → o texto original (a validação fica no Backend 1, F5).
function converterQuantidade(texto) {
  if (texto.trim() === "") {
    return "";
  }
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : texto;
}

export default function CadastroLivro({ onCadastrado }) {
  const id = useId();
  const [valores, setValores] = useState(VAZIO);
  const [pendente, setPendente] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  function alterar(campo) {
    return (evento) => {
      const { value } = evento.target;
      setValores((atual) => ({ ...atual, [campo]: value }));
    };
  }

  async function enviar(evento) {
    evento.preventDefault();
    setSucesso("");
    setErro("");
    setPendente(true);
    try {
      const livro = await cadastrarLivro({
        titulo: valores.titulo,
        autor: valores.autor,
        isbn: valores.isbn,
        quantidadeExemplares: converterQuantidade(valores.quantidade),
      });
      setSucesso(`Livro "${livro?.titulo}" cadastrado.`);
      setValores(VAZIO);
      if (onCadastrado) {
        onCadastrado(livro);
      }
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setPendente(false);
    }
  }

  return (
    <section className="livros-cartao">
      <h2 className="livros-cartao-titulo">Cadastrar livro</h2>
      <form
        aria-label="Cadastrar livro"
        noValidate
        onSubmit={enviar}
        className="livros-form"
      >
        <div className="livros-campos">
          <div className="livros-campo livros-campo-largo">
            <label htmlFor={`${id}-titulo`}>Título</label>
            <input
              id={`${id}-titulo`}
              type="text"
              value={valores.titulo}
              onChange={alterar("titulo")}
            />
          </div>
          <div className="livros-campo">
            <label htmlFor={`${id}-autor`}>Autor</label>
            <input
              id={`${id}-autor`}
              type="text"
              value={valores.autor}
              onChange={alterar("autor")}
            />
          </div>
          <div className="livros-campo">
            <label htmlFor={`${id}-isbn`}>ISBN</label>
            <input
              id={`${id}-isbn`}
              type="text"
              value={valores.isbn}
              onChange={alterar("isbn")}
            />
          </div>
          <div className="livros-campo">
            <label htmlFor={`${id}-quantidade`}>Quantidade de exemplares</label>
            <input
              id={`${id}-quantidade`}
              type="text"
              inputMode="numeric"
              value={valores.quantidade}
              onChange={alterar("quantidade")}
            />
          </div>
        </div>
        <div className="livros-acoes">
          <button type="submit" className="livros-botao" disabled={pendente}>
            Cadastrar
          </button>
        </div>
      </form>
      {sucesso && (
        <p role="status" className="livros-mensagem livros-mensagem-sucesso">
          {sucesso}
        </p>
      )}
      {erro && (
        <p role="alert" className="livros-mensagem livros-mensagem-erro">
          {erro}
        </p>
      )}
    </section>
  );
}
