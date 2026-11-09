import { useCallback, useState } from "react";
import CadastroUsuario from "../features/usuarios/CadastroUsuario.jsx";
import PesquisaUsuarios from "../features/usuarios/PesquisaUsuarios.jsx";

export default function UsuariosPage() {
  const [versao, setVersao] = useState(0);
  const aoCadastrar = useCallback(() => setVersao((atual) => atual + 1), []);

  return (
    <div className="usuarios-pagina">
      <h1>Usuários</h1>
      <CadastroUsuario onCadastrado={aoCadastrar} />
      <PesquisaUsuarios versao={versao} />
    </div>
  );
}
