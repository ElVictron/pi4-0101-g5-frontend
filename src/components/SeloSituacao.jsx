import "./SeloSituacao.css";

const SITUACOES = {
  ativo: { texto: "Ativo", classe: "selo selo-ativo" },
  atrasado: { texto: "Atrasado", classe: "selo selo-atrasado" },
  devolvido: { texto: "Devolvido", classe: "selo selo-devolvido" },
};

export default function SeloSituacao({ status }) {
  const situacao =
    typeof status === "string" && Object.hasOwn(SITUACOES, status)
      ? SITUACOES[status]
      : { texto: status, classe: "selo" };
  return <span className={situacao.classe}>{situacao.texto}</span>;
}
