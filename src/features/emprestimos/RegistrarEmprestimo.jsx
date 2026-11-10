import { useEffect, useId, useRef, useState } from "react";
import {
  consultarUsuarios,
  listarDisponibilidade,
  registrarEmprestimo,
} from "../../services/api.js";
import { mensagemDeErro } from "../../services/mensagens.js";
import { formatarDataHora } from "../../utils/datas.js";
import "./emprestimos.css";

const TAMANHO_BUSCA_USUARIO = 20;

export default function RegistrarEmprestimo({ onRegistrado }) {
  const id = useId();
  const [textoBusca, setTextoBusca] = useState("");
  // null = nenhuma busca feita ainda; [] = busca sem resultado.
  const [usuarios, setUsuarios] = useState(null);
  const [buscandoUsuarios, setBuscandoUsuarios] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [livros, setLivros] = useState([]);
  const [livroValor, setLivroValor] = useState("");
  const [recargaLivros, setRecargaLivros] = useState(0);
  const [pendente, setPendente] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");
  const buscaAtual = useRef(0);

  function mostrarErro(falha) {
    setSucesso("");
    setErro(mensagemDeErro(falha));
  }

  // Livros disponíveis: ao montar e depois de cada registro com sucesso.
  useEffect(() => {
    let ignorar = false;
    listarDisponibilidade()
      .then((resposta) => {
        if (ignorar) return;
        setLivros(Array.isArray(resposta?.livros) ? resposta.livros : []);
      })
      .catch((falha) => {
        if (ignorar) return;
        // F4: mantém as opções anteriores.
        setSucesso("");
        setErro(mensagemDeErro(falha));
      });
    return () => {
      ignorar = true;
    };
  }, [recargaLivros]);

  async function buscarUsuarios() {
    const numero = ++buscaAtual.current;
    // 6.15.1: status e alert somem assim que a nova busca começa.
    setSucesso("");
    setErro("");
    setBuscandoUsuarios(true);
    try {
      const resposta = await consultarUsuarios({
        busca: textoBusca,
        pagina: 1,
        tamanho: TAMANHO_BUSCA_USUARIO,
      });
      if (numero !== buscaAtual.current) return;
      const lista = Array.isArray(resposta?.usuarios) ? resposta.usuarios : [];
      setUsuarios(lista);
      setUsuarioId((atual) =>
        lista.some((usuario) => usuario.id === atual) ? atual : null,
      );
    } catch (falha) {
      if (numero !== buscaAtual.current) return;
      mostrarErro(falha);
    } finally {
      if (numero === buscaAtual.current) setBuscandoUsuarios(false);
    }
  }

  function teclaNaBusca(evento) {
    // Enter no campo de busca busca o usuário em vez de registrar.
    if (evento.key === "Enter") {
      evento.preventDefault();
      buscarUsuarios();
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    setSucesso("");
    setErro("");
    setPendente(true);
    try {
      const emprestimo = await registrarEmprestimo({
        usuarioId,
        livroId: livroValor === "" ? null : Number(livroValor),
      });
      setSucesso(
        `Empréstimo registrado. Devolver até ${formatarDataHora(
          emprestimo?.dataLimiteDevolucao,
        )}.`,
      );
      setLivroValor("");
      setRecargaLivros((valor) => valor + 1);
      if (onRegistrado) {
        onRegistrado(emprestimo);
      }
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setPendente(false);
    }
  }

  return (
    <section className="emprestimos-cartao">
      <h2 className="emprestimos-cartao-titulo">Registrar empréstimo</h2>
      <form
        aria-label="Registrar empréstimo"
        noValidate
        onSubmit={enviar}
        className="emprestimos-form"
      >
        <div className="emprestimos-linha">
          <div className="emprestimos-campo emprestimos-campo-largo">
            <label htmlFor={`${id}-busca-usuario`}>Buscar usuário</label>
            <input
              id={`${id}-busca-usuario`}
              type="search"
              value={textoBusca}
              onChange={(evento) => setTextoBusca(evento.target.value)}
              onKeyDown={teclaNaBusca}
            />
          </div>
          <button
            type="button"
            className="emprestimos-botao-secundario"
            onClick={buscarUsuarios}
            disabled={buscandoUsuarios}
          >
            Buscar usuário
          </button>
        </div>

        {usuarios !== null && usuarios.length === 0 && (
          <p className="emprestimos-vazio">Nenhum usuário encontrado.</p>
        )}
        {usuarios !== null && usuarios.length > 0 && (
          <fieldset className="emprestimos-usuarios">
            <legend>Usuário</legend>
            {usuarios.map((usuario) => (
              <label key={usuario.id} className="emprestimos-usuario">
                <input
                  type="radio"
                  name={`${id}-usuario`}
                  value={String(usuario.id)}
                  checked={usuarioId === usuario.id}
                  onChange={() => setUsuarioId(usuario.id)}
                />
                <span>{`${usuario.nome} (CPF ${usuario.cpf})`}</span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="emprestimos-campo">
          <label htmlFor={`${id}-livro`}>Livro</label>
          <select
            id={`${id}-livro`}
            value={livroValor}
            onChange={(evento) => setLivroValor(evento.target.value)}
          >
            <option value="">Selecione um livro</option>
            {livros.map((livro) => (
              <option key={livro.id} value={String(livro.id)}>
                {`${livro.titulo} (disponíveis: ${livro.quantidadeDisponivel})`}
              </option>
            ))}
          </select>
        </div>

        <div className="emprestimos-acoes">
          <button
            type="submit"
            className="emprestimos-botao"
            disabled={pendente}
          >
            Registrar empréstimo
          </button>
        </div>
      </form>
      {sucesso && (
        <p
          role="status"
          className="emprestimos-mensagem emprestimos-mensagem-sucesso"
        >
          {sucesso}
        </p>
      )}
      {erro && (
        <p
          role="alert"
          className="emprestimos-mensagem emprestimos-mensagem-erro"
        >
          {erro}
        </p>
      )}
    </section>
  );
}
