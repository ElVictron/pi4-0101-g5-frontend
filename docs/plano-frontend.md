# Plano: verificação do frontend contra os cards do OpenProject

Projeto Integrador IV (PI IV 0101 — Grupo 5). Repositório: `ElVictron/pi4-0101-g5-frontend`.
Branch de trabalho: `feat/frontend-v1`, criada a partir da `main` (commit local `29548db`, **ainda não enviado**).
Data da análise: 09/11/2026.

---

## 1. O que foi feito até aqui

- Criada a branch `feat/frontend-v1` a partir da `main` (`af0abaa`).
- Copiado o código do `pi4-0101-g5-frontend-v1.zip` para a branch: `src/`, `package.json`, `package-lock.json`, `index.html`, `Dockerfile`, `nginx.conf`, `.dockerignore`, `.env.example`, `.gitignore` e `.husky/pre-commit`.
- **Não versionados:** `.env` (segredo de desenvolvimento, ignorado pelo `.gitignore`), `node_modules` e `dist`.
- **`docs/` não foi copiado.** A `main` já tem a versão mais nova de `docs/fluxos/E6-registro-de-devolucao.md`, que inclui a regra de devolução de atrasados (PR nº 1). O zip tem a versão antiga.
- Instalação das dependências: `npm ci` **falha** (ver 3.3). Com `--legacy-peer-deps`, o build passa (`vite build` gera `dist/`).

---

## 2. Cards do frontend (OpenProject)

Oito cards, todos em estado **New**, sem responsável. Os textos abaixo são os de "O que precisa existir". Os campos "Contratos" e "Semana" dos oito cards foram conferidos no OpenProject em 09/11/2026.

| Card       | Tela                                                                                                                                                                                               | Contratos     | Semana |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| #785 H02.2 | Cadastro de livro (título, autor, ISBN, quantidade; mostra na lista; mensagem de cada erro)                                                                                                        | CT1           | S1     |
| #787 H03.2 | Cadastro de usuário (mostra na lista; mensagem de cada erro)                                                                                                                                       | CT3           | S2     |
| #789 H04.2 | Pesquisa de livros (título, autor, ISBN, quantidade disponível)                                                                                                                                    | CT2           | S2     |
| #791 H05.2 | Painel de disponibilidade (só livros emprestáveis; muda ao receber `bibliotecaAtualizada`, sem recarregar; se o WebSocket cair, reconecta e busca de novo pela `listarDisponibilidade`)            | CT7, CT13     | S2     |
| #794 H06.2 | Tela de empréstimo (busca usuário pela `consultarUsuarios`; escolhe livro da `listarDisponibilidade`; mostra data limite e mensagem de cada erro)                                                  | CT4, CT5, CT7 | S3     |
| #797 H07.2 | Tela de empréstimos (filtro por situação; usuário, livro, datas, situação; atualiza ao receber `bibliotecaAtualizada`; se o WebSocket cair, reconecta e busca de novo pela `consultarEmprestimos`) | CT8, CT13     | S3     |
| #799 H08.2 | Botão devolver em empréstimo ativo ou atrasado (mostra devolvido; mensagem de cada erro)                                                                                                           | CT6           | S3     |
| #800 H09.2 | Pesquisa de usuários com dados e lista de empréstimos de cada um, com a situação                                                                                                                   | CT4           | S4     |

Fora do escopo deste plano: #795 (integração), #802 (roteiro de demonstração) e os cards de backend.

---

## 3. Resultado da verificação

### 3.1 Resumo por card

| Card | Situação       | Principais divergências                                                                                                                                                                                                                                                              |
| ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #785 | **Parcial**    | Campos enviados com nomes errados (`totalCopies`, sem `quantidadeExemplares`); não há mensagem por código de erro; em qualquer falha o app cria um livro **falso** na tela (`handleAddBook`); campo `categoria` não existe no CT1.                                                   |
| #787 | **Parcial**    | O formulário usa `name`, `doc`, `email`, `phone` e `role`; o CT3 pede `nome`, `cpf` e um só campo `contato`. Sem mensagem por código de erro; fallback falso igual ao de livro; colunas "Perfil" e "Status" não existem no contrato.                                                 |
| #789 | **Não atende** | Busca só filtra a lista já carregada no navegador (`BooksPage.jsx`); não chama CT2; sem paginação; sem quantidade em formato da API (`quantidadeDisponivel`).                                                                                                                        |
| #791 | **Não atende** | Não há painel de disponibilidade. Não existe chamada a CT7. A atualização usa nomes de evento que não existem no CT13.                                                                                                                                                               |
| #794 | **Não atende** | Não há busca de usuário por CT4. Lista de livros vem do estado local, não de CT7. Sem mensagens de erro de CT5. Fallback falso com prazo de **14 dias** (contrato: 15).                                                                                                              |
| #797 | **Não atende** | Não há filtro por situação. Comparação de status usa `'Ativo'`, `'Devolvido'` (contrato: `ativo`, `devolvido`, `atrasado`). Atualização por evento não bate com CT13.                                                                                                                |
| #799 | **Parcial**    | Botão existe e aparece para não devolvidos (ok). Chamada usa `POST /loans/{id}/return`; contrato é `PATCH /emprestimos/{id}/devolucao`. Em erro, o app marca o empréstimo como devolvido **localmente** (`handleReturnLoan`), o que contradiz a regra de mostrar a mensagem de erro. |
| #800 | **Não atende** | Não há tela de pesquisa de usuários com lista de empréstimos. A tela de usuários não mostra empréstimos.                                                                                                                                                                             |

### 3.2 Problemas transversais (valem para todos os cards)

1. **Caminhos e prefixo da API.** `src/services/api.js` usa `/books`, `/users`, `/loans` e `VITE_API_URL=…/api`. Os contratos usam `/livros`, `/usuarios`, `/emprestimos`, `/livros/disponibilidade` e não têm prefixo `/api`. Ex.: `POST /emprestimos` (CT5), `PATCH /emprestimos/{id}/devolucao` (CT6).
2. **Nomes de campo.** O frontend usa `totalCopies`, `availableCopies`, `name`, `doc`, `phone`, `role`, `bookTitle`, `userName`, `loanDate`, `returnDueDate`. Os contratos usam `titulo`, `autor`, `isbn`, `quantidadeExemplares`, `quantidadeDisponivel`, `nome`, `cpf`, `contato`, `usuarioId`, `livroId`, `emprestimoId`, `emprestadoEm`, `dataLimiteDevolucao`, `devolvidoEm`.
3. **Formato de erro.** `api.js` lê `errorData.message`. O contrato (00-convencoes §3) é `{"erro": {"codigo", "mensagem"}}`. Por isso nenhuma tela consegue mostrar a mensagem certa.
4. **Fallback falso.** Em `App.jsx`, todo `catch` cria dado local (livro, usuário, empréstimo) como se a operação tivesse dado certo. Isso contraria as fichas, que pedem a mensagem do erro. É a divergência mais grave.
5. **Valores de status.** O frontend compara `'Ativo'`, `'Devolvido'`, `'Atrasado'` (com maiúscula). O contrato usa minúsculo: `ativo`, `devolvido`, `atrasado`.
6. **Tempo real (CT13).** `useWebSocket.js` usa `ws://localhost:8001/ws` e espera eventos `BOOK_ADDED`, `LOAN_CREATED` etc. O CT13 usa canal `wss://.../ws/biblioteca` e mensagem `bibliotecaAtualizada`, com `tipo` (`emprestimo_registrado` ou `devolucao_registrada`), `livroId`, `emprestimoId`, `status`, `quantidadeDisponivel`, `atualizadaEm`. Nenhum evento do código bate com isso.
7. **Busca e paginação.** CT2 e CT4 pedem `busca`, `pagina` e `tamanho` no servidor. O código filtra no navegador e não pagina.
8. **Data limite.** Contrato: 15 dias (`dataLimiteDevolucao = emprestadoEm + 15`). O fallback usa 14 dias.
9. **Validações.** Não há validação de campos além do `required` do HTML. A ficha pede validação dos erros `CAMPOS_OBRIGATORIOS`, `DADOS_INVALIDOS`, `QUANTIDADE_INVALIDA` e assim por diante, com a mensagem visível.

### 3.3 Build, lint e testes

| Item                 | Situação                                                                                                  | Consequência                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm ci`             | **Falha**: `vite@^8.3.7` não é compatível com o peer de `@vitejs/plugin-react@4.7.0` (aceita vite até 7). | Quebra o `Dockerfile` (que roda `npm ci`). Com `--legacy-peer-deps`, o build passa. |
| `npm run build`      | Passa com `--legacy-peer-deps`.                                                                           | —                                                                                   |
| `npm run lint`       | **Quebrado**: não há `eslint.config.*` (ESLint 8 espera `.eslintrc`, e não existe nenhum).                | Lint não roda.                                                                      |
| Configuração do Vite | Não existe `vite.config.js`.                                                                              | Funciona sem config, mas sem o plugin React.                                        |
| Testes automatizados | **Não existem** e não há runner (sem Vitest, Jest ou Testing Library).                                    | Nada para rodar hoje.                                                               |
| Dockerfile           | `node:20-alpine` e `npm ci`.                                                                              | Vai falhar pelo peer de vite (ver acima).                                           |

---

## 4. Plano de implementação (proposto, após suas respostas)

Seguir a metodologia dos 3 agentes (PM, Teste, Backend/Implementação, Revisor), como no Backend 1. Como o frontend não tem testes, o agente de Teste escreve **testes unitários** de componentes e do cliente de API a partir dos contratos e das fichas, sem ler o código de `src/` antes de escrever.

### E0 — Base técnica (sem mudança de comportamento)

- Corrigir `package.json` (vite compatível com `@vitejs/plugin-react`), gerar `package-lock.json`.
- Criar `vite.config.js` e configuração do ESLint.
- Adicionar Vitest, Testing Library e jsdom. Script `npm test`.
- Corrigir o Dockerfile para não depender de `--legacy-peer-deps`.
- Critério: `npm ci`, `npm run lint`, `npm test` e `npm run build` rodam do zero.

### E1 — Cliente de API e modelo de dados (CT1 a CT8)

- `src/services/api.js` com os caminhos dos contratos, sem prefixo `/api` (ou com o prefixo que você confirmar).
- Conversão entre nomes de campo do contrato e do modelo interno, em um único lugar.
- Leitura de `{"erro": {"codigo", "mensagem"}}` e exposição do `codigo` para a tela.
- **Remover todo fallback falso** de `App.jsx`.
- Testes unitários: cada caminho, cada erro, conversão de campo, status HTTP.

### E2 — Acervo: cadastro (#785), pesquisa (#789) e disponibilidade (#791)

- Formulário com `titulo`, `autor`, `isbn`, `quantidadeExemplares`; mensagem por código de erro (CT1).
- Pesquisa por `busca` no servidor, com paginação (`pagina`, `tamanho`) (CT2).
- Painel com `GET /livros/disponibilidade` (CT7); atualização ao receber `bibliotecaAtualizada`.
- Testes unitários: formulário, mensagem de cada erro, lista, paginação, filtro de disponibilidade.

### E3 — Usuários: cadastro (#787) e pesquisa com empréstimos (#800)

- Formulário com `nome`, `cpf`, `contato` (CT3); mensagem por código de erro.
- Pesquisa por `busca` (CT4) com paginação e lista de empréstimos de cada usuário com a situação.
- Testes unitários.

### E4 — Empréstimos: registro (#794), consulta (#797) e devolução (#799)

- Tela de empréstimo: busca de usuário (CT4), escolha de livro disponível (CT7), `POST /emprestimos` (CT5), mostra `dataLimiteDevolucao` e mensagem por erro.
- Tela de empréstimos com filtro por `status` (`ativo`, `devolvido`, `atrasado`) e `busca` (CT8).
- Botão de devolver para `ativo` e `atrasado`: `PATCH /emprestimos/{id}/devolucao` (CT6). Em erro, mostra a mensagem e **não** altera o estado local.
- Atualização ao receber `bibliotecaAtualizada` (CT13).
- Testes unitários.

### E5 — Tempo real (CT13)

- Hook com `wss://…/ws/biblioteca` (URL configurável), tipo `bibliotecaAtualizada`, reconexão com nova consulta (CT13 erros).
- Testes unitários com WebSocket simulado.

### E6 — Documentação e entrega

- README do frontend (como subir, variáveis, como testar).
- Commit por entregável; push e merge request só quando você pedir.

**Testes de integração** (com Backend 1 e Backend 2 de pé) ficam para depois, conforme você pediu. O Backend 2 ainda não está implementado (card #782), então a integração de tempo real depende dele.

**Fora deste plano:** ajustes no backend, Compose, roteiro de demonstração.

---

## 5. Decisões aprovadas (09/11/2026)

1. Caminhos da API **sem prefixo `/api`**, exatamente como nos contratos.
2. Campos fora dos contratos e dos cards **removidos** da interface (ver resposta de 09/11 na conversa): `categoria`, `perfil`, `status` do usuário, `telefone` e `email` separados. Nenhum deles é gravado pelo backend hoje.
3. Remover todos os fallbacks que criam dados falsos.
4. Testes: Vitest + Testing Library + jsdom, script `npm test`.
5. Dependências: fixar `vite` em 7.x compatível com `@vitejs/plugin-react` 4.x.
6. Lint: ESLint 8 com configuração `.eslintrc`.
7. WebSocket: URL configurável; caminho conforme CT13 (`/ws/biblioteca`).
8. Cards conferidos (ver tabela da seção 2).
9. Tamanho de página padrão: 20.
10. Situação `atrasado`: destaque visual próprio, com a data limite em vermelho e o botão de devolver visível (ver proposta na conversa).
11. Branch `feat/frontend-v1` enviada ao GitHub; o plano é atualizado a cada etapa.
12. Execução pelos 3 agentes spec-driven (PM, Teste, Implementação) e Revisor; um agente de frontend pode ser criado se preciso.

## 5A. Dúvidas antigas (respondidas)

1. **Caminho da API.** O `.env` usa `VITE_API_URL` com `/api` no fim. Os contratos não têm esse prefixo. Posso usar a base sem `/api` (contrato literal), ou o Backend 1 vai expor `/api`?
2. **Campos que não existem no contrato.** Vou remover os campos que não estão nas fichas: `categoria` (livro), `perfil` e `status` (usuário), `telefone` e `email` separados (usuário, o contrato tem só `contato`). Está de acordo? Se quiser manter algum, precisamos de um contrato novo.
3. **Fallback falso.** Proponho remover todo fallback que cria dado local quando a API falha. Concorda?
4. **Testes.** Proponho Vitest + Testing Library + jsdom, com `npm test`. Concorda?
5. **Dependências.** Para corrigir `npm ci`, proponho fixar `vite` em uma versão 7.x compatível com `@vitejs/plugin-react` 4.x. A alternativa é atualizar o plugin para uma versão que aceite vite 8. Qual prefere?
6. **Lint.** Proponho ESLint 8 com configuração `.eslintrc` (o `package.json` pede ESLint 8). Concorda?
7. **URL do WebSocket.** O CT13 fala em `wss://.../ws/biblioteca`. Em desenvolvimento, `ws://localhost:8001/ws/biblioteca`? Ou o caminho deve ser exatamente o do CT13?
8. **Cards não conferidos na íntegra.** Não abri os campos "Contratos" dos cards #791, #794, #797, #799 e #800; usei o texto do backlog. Quer que eu confira antes de começar?
9. **Paginação.** Tamanho de página padrão na tela? Proponho 20 (padrão do contrato).
10. **Tratamento de atrasado.** Na tela de empréstimos, mostro `atrasado` com destaque visual. Concorda, ou prefere outra cor/rótulo?
11. **Branch e push.** A branch `feat/frontend-v1` está só local, com o código do zip. Quer que eu envie (push) agora para o GitHub, ou só depois de E0 e os testes?
12. **Aprovação.** Confirma que devo seguir com os 3 agentes spec-driven (PM, Teste, Implementação, Revisor) após suas respostas?

---

## 6. Estado

| Item                            | Situação                                         |
| ------------------------------- | ------------------------------------------------ |
| Branch local `feat/frontend-v1` | Criada, commit `29548db` com o código do zip     |
| Push                            | Não feito                                        |
| Análise contra os cards         | Concluída (seção 3)                              |
| Build                           | Passa só com `--legacy-peer-deps`                |
| Lint                            | Quebrado (sem configuração)                      |
| Testes                          | Não existem                                      |
| Implementação                   | Não iniciada, aguardando as respostas da seção 5 |
