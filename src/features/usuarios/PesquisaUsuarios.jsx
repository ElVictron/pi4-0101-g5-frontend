import { useEffect, useState } from "react";
import { consultarUsuarios } from "../../services/api.js";
import { mensagemDeErro } from "../../services/mensagens.js";
import { formatarDataHora } from "../../utils/datas.js";
import SeloSituacao from "../../components/SeloSituacao.jsx";
import "./usuarios.css";

function CartaoUsuario({ usuario }) {
  const emprestimos = usuario.emprestimos ?? [];
  return (
    <article aria-label={usuario.nome} className="usuario-cartao">
      <h3 className="usuario-nome">{usuario.nome}</h3>
      <p className="usuario-dado">{`CPF: ${usuario.cpf}`}</p>
      <p className="usuario-dado">{`Contato: ${usuario.contato}`}</p>
      {emprestimos.length === 0 ? (
        <p className="usuario-sem-emprestimos">Sem empréstimos.</p>
      ) : (
        <ul className="usuario-emprestimos">
          {emprestimos.map((emprestimo) => (
            <li key={emprestimo.emprestimoId} className="usuario-emprestimo">
              <span className="usuario-emprestimo-titulo">
                {emprestimo.livroTitulo}
              </span>
              <SeloSituacao status={emprestimo.status} />
              <span
                className={
                  emprestimo.status === "atrasado" && !emprestimo.devolvidoEm
                    ? "usuario-emprestimo-data data-atrasada"
                    : "usuario-emprestimo-data"
                }
              >
                {emprestimo.devolvidoEm
                  ? `Devolvido em ${formatarDataHora(emprestimo.devolvidoEm)}`
                  : `Devolver até ${formatarDataHora(emprestimo.dataLimiteDevolucao)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function PesquisaUsuarios({ versao = 0, tamanho = 20 }) {
  const [texto, setTexto] = useState("");
  // busca === undefined: nenhuma busca enviada ainda (carga inicial sem a chave).
  const [consulta, setConsulta] = useState({ busca: undefined, pagina: 1 });
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    const { busca, pagina } = consulta;
    const parametros =
      busca === undefined ? { pagina, tamanho } : { busca, pagina, tamanho };
    setCarregando(true);
    setErro("");
    consultarUsuarios(parametros)
      .then((dados) => {
        if (!ativo) return;
        setUsuarios(dados?.usuarios ?? []);
        setTotal(dados?.total ?? 0);
        setCarregado(true);
      })
      .catch((falha) => {
        if (!ativo) return;
        setErro(mensagemDeErro(falha));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [consulta, versao, tamanho]);

  function enviar(evento) {
    evento.preventDefault();
    setConsulta({ busca: texto, pagina: 1 });
  }

  function navegar(delta) {
    setConsulta((atual) => ({
      busca: atual.busca ?? "",
      pagina: atual.pagina + delta,
    }));
  }

  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const pagina = consulta.pagina;

  return (
    <section className="usuarios-cartao">
      <h2 className="usuarios-titulo">Usuários cadastrados</h2>
      <form
        aria-label="Pesquisar usuários"
        className="usuarios-busca"
        noValidate
        onSubmit={enviar}
      >
        <label htmlFor="busca-usuarios" className="usuarios-busca-rotulo">
          Buscar usuários
        </label>
        <input
          id="busca-usuarios"
          type="text"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
        />
        <button type="submit" className="btn-primary">
          Buscar
        </button>
      </form>

      {erro && (
        <p role="alert" className="usuarios-msg usuarios-msg-erro">
          {erro}
        </p>
      )}
      {carregando && <p className="usuarios-carregando">Carregando...</p>}

      {carregado && (
        <>
          <p className="usuarios-total">{`Total: ${total}`}</p>
          {usuarios.length === 0 ? (
            !carregando && (
              <p className="usuarios-vazio">Nenhum usuário encontrado.</p>
            )
          ) : (
            <div className="usuarios-lista">
              {usuarios.map((usuario) => (
                <CartaoUsuario key={usuario.id} usuario={usuario} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="usuarios-paginacao">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={pagina <= 1}
          onClick={() => navegar(-1)}
        >
          Anterior
        </button>
        <span>{`Página ${pagina} de ${totalPaginas}`}</span>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={pagina >= totalPaginas}
          onClick={() => navegar(1)}
        >
          Próxima
        </button>
      </div>
    </section>
  );
}
