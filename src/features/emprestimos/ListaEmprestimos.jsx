import { useEffect, useId, useState } from "react";
import {
  consultarEmprestimos,
  registrarDevolucao,
} from "../../services/api.js";
import { mensagemDeErro } from "../../services/mensagens.js";
import { formatarDataHora } from "../../utils/datas.js";
import SeloSituacao from "../../components/SeloSituacao.jsx";
import "./emprestimos.css";

const ABAS = [
  { rotulo: "Todos", status: undefined },
  { rotulo: "Ativos", status: "ativo" },
  { rotulo: "Atrasados", status: "atrasado" },
  { rotulo: "Devolvidos", status: "devolvido" },
];

// Pedido atual: aba (status) e última busca enviada (undefined antes do
// primeiro envio). Cada clique em aba ou envio cria um objeto novo.
const PEDIDO_INICIAL = { status: undefined, busca: undefined };

function parametrosDe({ status, busca }) {
  const parametros = {};
  if (status !== undefined) parametros.status = status;
  if (busca !== undefined) parametros.busca = busca;
  return parametros;
}

export default function ListaEmprestimos({
  evento = null,
  reconexoes = 0,
  versao = 0,
}) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const [pedido, setPedido] = useState(PEDIDO_INICIAL);
  const [recarga, setRecarga] = useState(0);
  const [vistos, setVistos] = useState({ evento, reconexoes, versao });
  const [emprestimos, setEmprestimos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregou, setCarregou] = useState(false);
  const [devolvendo, setDevolvendo] = useState(null);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  // Recarga quando as props mudam depois da montagem (evento não nulo,
  // reconexoes ou versao). Ajuste de estado durante o render: não dispara
  // na montagem nem em dobro no StrictMode.
  if (
    vistos.evento !== evento ||
    vistos.reconexoes !== reconexoes ||
    vistos.versao !== versao
  ) {
    const recarregar =
      (evento !== vistos.evento && evento !== null) ||
      reconexoes !== vistos.reconexoes ||
      versao !== vistos.versao;
    setVistos({ evento, reconexoes, versao });
    if (recarregar) setRecarga((valor) => valor + 1);
  }

  // Consulta ao montar, a cada novo pedido e a cada recarga.
  // Respostas de consultas substituídas são ignoradas.
  useEffect(() => {
    let ignorar = false;
    setCarregando(true);
    // Recargas automáticas (evento, reconexoes, versao) não apagam o status
    // (6.15.1); só o alert antigo some no início.
    setErro("");
    consultarEmprestimos(parametrosDe(pedido))
      .then((resposta) => {
        if (ignorar) return;
        setEmprestimos(
          Array.isArray(resposta?.emprestimos) ? resposta.emprestimos : [],
        );
        setCarregou(true);
      })
      .catch((falha) => {
        if (ignorar) return;
        // F4: em erro a lista anterior é mantida. Alert e status nunca juntos.
        setSucesso("");
        setErro(mensagemDeErro(falha));
      })
      .finally(() => {
        if (!ignorar) setCarregando(false);
      });
    return () => {
      ignorar = true;
    };
  }, [pedido, recarga]);

  // 6.15.1: ações do usuário apagam status e alert assim que começam.
  function limparMensagens() {
    setSucesso("");
    setErro("");
  }

  function escolherAba(status) {
    limparMensagens();
    setPedido((atual) => ({ status, busca: atual.busca }));
  }

  function enviar(e) {
    e.preventDefault();
    limparMensagens();
    setPedido((atual) => ({ status: atual.status, busca: texto }));
  }

  async function devolver(emprestimoId) {
    setSucesso("");
    setErro("");
    setDevolvendo(emprestimoId);
    try {
      const resposta = await registrarDevolucao(emprestimoId);
      setEmprestimos((atual) =>
        atual.map((item) =>
          item.emprestimoId === emprestimoId
            ? {
                ...item,
                status: "devolvido",
                devolvidoEm: resposta?.devolvidoEm,
              }
            : item,
        ),
      );
      setSucesso("Devolução registrada.");
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setDevolvendo(null);
    }
  }

  return (
    <section className="emprestimos-cartao">
      <h2 className="emprestimos-cartao-titulo">Empréstimos registrados</h2>

      <div className="emprestimos-abas" role="group" aria-label="Situação">
        {ABAS.map((aba) => {
          const selecionada = aba.status === pedido.status;
          return (
            <button
              key={aba.rotulo}
              type="button"
              aria-pressed={selecionada ? "true" : "false"}
              className={
                selecionada
                  ? "emprestimos-aba emprestimos-aba-ativa"
                  : "emprestimos-aba"
              }
              onClick={() => escolherAba(aba.status)}
            >
              {aba.rotulo}
            </button>
          );
        })}
      </div>

      <form
        aria-label="Pesquisar empréstimos"
        noValidate
        onSubmit={enviar}
        className="emprestimos-linha"
      >
        <div className="emprestimos-campo emprestimos-campo-largo">
          <label htmlFor={`${id}-busca`}>Buscar empréstimos</label>
          <input
            id={`${id}-busca`}
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <button type="submit" className="emprestimos-botao">
          Buscar
        </button>
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
      {carregando && <p className="emprestimos-carregando">Carregando...</p>}

      <div className="emprestimos-tabela-envoltorio">
        <table aria-label="Empréstimos" className="emprestimos-tabela">
          <thead>
            <tr>
              <th scope="col">Usuário</th>
              <th scope="col">Livro</th>
              <th scope="col">Emprestado em</th>
              <th scope="col">Devolver até</th>
              <th scope="col">Devolvido em</th>
              <th scope="col">Situação</th>
              <th scope="col">Ação</th>
            </tr>
          </thead>
          <tbody>
            {emprestimos.map((item) => {
              const podeDevolver =
                item.status === "ativo" || item.status === "atrasado";
              return (
                <tr key={item.emprestimoId}>
                  <td>{item.usuarioNome}</td>
                  <td>{item.livroTitulo}</td>
                  <td>{formatarDataHora(item.emprestadoEm)}</td>
                  <td
                    className={
                      item.status === "atrasado" ? "data-atrasada" : undefined
                    }
                  >
                    {formatarDataHora(item.dataLimiteDevolucao)}
                  </td>
                  <td>{formatarDataHora(item.devolvidoEm)}</td>
                  <td>
                    <SeloSituacao status={item.status} />
                  </td>
                  <td>
                    {podeDevolver && (
                      <button
                        type="button"
                        className="emprestimos-botao-devolver"
                        aria-label={`Devolver empréstimo ${item.emprestimoId}`}
                        disabled={devolvendo === item.emprestimoId}
                        onClick={() => devolver(item.emprestimoId)}
                      >
                        Devolver
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {carregou && !carregando && emprestimos.length === 0 && (
        <p className="emprestimos-vazio">Nenhum empréstimo encontrado.</p>
      )}
    </section>
  );
}
