import { useEffect, useRef, useState } from "react";
import { listarDisponibilidade } from "../../services/api.js";
import { mensagemDeErro } from "../../services/mensagens.js";
import "./livros.css";

export default function PainelDisponibilidade({
  evento = null,
  reconexoes = 0,
}) {
  const [livros, setLivros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregou, setCarregou] = useState(false);
  const [erro, setErro] = useState("");
  // Incrementado quando um evento cita livro fora da lista (força nova carga).
  const [recarga, setRecarga] = useState(0);

  const livrosRef = useRef(livros);
  livrosRef.current = livros;
  const eventoAnterior = useRef(evento);
  // F12: `atualizadaEm` da última mensagem aplicada, por livro. Um reenvio do
  // Backend 1 pode trazer um evento antigo depois de um novo; esse é ignorado.
  const ultimaAtualizacao = useRef(new Map());

  // Carga ao montar, quando `reconexoes` muda (F10) e quando `recarga` muda.
  useEffect(() => {
    let ignorar = false;
    setCarregando(true);
    setErro("");
    listarDisponibilidade()
      .then((resposta) => {
        if (ignorar) return;
        setLivros(Array.isArray(resposta?.livros) ? resposta.livros : []);
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
  }, [reconexoes, recarga]);

  // Eventos CT13: aplica sem nova chamada quando o livro está na lista.
  useEffect(() => {
    if (evento === eventoAnterior.current) return;
    eventoAnterior.current = evento;
    if (evento === null || typeof evento !== "object") return;

    const { livroId, quantidadeDisponivel, atualizadaEm } = evento;
    if (typeof atualizadaEm === "string") {
      const anterior = ultimaAtualizacao.current.get(livroId);
      if (anterior !== undefined && atualizadaEm < anterior) return;
      ultimaAtualizacao.current.set(livroId, atualizadaEm);
    }
    const naLista = livrosRef.current.some((livro) => livro.id === livroId);
    if (naLista) {
      setLivros((atual) =>
        quantidadeDisponivel > 0
          ? atual.map((livro) =>
              livro.id === livroId ? { ...livro, quantidadeDisponivel } : livro,
            )
          : atual.filter((livro) => livro.id !== livroId),
      );
    } else if (quantidadeDisponivel > 0) {
      setRecarga((n) => n + 1);
    }
  }, [evento]);

  return (
    <section className="livros-cartao">
      {erro && (
        <p role="alert" className="livros-mensagem livros-mensagem-erro">
          {erro}
        </p>
      )}
      {carregando && <p className="livros-carregando">Carregando...</p>}

      <div className="livros-tabela-envoltorio">
        <table aria-label="Livros disponíveis" className="livros-tabela">
          <thead>
            <tr>
              <th scope="col">Título</th>
              <th scope="col" className="livros-numero">
                Disponíveis
              </th>
              <th scope="col" className="livros-numero">
                Exemplares
              </th>
            </tr>
          </thead>
          <tbody>
            {livros.map((livro) => (
              <tr key={livro.id}>
                <td>{livro.titulo}</td>
                <td className="livros-numero">{livro.quantidadeDisponivel}</td>
                <td className="livros-numero">{livro.quantidadeExemplares}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {carregou && !carregando && livros.length === 0 && (
        <p className="livros-vazio">Nenhum livro disponível.</p>
      )}
    </section>
  );
}
