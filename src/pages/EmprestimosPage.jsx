import { useCallback, useState } from "react";
import RegistrarEmprestimo from "../features/emprestimos/RegistrarEmprestimo.jsx";
import ListaEmprestimos from "../features/emprestimos/ListaEmprestimos.jsx";
import "../features/emprestimos/emprestimos.css";

export default function EmprestimosPage({ evento = null, reconexoes = 0 }) {
  const [versao, setVersao] = useState(0);
  const aoRegistrar = useCallback(() => setVersao((v) => v + 1), []);

  return (
    <div className="emprestimos-pagina">
      <header className="emprestimos-pagina-cabecalho">
        <h1>Empréstimos</h1>
      </header>
      <RegistrarEmprestimo onRegistrado={aoRegistrar} />
      <ListaEmprestimos
        evento={evento}
        reconexoes={reconexoes}
        versao={versao}
      />
    </div>
  );
}
