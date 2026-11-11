import { useState } from "react";
import { useBibliotecaTempoReal } from "./hooks/useBibliotecaTempoReal.js";
import PainelPage from "./pages/PainelPage.jsx";
import AcervoPage from "./pages/AcervoPage.jsx";
import UsuariosPage from "./pages/UsuariosPage.jsx";
import EmprestimosPage from "./pages/EmprestimosPage.jsx";
import "./App.css";

const PAGINAS = [
  { id: "painel", rotulo: "Painel" },
  { id: "acervo", rotulo: "Acervo" },
  { id: "usuarios", rotulo: "Usuários" },
  { id: "emprestimos", rotulo: "Empréstimos" },
];

export default function App() {
  const [pagina, setPagina] = useState("painel");
  const { conectado, evento, reconexoes } = useBibliotecaTempoReal();

  let conteudo;
  if (pagina === "acervo") {
    conteudo = <AcervoPage />;
  } else if (pagina === "usuarios") {
    conteudo = <UsuariosPage />;
  } else if (pagina === "emprestimos") {
    conteudo = <EmprestimosPage evento={evento} reconexoes={reconexoes} />;
  } else {
    conteudo = <PainelPage evento={evento} reconexoes={reconexoes} />;
  }

  return (
    <div className="app">
      <aside className="app-lateral">
        <div className="app-marca" aria-hidden="true">
          <span className="app-marca-icone">B</span>
        </div>
        <nav aria-label="Principal" className="app-nav">
          {PAGINAS.map(({ id, rotulo }) => {
            const ativa = id === pagina;
            return (
              <button
                key={id}
                type="button"
                className={ativa ? "app-nav-item ativo" : "app-nav-item"}
                aria-current={ativa ? "page" : undefined}
                onClick={() => setPagina(id)}
              >
                {rotulo}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="app-corpo">
        <header className="app-cabecalho">
          <p className="app-titulo">Biblioteca</p>
          <div
            role="status"
            className={
              conectado
                ? "app-tempo-real conectado"
                : "app-tempo-real desconectado"
            }
          >
            <span className="app-tempo-real-ponto" aria-hidden="true" />
            {conectado ? "Tempo real: conectado" : "Tempo real: desconectado"}
          </div>
        </header>
        <main className="app-principal">{conteudo}</main>
      </div>
    </div>
  );
}
