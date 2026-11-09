import { useCallback, useState } from "react";
import CadastroLivro from "../features/livros/CadastroLivro.jsx";
import PesquisaLivros from "../features/livros/PesquisaLivros.jsx";
import "../features/livros/livros.css";

export default function AcervoPage() {
  const [versao, setVersao] = useState(0);
  const aoCadastrar = useCallback(() => setVersao((v) => v + 1), []);

  return (
    <div className="livros-pagina">
      <header className="livros-pagina-cabecalho">
        <h1>Acervo</h1>
      </header>
      <CadastroLivro onCadastrado={aoCadastrar} />
      <PesquisaLivros versao={versao} />
    </div>
  );
}
