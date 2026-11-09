import { useState } from "react";
import { cadastrarUsuario } from "../../services/api.js";
import { mensagemDeErro } from "../../services/mensagens.js";
import "./usuarios.css";

const VAZIO = { nome: "", cpf: "", contato: "" };

export default function CadastroUsuario({ onCadastrado }) {
  const [campos, setCampos] = useState(VAZIO);
  const [pendente, setPendente] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  function alterar(evento) {
    const { name, value } = evento.target;
    setCampos((atuais) => ({ ...atuais, [name]: value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setSucesso("");
    setErro("");
    setPendente(true);
    try {
      const usuario = await cadastrarUsuario({
        nome: campos.nome,
        cpf: campos.cpf,
        contato: campos.contato,
      });
      setSucesso(`Usuário "${usuario.nome}" cadastrado.`);
      setCampos(VAZIO);
      if (onCadastrado) onCadastrado(usuario);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setPendente(false);
    }
  }

  return (
    <section className="usuarios-cartao">
      <h2 className="usuarios-titulo">Novo usuário</h2>
      <form
        aria-label="Cadastrar usuário"
        className="usuarios-form"
        noValidate
        onSubmit={enviar}
      >
        <div className="usuarios-campo">
          <label htmlFor="usuario-nome">Nome</label>
          <input
            id="usuario-nome"
            name="nome"
            type="text"
            value={campos.nome}
            onChange={alterar}
          />
        </div>
        <div className="usuarios-campo">
          <label htmlFor="usuario-cpf">CPF</label>
          <input
            id="usuario-cpf"
            name="cpf"
            type="text"
            value={campos.cpf}
            onChange={alterar}
          />
        </div>
        <div className="usuarios-campo usuarios-campo-largo">
          <label htmlFor="usuario-contato">Contato (e-mail ou telefone)</label>
          <input
            id="usuario-contato"
            name="contato"
            type="text"
            value={campos.contato}
            onChange={alterar}
          />
        </div>
        <div className="usuarios-acoes">
          <button type="submit" className="btn-primary" disabled={pendente}>
            Cadastrar
          </button>
        </div>
      </form>
      {sucesso && (
        <p role="status" className="usuarios-msg usuarios-msg-sucesso">
          {sucesso}
        </p>
      )}
      {erro && (
        <p role="alert" className="usuarios-msg usuarios-msg-erro">
          {erro}
        </p>
      )}
    </section>
  );
}
