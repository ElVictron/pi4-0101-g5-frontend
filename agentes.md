# agentes.md — Frontend (PI IV 0101, Grupo 5)

> Instrução de trabalho para os agentes de IA que implementam o frontend. Leia tudo antes de agir. Se algo não estiver claro, pare e informe o PM; não invente.

Repositório: `ElVictron/pi4-0101-g5-frontend`. Branch: `feat/frontend-v1`. Plano e verificação inicial: [`docs/plano-frontend.md`](docs/plano-frontend.md).

---

## 1. Projeto

- **Objetivo:** telas do sistema de biblioteca (React + Vite) que falam com o Backend 1 por HTTP (CT1 a CT8) e recebem atualizações do Backend 2 por WebSocket (CT13).
- **Forma de trabalho:** spec driven. Este arquivo e os contratos mandam. O Agente de Teste escreve testes a partir deles sem ler o código. O código só entra quando passa nesses testes.
- **Entra:** cards #785 (H02.2), #787 (H03.2), #789 (H04.2), #791 (H05.2), #794 (H06.2), #797 (H07.2), #799 (H08.2), #800 (H09.2).
- **Fica fora:** backend, Compose, integração real (#795), roteiro (#802). O Backend 2 **ainda está em implementação**: o WebSocket é testado só com simulação.

## 2. Fontes da verdade (menor número vence)

1. Contratos do Backend 1: `pi4-0101-g5-backend-1/docs/contratos/` (CT1 a CT8 e `00-convencoes.md`) e CT13 no repositório do Backend 2. Cópia dos trechos usados está na seção 6.
2. Decisões e interface deste arquivo (seções 4 e 6).
3. Cards do OpenProject (seção 1 e `docs/plano-frontend.md`).
4. `docs/fluxos/` deste repositório.

---

## 3. Papéis

### 3.1 PM (orquestrador)

- Escreve este arquivo e os briefings, aciona os agentes, congela os testes (hash), roda a suíte, faz o commit e o push.
- Não escreve código de produção nem testes de contrato.

### 3.2 Agente de Teste

- **Lê:** este arquivo, os contratos e `docs/`. **Não lê** nada em `src/` exceto `src/test/setup.js`.
- **Escreve:** somente em `src/test/contrato/` (arquivos `eN-*.test.js` ou `.test.jsx`).
- Testa pela interface da seção 6: funções exportadas, props, rótulos, papéis (roles) e textos definidos aqui. Usa Testing Library (`screen.getByRole`, `getByLabelText`, `getByText`), `@testing-library/user-event` e `vi.mock` para o módulo de API.
- Cada teste começa com um comentário citando a regra: `// E2 · CadastroLivro · erro ISBN_DUPLICADO (#785, CT1)`.
- Cobre: caminho feliz, cada erro da ficha, estados vazios, carregamento, paginação, filtros e eventos de tempo real descritos na seção 6.
- Entrega os testes **vermelhos** (falham porque o código não existe ou não faz o comportamento), nunca por erro de sintaxe no próprio teste.
- Formato da entrega: arquivos criados, um item por caso coberto com a regra, e a saída do `npx vitest run src/test/contrato/<arquivo>`.

### 3.3 Agente de Implementação (frontend)

- **Lê:** este arquivo, contratos, `docs/` e os testes congelados em `src/test/contrato/` (só leitura).
- **Escreve:** código em `src/` (exceto `src/test/contrato/`) e testes unitários próprios em `src/test/unitarios/`.
- **Proibido** editar `src/test/contrato/`. Se um teste parecer errado, não altere: informe ao PM qual teste, qual regra ele contradiz e a sugestão.
- Implementa o mínimo para cumprir a seção 6. Nada fora dela.
- Antes de entregar: `npm run lint`, `npm test` e `npm run build` precisam passar.
- Formato da entrega: arquivos alterados, saída dos três comandos e disputas, se houver.

### 3.4 Agente Revisor (somente leitura)

- Não edita nada. Compara seção 6 e cards × código × testes do entregável.
- Saída: lista de achados com `bloqueia` ou `não bloqueia`, regra, arquivo e linha, e se o problema está no código, no teste ou na especificação.

---

## 4. Decisões

| #   | Decisão                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Caminhos exatamente como nos contratos, **sem prefixo `/api`**. Base: `import.meta.env.VITE_API_URL`, padrão `http://localhost:8000` (sem barra no fim).                                                                                  |
| F2  | Nomes de campo dos contratos usados **sem tradução** em todo o código (`titulo`, `quantidadeDisponivel`, `usuarioNome`…).                                                                                                                 |
| F3  | Removidos os campos que o backend não grava: categoria do livro; perfil, status, telefone e e-mail separados do usuário. Usuário tem só `nome`, `cpf`, `contato`.                                                                         |
| F4  | Nenhum dado falso: em erro, a tela mostra a mensagem e não altera a lista.                                                                                                                                                                |
| F5  | As validações ficam no Backend 1. Os formulários usam `noValidate` e sempre enviam; a tela mostra a mensagem do código devolvido.                                                                                                         |
| F6  | Mensagem por código vem do mapa `MENSAGENS_ERRO` (seção 6.2); código desconhecido usa a `mensagem` do servidor; sem ela, texto padrão.                                                                                                    |
| F7  | Situação `atrasado`: selo vermelho; data limite em vermelho; filtro em abas Todos, Ativos, Atrasados, Devolvidos; botão Devolver em ativo e atrasado.                                                                                     |
| F8  | Tamanho de página padrão: 20.                                                                                                                                                                                                             |
| F9  | WebSocket: `import.meta.env.VITE_WS_URL`, padrão `ws://localhost:8001/ws/biblioteca`. A mensagem é o objeto do CT13 em JSON, sem envelope (`{"tipo": "emprestimo_registrado", "livroId": 101, …}`). A confirmar com o grupo do Backend 2. |
| F10 | Ao reconectar o WebSocket, as telas de disponibilidade e de empréstimos buscam a lista de novo (cards #791 e #797).                                                                                                                       |
| F11 | Testes: Vitest + Testing Library + jsdom. Contrato em `src/test/contrato/`, unitários em `src/test/unitarios/`. Cobertura de `src/` (sem `src/test/` e `src/main.jsx`) ≥ 85%.                                                             |

---

## 5. Ciclo de cada entregável

```
1 PM            briefing (entregável + trechos da seção 6)
2 Agente Teste  escreve src/test/contrato/eN-*.test.* (vermelhos)
3 PM            confere, congela: find src/test/contrato -type f | sort | xargs sha256sum | sha256sum
4 Agente Impl.  implementa src/ + src/test/unitarios/
5 PM            lint, testes, build, cobertura; hash do contrato inalterado
6 Revisor       relatório
7 PM            verde e sem achado bloqueante → commit + push; senão volta ao 4 (máx. 3)
```

Um commit por entregável, mensagem `feat(<área>): <o que entrou> (EN, cards #…)`. Nunca commit com teste falhando.

---

## 6. Interface (contrato interno entre testes e código)

Só o PM altera esta seção. Caminhos relativos a `src/`.

### 6.1 `services/api.js`

```js
export const API_BASE_URL            // VITE_API_URL sem barra final, ou 'http://localhost:8000'
export class ApiError extends Error  // propriedades: codigo (string), mensagem (string), status (number)
export async function cadastrarLivro({ titulo, autor, isbn, quantidadeExemplares })  // POST /livros
export async function consultarLivros({ busca, pagina, tamanho } = {})               // GET  /livros
export async function listarDisponibilidade({ busca } = {})                          // GET  /livros/disponibilidade
export async function cadastrarUsuario({ nome, cpf, contato })                        // POST /usuarios
export async function consultarUsuarios({ busca, pagina, tamanho } = {})             // GET  /usuarios
export async function registrarEmprestimo({ usuarioId, livroId })                     // POST /emprestimos
export async function consultarEmprestimos({ status, busca } = {})                   // GET  /emprestimos
export async function registrarDevolucao(emprestimoId)                                // PATCH /emprestimos/{id}/devolucao
```

Regras:

- Usa `fetch` global (`globalThis.fetch`) no momento da chamada.
- **POST:** `method: 'POST'`, header `Content-Type: application/json`, `body` = `JSON.stringify` do objeto recebido, sem alterar valores.
- **GET:** query só com os parâmetros cujo valor não é `undefined`, `null` nem texto vazio depois de `trim`. Ordem: a da assinatura. Sem parâmetro → URL sem `?`. Valores codificados com `URLSearchParams`.
- **PATCH:** `method: 'PATCH'`, sem corpo; id no caminho com `encodeURIComponent`.
- URL = `API_BASE_URL + caminho`.
- **Sucesso** (`response.ok`): devolve `await response.json()` sem transformar.
- **Erro HTTP** (`!response.ok`):
  - corpo `{"erro": {"codigo", "mensagem"}}` → `ApiError({ codigo, mensagem, status })` (mensagem `''` se ausente) — vale só quando `erro.codigo` é texto; sem `codigo` textual, conta como "outro corpo";
  - outro corpo ou corpo ilegível → `codigo` `'ERRO_INTERNO'` se `status >= 500`, senão `'ERRO_INESPERADO'`; `mensagem` `` `Erro HTTP ${status}` ``.
- **Falha de rede** (`fetch` rejeita) → `ApiError({ codigo: 'SEM_CONEXAO', mensagem: MENSAGENS_ERRO.SEM_CONEXAO, status: 0 })`.
- **Sucesso com JSON ilegível** → `ApiError({ codigo: 'ERRO_INESPERADO', mensagem: 'Resposta inválida do servidor.', status })`.
- `new ApiError({ codigo, mensagem, status })`: `name` = `'ApiError'`, `message` = `mensagem`, instância de `Error`.

### 6.2 `services/mensagens.js`

```js
export const MENSAGENS_ERRO = {
  CAMPOS_OBRIGATORIOS: 'Preencha todos os campos obrigatórios.',
  DADOS_INVALIDOS: 'Dados inválidos. Confira os campos e tente novamente.',
  QUANTIDADE_INVALIDA: 'A quantidade de exemplares deve ser um número inteiro maior que zero.',
  ISBN_DUPLICADO: 'Já existe um livro com este ISBN.',
  CPF_DUPLICADO: 'Já existe um usuário com este CPF.',
  PAGINACAO_INVALIDA: 'Página ou tamanho de página inválido.',
  BUSCA_INVALIDA: 'O termo de busca deve ter no máximo 100 caracteres.',
  STATUS_INVALIDO: 'Situação inválida.',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado.',
  LIVRO_NAO_ENCONTRADO: 'Livro não encontrado.',
  LIVRO_INDISPONIVEL: 'Não há exemplar disponível deste livro.',
  EMPRESTIMO_NAO_ENCONTRADO: 'Empréstimo não encontrado.',
  EMPRESTIMO_JA_DEVOLVIDO: 'Este empréstimo já foi devolvido.',
  ERRO_INTERNO: 'Erro interno no servidor. Tente novamente mais tarde.',
  SEM_CONEXAO: 'Não foi possível conectar ao servidor. Verifique se o Backend 1 está em execução.',
};
export const MENSAGEM_PADRAO = 'Ocorreu um erro inesperado.';
export function mensagemDeErro(erro)
// codigo presente em MENSAGENS_ERRO → esse texto; senão erro.mensagem não vazia; senão MENSAGEM_PADRAO.
// Aceita qualquer valor (ApiError, Error comum, undefined) sem lançar exceção.
```

### 6.3 `utils/datas.js`

```js
export function formatarDataHora(valor)
// 'AAAA-MM-DDTHH:MM[:SS]' → 'DD/MM/AAAA HH:MM', lendo o texto (sem fuso, sem Date).
// null, undefined ou '' → '—'. Texto fora do formato → devolvido sem mudança.
```

### 6.4 `components/SeloSituacao.jsx`

`export default function SeloSituacao({ status })` → `<span>` com:

| status      | texto           | classes                                      |
| ----------- | --------------- | -------------------------------------------- |
| `ativo`     | `Ativo`         | `selo selo-ativo`                            |
| `atrasado`  | `Atrasado`      | `selo selo-atrasado` (fundo vermelho no CSS) |
| `devolvido` | `Devolvido`     | `selo selo-devolvido`                        |
| outro       | o próprio valor | `selo`                                       |

### 6.5 Padrões comuns das telas

- Todas as chamadas de API vêm de `services/api.js` (os testes fazem `vi.mock` desse módulo).
- **Mensagem de sucesso:** elemento com `role="status"`. **Mensagem de erro:** elemento com `role="alert"` e o texto de `mensagemDeErro(erro)`. Ambas são limpas ao enviar de novo.
- Enquanto uma lista carrega: texto `Carregando...`.
- Formulários: `noValidate`, nome acessível via `aria-label`; botão de envio desabilitado enquanto a requisição está pendente.

**Esclarecimentos do PM (09/11, após os testes do E2)** — valem para todas as telas:

- Erro ao buscar, paginar ou recarregar uma lista: mostra o `role="alert"` e **mantém a lista anterior** (F4).
- `Carregando...` é texto simples, **sem** `role="status"` (o `status` é só para mensagem de sucesso). O `role="alert"` contém só o texto da mensagem.
- Tabelas usam `<th>` nos cabeçalhos. Lista vazia: a mensagem de vazio aparece; manter ou não o cabeçalho é livre.
- O texto `Página X de Y` usa a página pedida (estado local).
- Navegar antes de qualquer busca enviada: `busca` vai como `''` (a API omite).
- Campo de busca é enviado como digitado, sem `trim` (a API omite texto só com espaços).
- Campo `Quantidade de exemplares` é `type="text"` com `inputMode="numeric"`, para que a regra de conversão da 6.6 valha para qualquer texto.
- Painel: evento de livro fora da lista com `quantidadeDisponivel` 0 não faz nada.
- Carga inicial das pesquisas: objeto exatamente `{ pagina: 1, tamanho }`, sem a chave `busca`.
- Textos como `CPF: …`, `Contato: …`, `Devolver até …`, `Devolvido em …` e `Total: N` ficam inteiros num único elemento (sem quebrar em `<strong>` + texto).
- Alert e status nunca aparecem juntos; ambos somem assim que um novo envio começa.

### 6.6 `features/livros/CadastroLivro.jsx` (#785, CT1)

`export default function CadastroLivro({ onCadastrado })`

- `<form aria-label="Cadastrar livro">` com campos rotulados `Título`, `Autor`, `ISBN`, `Quantidade de exemplares`; botão `Cadastrar`.
- Envio chama `cadastrarLivro({ titulo, autor, isbn, quantidadeExemplares })` com os textos digitados sem alteração. Quantidade: texto vazio (após `trim`) → `''`; texto que vira número finito com `Number` → esse número; senão → o texto original.
- Sucesso: `role="status"` com `Livro "${livro.titulo}" cadastrado.` (título da resposta), campos limpos, `onCadastrado(livro)` chamado com a resposta.
- Erro: `role="alert"`; campos mantidos; `onCadastrado` não é chamado.

### 6.7 `features/livros/PesquisaLivros.jsx` (#789, CT2)

`export default function PesquisaLivros({ versao = 0, tamanho = 20 })`

- `<form aria-label="Pesquisar livros">` com campo `Buscar livros` e botão `Buscar`.
- Ao montar: `consultarLivros({ pagina: 1, tamanho })`. Ao enviar: `consultarLivros({ busca, pagina: 1, tamanho })` (busca vazia vai como `''`; a API omite).
- Tabela `<table aria-label="Livros">` com colunas `Título`, `Autor`, `ISBN`, `Disponível`; uma linha por livro, com `quantidadeDisponivel` na última coluna.
- Texto `Total: ${total}`. Paginação: texto `Página ${pagina} de ${totalPaginas}` (`totalPaginas = max(1, ceil(total / tamanho))`), botões `Anterior` (desabilitado na página 1) e `Próxima` (desabilitado na última). Navegar repete a última busca enviada com `pagina ± 1`.
- Lista vazia: `Nenhum livro encontrado.` Erro: `role="alert"`.
- Quando `versao` muda (depois da montagem): repete a consulta atual (mesma busca e página).

### 6.8 `features/livros/PainelDisponibilidade.jsx` (#791, CT7, CT13)

`export default function PainelDisponibilidade({ evento = null, reconexoes = 0 })`

- Ao montar: `listarDisponibilidade()` (sem argumentos). Quando `reconexoes` muda depois da montagem: chama de novo.
- Tabela `<table aria-label="Livros disponíveis">` com colunas `Título`, `Disponíveis`, `Exemplares`.
- Quando `evento` muda e não é `null` (objeto CT13):
  - livro com `id === evento.livroId` na lista e `evento.quantidadeDisponivel > 0` → atualiza `quantidadeDisponivel` sem nova chamada;
  - livro na lista e `evento.quantidadeDisponivel === 0` → remove a linha sem nova chamada;
  - livro fora da lista e `evento.quantidadeDisponivel > 0` → chama `listarDisponibilidade()` de novo.
- Lista vazia: `Nenhum livro disponível.` Erro: `role="alert"`.

### 6.9 `features/usuarios/CadastroUsuario.jsx` (#787, CT3)

`export default function CadastroUsuario({ onCadastrado })`

- `<form aria-label="Cadastrar usuário">`, campos `Nome`, `CPF`, `Contato (e-mail ou telefone)`; botão `Cadastrar`.
- Envio: `cadastrarUsuario({ nome, cpf, contato })` com os textos digitados sem alteração.
- Sucesso: `role="status"` com `Usuário "${usuario.nome}" cadastrado.`, campos limpos, `onCadastrado(usuario)`.
- Erro: `role="alert"`; campos mantidos; `onCadastrado` não é chamado.

### 6.10 `features/usuarios/PesquisaUsuarios.jsx` (#800, CT4)

`export default function PesquisaUsuarios({ versao = 0, tamanho = 20 })`

- `<form aria-label="Pesquisar usuários">`, campo `Buscar usuários`, botão `Buscar`.
- Mesmas regras de carga inicial, busca, total, paginação, vazio (`Nenhum usuário encontrado.`), erro e `versao` da 6.7, chamando `consultarUsuarios`.
- Cada usuário: `<article aria-label={usuario.nome}>` com o nome, `CPF: ${cpf}`, `Contato: ${contato}` e a lista de empréstimos:
  - sem empréstimos: `Sem empréstimos.`
  - cada empréstimo: `livroTitulo`, `SeloSituacao` com `status` e, se `devolvidoEm` preenchido, `Devolvido em ${formatarDataHora(devolvidoEm)}`; senão `Devolver até ${formatarDataHora(dataLimiteDevolucao)}`.

### 6.11 `features/emprestimos/RegistrarEmprestimo.jsx` (#794, CT4, CT5, CT7)

`export default function RegistrarEmprestimo({ onRegistrado })`

- `<form aria-label="Registrar empréstimo">`.
- Busca de usuário: campo `Buscar usuário` e botão `Buscar usuário` (tipo `button`) → `consultarUsuarios({ busca, pagina: 1, tamanho: 20 })`. Resultados como botões de rádio com nome acessível `${nome} (CPF ${cpf})`. Nenhum resultado: `Nenhum usuário encontrado.`
- Livro: `<select>` rotulado `Livro`, carregado ao montar por `listarDisponibilidade()`. Primeira opção `Selecione um livro` (valor `''`); demais com valor = `id` e texto `${titulo} (disponíveis: ${quantidadeDisponivel})`.
- Botão `Registrar empréstimo` sempre habilitado (exceto pendente). Envio: `registrarEmprestimo({ usuarioId, livroId })` com `usuarioId` = id do usuário escolhido ou `null`, `livroId` = `Number` do valor escolhido ou `null`.
- Sucesso: `role="status"` com `Empréstimo registrado. Devolver até ${formatarDataHora(dataLimiteDevolucao)}.`; `onRegistrado(emprestimo)`; seleção de livro volta para `''`; `listarDisponibilidade()` chamado de novo.
- Erro: `role="alert"`; seleções mantidas; `onRegistrado` não é chamado.
- Esclarecimentos: o usuário escolhido continua marcado após o sucesso; falha de `listarDisponibilidade` ou de `consultarUsuarios` aparece no mesmo `role="alert"` do formulário; `Nenhum usuário encontrado.` só aparece depois de uma busca.

### 6.12 `features/emprestimos/ListaEmprestimos.jsx` (#797, #799, CT6, CT8, CT13)

`export default function ListaEmprestimos({ evento = null, reconexoes = 0, versao = 0 })`

- Abas: botões `Todos`, `Ativos`, `Atrasados`, `Devolvidos` com `aria-pressed` (`"true"` na selecionada; padrão `Todos`). Clicar chama `consultarEmprestimos({ status, busca })` com `status` `undefined`, `'ativo'`, `'atrasado'` ou `'devolvido'` e a última busca enviada.
- `<form aria-label="Pesquisar empréstimos">` com campo `Buscar empréstimos` e botão `Buscar` → `consultarEmprestimos({ status, busca })` com a aba atual.
- Ao montar: `consultarEmprestimos({})`. (Chamadas sempre com um único objeto; propriedades `undefined` são aceitas.)
- Tabela `<table aria-label="Empréstimos">`, colunas `Usuário`, `Livro`, `Emprestado em`, `Devolver até`, `Devolvido em`, `Situação`, `Ação`. Datas com `formatarDataHora`. Situação com `SeloSituacao`. Célula `Devolver até` com classe `data-atrasada` quando `status === 'atrasado'`.
- Ação: para `ativo` e `atrasado`, botão `Devolver` com `aria-label` `Devolver empréstimo ${emprestimoId}`; para `devolvido`, sem botão.
- Devolver → `registrarDevolucao(emprestimoId)`. Sucesso: a linha passa a `status: 'devolvido'` e `devolvidoEm` da resposta (sem recarregar), `role="status"` `Devolução registrada.` Erro: `role="alert"`, linha inalterada.
- Recarrega com a aba e a busca atuais quando `evento` muda e não é `null`, quando `reconexoes` muda ou quando `versao` muda (depois da montagem).
- Lista vazia: `Nenhum empréstimo encontrado.` Erro de carga: `role="alert"`.

### 6.13 `hooks/useBibliotecaTempoReal.js` (CT13, F9, F10)

```js
export const WS_URL // VITE_WS_URL ou 'ws://localhost:8001/ws/biblioteca'
export function useBibliotecaTempoReal({ url = WS_URL, WebSocketImpl, intervaloReconexaoMs = 3000 } = {})
// retorna { conectado, evento, reconexoes }
```

- `WebSocketImpl` padrão: `globalThis.WebSocket`, lido no momento de conectar.
- `onopen` → `conectado = true`; a partir da **segunda** abertura (após uma queda), `reconexoes += 1`.
- `onmessage` → `JSON.parse(data)`; evento válido: objeto com `tipo` em `emprestimo_registrado` ou `devolucao_registrada`, `livroId` inteiro e `quantidadeDisponivel` inteiro ≥ 0. Válido → `evento` recebe um **novo objeto** com os campos da mensagem. Inválido ou JSON ilegível → ignorado, sem exceção.
- `onclose` → `conectado = false` e nova tentativa após `intervaloReconexaoMs` (`setTimeout`). `onerror` → fecha o socket.
- Ao desmontar: fecha o socket, cancela a tentativa pendente e não reconecta.
- `VITE_WS_URL` vazio vale como não definido (usar `||`). Campos `status` e `atualizadaEm` do CT13 não são exigidos na validação.
- Uma página que monta de novo (troca de aba) faz a carga normal de montagem; o `evento` recebido antes da montagem não dispara recarga extra.

### 6.14 Páginas e `App.jsx`

- `pages/PainelPage.jsx` `({ evento, reconexoes })` → `<h1>Painel de disponibilidade</h1>` + `PainelDisponibilidade`.
- `pages/AcervoPage.jsx` `()` → `<h1>Acervo</h1>` + `CadastroLivro` + `PesquisaLivros`; `onCadastrado` incrementa a `versao` da pesquisa.
- `pages/UsuariosPage.jsx` `()` → `<h1>Usuários</h1>` + `CadastroUsuario` + `PesquisaUsuarios`; idem.
- `pages/EmprestimosPage.jsx` `({ evento, reconexoes })` → `<h1>Empréstimos</h1>` + `RegistrarEmprestimo` + `ListaEmprestimos`; `onRegistrado` incrementa a `versao` da lista.
- `App.jsx` (default export): usa `useBibliotecaTempoReal()`; navegação `<nav aria-label="Principal">` com botões `Painel`, `Acervo`, `Usuários`, `Empréstimos` (`aria-current="page"` no ativo; inicial `Painel`); indicador `role="status"` com `Tempo real: conectado` ou `Tempo real: desconectado`; passa `evento` e `reconexoes` ao Painel e a Empréstimos.
- Código antigo (`Dashboard`, `BooksPage`, `UsersPage`, `LoansPage`, `StatCard`, `useWebSocket`, mocks de `App.jsx`) é removido.

---

### 6.15 Esclarecimentos do E6 (achados dos Revisores)

1. **Mensagens:** em cada componente, `role="status"` e `role="alert"` somem assim que uma nova requisição **iniciada pelo usuário** começa (busca, troca de aba, paginação, envio, devolução). Recargas automáticas (evento CT13, reconexão, `versao`, recarga de livros após o registro) não apagam a mensagem de sucesso; se falharem, mostram o `role="alert"`.
2. **Antes da primeira resposta com sucesso** de uma pesquisa paginada (`PesquisaLivros`, `PesquisaUsuarios`), os textos `Total: …` e `Página … de …` e os botões `Anterior`/`Próxima` não aparecem. Depois do primeiro sucesso, valem as regras da 6.7.
3. **Respostas fora de ordem:** se uma consulta mais nova já foi pedida, a resposta (ou o erro) da anterior é ignorada em todas as listas.
4. **RegistrarEmprestimo:** Enter no campo `Buscar usuário` faz a busca de usuário (não registra). Uma nova busca que não traz o usuário escolhido desmarca a escolha (`usuarioId` volta a `null`).
5. **Tempo real:** se `new WebSocketImpl(url)` lançar exceção, `conectado` fica `false` e uma nova tentativa é agendada após `intervaloReconexaoMs` (sem quebrar a tela). Em `StrictMode`, depois de montar, desmontar e montar de novo, só um socket fica aberto.
6. **Botões de pesquisa** (`Buscar`, `Buscar usuário`, paginação e abas) não precisam ficar desabilitados durante a carga.

## 7. Entregáveis

| Código | Escopo                                    | Cards                   |
| ------ | ----------------------------------------- | ----------------------- |
| E1     | 6.1 a 6.4                                 | base de todos           |
| E2     | 6.6 a 6.8, `AcervoPage`, `PainelPage`     | #785, #789, #791        |
| E3     | 6.9, 6.10, `UsuariosPage`                 | #787, #800              |
| E4     | 6.11, 6.12, `EmprestimosPage`             | #794, #797, #799        |
| E5     | 6.13, `App.jsx`, remoção do código antigo | #791, #797 (tempo real) |
| E6     | README, verificação final                 | —                       |

## 8. Estado

| Item                                         | Situação                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E0 base técnica                              | concluído (`6bd0b24`)                                                                                                                                        |
| E1 a E5                                      | concluídos (`4903944`, `9628b24`, `54cf179`, `b4036a0`, `4dc42a7`)                                                                                           |
| E6                                           | concluído (reforço da 6.15, README, ajustes de layout)                                                                                                       |
| Integração real                              | pendente: depende do Backend 2 (CT13)                                                                                                                        |
| Lacunas de teste anotadas pelo Revisor do E6 | contrato para recarga automática mantendo o status (6.15.1) e respostas fora de ordem em RegistrarEmprestimo/Painel (6.15.3); hoje cobertos só por unitários |
