import { useEffect, useId, useState } from "react";
import { consultarLivros } from "../../services/api.js";
import { mensagemDeErro } from "../../services/mensagens.js";
import "./livros.css";

// Pedido atual: busca enviada (undefined antes de qualquer envio) e página.
// Cada envio/navegação cria um objeto novo, o que dispara a consulta.
const PEDIDO_INICIAL = { busca: undefined, pagina: 1 };

export default function PesquisaLivros({ versao = 0, tamanho = 20 }) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const [pedido, setPedido] = useState(PEDIDO_INICIAL);
  const [livros, setLivros] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [carregou, setCarregou] = useState(false);
  const [erro, setErro] = useState("");

  // Consulta ao montar, a cada novo pedido e quando `versao` muda.
  // Respostas de consultas substituídas são ignoradas (fora de ordem).
  useEffect(() => {
    let ignorar = false;
    const { busca, pagina } = pedido;
    const parametros =
      busca === undefined ? { pagina, tamanho } : { busca, pagina, tamanho };
    setCarregando(true);
    setErro("");
    consultarLivros(parametros)
      .then((resposta) => {
        if (ignorar) return;
        setLivros(Array.isArray(resposta?.livros) ? resposta.livros : []);
        setTotal(Number(resposta?.total) || 0);
        setCarregou(true);
      })
      .catch((falha) => {
        if (ignorar) return;
        // F4: em erro a lista anterior é mantida.
        setErro(mensagemDeErro(falha));
      })
      .finally(() => {
        if (!ignorar) setCarregando(false);
      });
    return () => {
      ignorar = true;
    };
  }, [pedido, versao, tamanho]);

  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const { pagina } = pedido;

  function enviar(evento) {
    evento.preventDefault();
    setPedido({ busca: texto, pagina: 1 });
  }

  function navegar(delta) {
    setPedido((atual) => ({
      busca: atual.busca ?? "",
      pagina: atual.pagina + delta,
    }));
  }

  return (
    <section className="livros-cartao">
      <h2 className="livros-cartao-titulo">Pesquisar livros</h2>
      <form
        aria-label="Pesquisar livros"
        noValidate
        onSubmit={enviar}
        className="livros-busca"
      >
        <div className="livros-campo livros-campo-largo">
          <label htmlFor={`${id}-busca`}>Buscar livros</label>
          <input
            id={`${id}-busca`}
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
        </div>
        <button type="submit" className="livros-botao">
          Buscar
        </button>
      </form>

      {erro && (
        <p role="alert" className="livros-mensagem livros-mensagem-erro">
          {erro}
        </p>
      )}
      {carregando && <p className="livros-carregando">Carregando...</p>}

      <div className="livros-tabela-envoltorio">
        <table aria-label="Livros" className="livros-tabela">
          <thead>
            <tr>
              <th scope="col">Título</th>
              <th scope="col">Autor</th>
              <th scope="col">ISBN</th>
              <th scope="col" className="livros-numero">
                Disponível
              </th>
            </tr>
          </thead>
          <tbody>
            {livros.map((livro) => (
              <tr key={livro.id}>
                <td>{livro.titulo}</td>
                <td>{livro.autor}</td>
                <td>{livro.isbn}</td>
                <td className="livros-numero">{livro.quantidadeDisponivel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {carregou && !carregando && livros.length === 0 && (
        <p className="livros-vazio">Nenhum livro encontrado.</p>
      )}

      <div className="livros-rodape">
        <span>{`Total: ${total}`}</span>
        <div className="livros-paginacao">
          <button
            type="button"
            className="livros-botao-secundario"
            disabled={pagina <= 1}
            onClick={() => navegar(-1)}
          >
            Anterior
          </button>
          <span>{`Página ${pagina} de ${totalPaginas}`}</span>
          <button
            type="button"
            className="livros-botao-secundario"
            disabled={pagina >= totalPaginas}
            onClick={() => navegar(1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </section>
  );
}
