# Biblioteca — Frontend (PI IV 0101, Grupo 5)

Interface web do sistema de gestão de biblioteca do Projeto Integrador IV. Feita em React 18 + Vite 7, fala com o **Backend 1** por HTTP (contratos CT1 a CT8) e recebe atualizações do **Backend 2** por WebSocket (contrato CT13).

O frontend não guarda dados próprios nem valida regras de negócio: as validações ficam no Backend 1 e a tela mostra a mensagem correspondente ao código de erro devolvido. Em caso de erro, nenhum dado falso é exibido e a lista anterior é mantida.

## Telas e cards

| Tela        | Componente                                     | Card         | Contratos     | O que faz                                                                                                    |
| ----------- | ---------------------------------------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------ |
| Acervo      | `features/livros/CadastroLivro.jsx`            | #785 (H02.2) | CT1           | Cadastro de livro (título, autor, ISBN, quantidade de exemplares) com mensagem para cada erro.               |
| Acervo      | `features/livros/PesquisaLivros.jsx`           | #789 (H04.2) | CT2           | Pesquisa paginada de livros (título, autor, ISBN, quantidade disponível).                                    |
| Painel      | `features/livros/PainelDisponibilidade.jsx`    | #791 (H05.2) | CT7, CT13     | Livros disponíveis para empréstimo; atualiza ao receber evento em tempo real e busca de novo ao reconectar.  |
| Usuários    | `features/usuarios/CadastroUsuario.jsx`        | #787 (H03.2) | CT3           | Cadastro de usuário (nome, CPF, contato) com mensagem para cada erro.                                        |
| Usuários    | `features/usuarios/PesquisaUsuarios.jsx`       | #800 (H09.2) | CT4           | Pesquisa paginada de usuários com a lista de empréstimos de cada um e a situação.                            |
| Empréstimos | `features/emprestimos/RegistrarEmprestimo.jsx` | #794 (H06.2) | CT4, CT5, CT7 | Busca o usuário, escolhe um livro disponível, registra o empréstimo e mostra a data limite.                  |
| Empréstimos | `features/emprestimos/ListaEmprestimos.jsx`    | #797 (H07.2) | CT8, CT13     | Empréstimos com abas Todos, Ativos, Atrasados e Devolvidos; atualiza por evento e ao reconectar.             |
| Empréstimos | `features/emprestimos/ListaEmprestimos.jsx`    | #799 (H08.2) | CT6           | Botão **Devolver** em empréstimo ativo ou atrasado; mostra a devolução sem recarregar ou a mensagem de erro. |

A navegação principal (`App.jsx`) tem os botões **Painel**, **Acervo**, **Usuários** e **Empréstimos** e um indicador `Tempo real: conectado` / `Tempo real: desconectado`.

Endpoints usados (sem prefixo `/api`):

| Função (`services/api.js`) | Método e caminho                    | Contrato |
| -------------------------- | ----------------------------------- | -------- |
| `cadastrarLivro`           | `POST /livros`                      | CT1      |
| `consultarLivros`          | `GET /livros`                       | CT2      |
| `cadastrarUsuario`         | `POST /usuarios`                    | CT3      |
| `consultarUsuarios`        | `GET /usuarios`                     | CT4      |
| `registrarEmprestimo`      | `POST /emprestimos`                 | CT5      |
| `registrarDevolucao`       | `PATCH /emprestimos/{id}/devolucao` | CT6      |
| `listarDisponibilidade`    | `GET /livros/disponibilidade`       | CT7      |
| `consultarEmprestimos`     | `GET /emprestimos`                  | CT8      |
| `useBibliotecaTempoReal`   | WebSocket `/ws/biblioteca`          | CT13     |

## Requisitos

- Node.js **20.19 ou superior** (ou 22.12+), exigência do Vite 7, e npm.
- Backend 1 em execução para usar as telas (por padrão em `http://localhost:8000`).
- Opcional: Docker, para gerar a imagem de produção.

## Configuração

Copie `.env.example` para `.env` e ajuste se necessário:

```bash
cp .env.example .env
```

| Variável       | Padrão                              | Uso                                                         |
| -------------- | ----------------------------------- | ----------------------------------------------------------- |
| `VITE_API_URL` | `http://localhost:8000`             | Endereço do Backend 1, **sem** `/api` e sem barra no final. |
| `VITE_WS_URL`  | `ws://localhost:8001/ws/biblioteca` | Canal WebSocket do Backend 2 (CT13).                        |

Se a variável não for definida (ou ficar vazia), vale o padrão. As variáveis `VITE_*` são lidas no momento do build (ou ao iniciar o `npm run dev`).

## Como rodar em desenvolvimento

1. Suba o Backend 1 em `http://localhost:8000`, liberando a origem do Vite no CORS:

   ```bash
   CORS_ORIGENS=http://localhost:5173
   ```

2. No frontend:

   ```bash
   npm ci
   npm run dev
   ```

3. Abra `http://localhost:5173`.

## Como testar

```bash
npm test               # toda a suíte (contrato + unitários) com Vitest
npm run test:coverage  # suíte com cobertura (mínimo de 85% em linhas, comandos e funções e 80% em ramos, regra F11)
npm run lint           # ESLint sem avisos
npm run build          # build de produção em dist/
```

A cobertura considera `src/`, sem `src/test/` e `src/main.jsx`.

## Estrutura de pastas

```
src/
├── services/        # api.js (chamadas HTTP, ApiError) e mensagens.js (texto por código de erro)
├── utils/           # datas.js (formatarDataHora)
├── components/      # componentes reutilizáveis (SeloSituacao)
├── features/
│   ├── livros/      # CadastroLivro, PesquisaLivros, PainelDisponibilidade
│   ├── usuarios/    # CadastroUsuario, PesquisaUsuarios
│   └── emprestimos/ # RegistrarEmprestimo, ListaEmprestimos
├── pages/           # PainelPage, AcervoPage, UsuariosPage, EmprestimosPage
├── hooks/           # useBibliotecaTempoReal (WebSocket CT13 com reconexão)
├── test/
│   ├── contrato/    # testes de contrato (congelados, escritos a partir da especificação)
│   └── unitarios/   # testes unitários da implementação
├── App.jsx          # navegação e indicador de tempo real
└── main.jsx         # ponto de entrada
```

## Processo de desenvolvimento (spec driven)

O código foi desenvolvido a partir da especificação, em entregáveis (E1 a E6):

1. O PM descreve a interface e as regras em [`agentes.md`](agentes.md) (seção 6) com base nos contratos do Backend 1 e no plano em [`docs/plano-frontend.md`](docs/plano-frontend.md).
2. O Agente de Teste escreve os testes de contrato em `src/test/contrato/` sem ler o código; o PM congela esses testes (hash).
3. O Agente de Implementação escreve o código em `src/` e os testes unitários em `src/test/unitarios/`, sem alterar os testes de contrato.
4. O PM roda lint, testes, cobertura e build; um Agente Revisor compara especificação, código e testes.
5. Só entra commit com toda a suíte verde.

Os fluxos de cada caso de uso estão em [`docs/fluxos/`](docs/fluxos/).

## Docker

A imagem faz o build com Node 20 e serve os arquivos estáticos com Nginx (porta 80, com suporte a rotas de SPA).

Como as variáveis `VITE_*` entram no bundle durante o build, informe-as com `--build-arg` (sem eles, valem os padrões):

```bash
docker build -t biblioteca-frontend \
  --build-arg VITE_API_URL=http://localhost:8000 \
  --build-arg VITE_WS_URL=ws://localhost:8001/ws/biblioteca \
  .

docker run -p 8080:80 biblioteca-frontend
```

Acesse `http://localhost:8080`. Nesse caso, o Backend 1 precisa liberar a origem `http://localhost:8080` no CORS (`CORS_ORIGENS`).

## Limitações atuais

- O **Backend 2 ainda está em implementação**. Sem ele, o indicador mostra `Tempo real: desconectado` e o frontend continua tentando reconectar a cada 3 segundos. Todas as telas funcionam só com HTTP (Backend 1); apenas as atualizações automáticas por evento ficam indisponíveis. O tempo real é coberto por testes com WebSocket simulado.
- O formato da mensagem do WebSocket (objeto do CT13 em JSON, sem envelope) ainda precisa ser confirmado com o grupo do Backend 2.
- Integração real com os backends (#795) e roteiro de demonstração (#802) estão fora do escopo deste repositório.
