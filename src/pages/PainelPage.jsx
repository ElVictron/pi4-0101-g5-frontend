import PainelDisponibilidade from "../features/livros/PainelDisponibilidade.jsx";
import "../features/livros/livros.css";

export default function PainelPage({ evento, reconexoes }) {
  return (
    <div className="livros-pagina">
      <header className="livros-pagina-cabecalho">
        <h1>Painel de disponibilidade</h1>
      </header>
      <PainelDisponibilidade
        evento={evento ?? null}
        reconexoes={reconexoes ?? 0}
      />
    </div>
  );
}
