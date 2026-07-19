# Plano de fases — Hub (Central de Recursos Compartilhados)

Lista de tarefas viva. Atualizar conforme o progresso — não é histórico congelado. Contexto estável (restrições, decisões de arquitetura) está em [`CLAUDE.md`](./CLAUDE.md).

## Status de deploy (2026-07-10) — resumo; os detalhes por fase abaixo foram revisados para bater com este bloco

- ✅ **Deployado em produção**: `firestore.rules` (todas as coleções — Salas, Equipamentos, Indenização, Setores, o fix de `veiculos`) e `hosting` (todas as telas até a Fase 5, incluindo o dashboard consolidado)
- ✅ **13 setores reais semeados** em produção
- ✅ **3 salas reais semeadas** em produção (Fase 1)
- ✅ **`storage.rules` deployado em 2026-07-17** — Storage habilitado (plano Blaze, cartão pessoal, ver decisão registrada abaixo) e regras publicadas com `firebase deploy --only storage` (não `storage:rules` — esse projeto não tem targets nomeados, então o sufixo `:rules` quebra o comando).
- ✅ **Equipamentos testado manualmente em produção em 2026-07-17** — ciclo completo Reservar → Retirar → Devolver funcionou sem nenhum erro de console. Módulo confirmado funcional.
- ✅ **Salas testado manualmente em produção em 2026-07-17** — reserva criada, aparece em "Próximas reservas", cancelamento funciona, zero erros de console. Módulo confirmado funcional.
- ✅ **BUG DO `storage.rules` CORRIGIDO E VERIFICADO em 2026-07-17.** Módulo de Indenização de Transporte (Anexo I e II) testado ponta a ponta em produção com as contas de teste: leitura do PDF via Storage (HTTP 200), aprovação do Anexo I pelo gestor, e desbloqueio automático do Anexo II — tudo funcionando. Ver "Bug do storage.rules" abaixo para a causa raiz e a correção aplicada.
- ✅ **Cobertura de teste NOVA escrita para Salas/Equipamentos/Indenização/Setores em 2026-07-18** — `e2e/salas.spec.ts` (9), `e2e/equipamentos.spec.ts` (6), `e2e/indenizacao.spec.ts` (12), `e2e/setores.spec.ts` (6). Ver seção "Cobertura nova" abaixo.
- ✅ **Mocks de teste (`src/firebase/__mocks__/`) estavam quebrando a suíte e2e inteira — corrigido em 2026-07-17/18.** Suíte e2e completa foi de app-não-renderiza para **160/160 testes passando** (127 pré-existentes corrigidos + 33 novos). Ver seção "Infraestrutura de mock e2e corrigida" abaixo.
- ✅ **Suíte de testes unitários (Vitest/Testing Library) também corrigida em 2026-07-18** — tinha **80 testes falhando desde a Fase 1** (a mesma dívida que este arquivo já vinha citando). Causas: mesma classe de bug dos mocks e2e (exports faltando: `where`, `onSnapshot`, `setDoc`, `deleteDoc`, `getDoc`, `Timestamp`), mais `pendentes` prop obsoleta no `Sidebar` (componente ignora silenciosamente, já calcula sozinho via `onSnapshot`), mais um teste (`Sidebar.test.tsx`) que **nunca mockou o Firestore e fazia chamada real ao projeto de produção** durante os testes. Resultado: **141/141 passando**. `tsc -b` e `vite build` conferidos sem erro. Ver seção "Suíte Vitest corrigida" abaixo.
- ✅ **Código publicado no GitHub e CI/CD via GitHub Actions funcionando ponta a ponta desde 2026-07-19** — repositório `diegoareco67-bit/Gest-o-Frota`, workflow roda type-check + Vitest + Playwright + build a cada push, e faz deploy automático (hosting, firestore rules, storage rules, functions) quando `main` passa em tudo. Ver seção "CI/CD via GitHub Actions" abaixo.
- ✅ **Rebrand FrotaGov → Hub concluído em 2026-07-19** (tela de login + Sidebar): nome/identidade visual do CLAUDE.md ("Nome Hub, subtítulo Central de Recursos Compartilhados") finalmente aplicado nas telas — antes só existia no documento. Ver seção "Rebrand FrotaGov → Hub" abaixo.

### ✅ Infraestrutura de mock e2e corrigida em 2026-07-17 — causa real dos "80 testes falhando"

Ao tentar rodar `e2e/login.spec.ts` pra validar a correção dos seletores (`#email`→`#login-email`), a página renderizava **completamente em branco** sob `vite.test.config.ts`. Investigado com um script Playwright isolado capturando `pageerror`: o app inteiro falhava ao montar, porque **React Router importa todas as rotas estaticamente** (não há lazy-loading), então qualquer export faltando nos mocks de `firebase/auth`/`firebase/firestore` — usado por QUALQUER página, mesmo uma não visitada — quebra a aplicação inteira, inclusive a tela de login.

**Exports que faltavam nos mocks (adicionados em `src/firebase/__mocks__/auth.ts` e `firestore.ts`):**
- `sendPasswordResetEmail` (usado por `login.tsx`, fluxo "Esqueci minha senha")
- `onSnapshot` (usado por `Sidebar.tsx`, badge de pendentes do gestor — nunca removido apesar do `CalendarioGrade.tsx` ter migrado pra recarregamento periódico na Fase 5)
- `setDoc` (usado por `Aprovacoes.tsx`/`Usuarios.tsx`/`Checkin.tsx`/`Checkout.tsx`)
- `deleteDoc` (usado por `Aprovacoes.tsx`/`MinhasSolicitacoes.tsx`)
- suporte ao operador `where(..., "in", [...])` no `getDocs`/`onSnapshot` mockados (necessário pra Equipamentos)

**Bug adicional no mock de auth:** `getAuth()` retornava um objeto novo e vazio (`{}`) a cada chamada, em vez de um singleton com `currentUser` — então `auth.currentUser!.uid` (usado em `login.tsx` logo após o login pra buscar o perfil) sempre falhava silenciosamente, travando o redirecionamento pós-login. Corrigido pra manter um objeto `authObj` compartilhado com `currentUser` atualizado de forma síncrona no sign-in/sign-out.

**Bug adicional no mock de erro de login:** rejeitava com um `Error` comum (sem `.code`), mas `login.tsx` mapeia a mensagem de erro pelo `err.code` (formato real do `FirebaseError`) — corrigido pra incluir `.code = "auth/invalid-credential"`.

**3 testes com conteúdo desatualizado, corrigidos em `login.spec.ts`:** título "FrotaGov" está numa `div`, não `<h1>`; badge "conexão segura" não existe no componente atual (removido o teste); `aria-label` do botão de mostrar/ocultar senha é "Exibir senha"/"Ocultar senha", não "Mostrar senha".

**Resultado parte 1 (mocks):** suíte e2e completa foi de praticamente 100% quebrada (app não renderizava) para 81 de 130 testes passando.

### ✅ Os 49 testes pré-existentes restantes também corrigidos em 2026-07-18 — suíte 127/127

Por decisão do usuário, os 49 testes que ainda falhavam em módulos antigos (Veículos, Aprovações, Manutenção, Relatórios, Solicitar, Usuários, Minhas Solicitações/Checkout/Checkin) também foram investigados e corrigidos, um arquivo de spec por vez. **Nenhum bug de produto foi encontrado nesse lote** — 100% eram testes desatualizados em relação ao componente real, quase todos nas mesmas 4 categorias:

1. **`getByRole("heading", ...)` sem heading nenhum** — todo título de página é uma `<div>` estilizada, não `<h1>`/`<h2>`. Só os títulos de **modal** usam `<h2>` de verdade. Corrigido pra `page.locator("main").getByText(..., {exact:true})` nos títulos de página.
2. **Ambiguidade de texto** — o mesmo texto aparecia em mais de um lugar visível (ex.: "Disponível" no badge da tabela E na `<option>` do filtro; "Solicitações"/"Usuários" no card de relatório E no botão da Sidebar E na opção do `<select>` de tipo). Corrigido escopando a busca (`page.locator("table").getByText(...)`) ou usando `.first()`/`{exact:true}` quando os dois matches são legitimamente visíveis.
3. **Conteúdo literalmente mudou e o teste não acompanhou** — exemplos: placeholder de placa era "ABC-1234" no teste, é "HTO-3017" no componente; botão "Agendar" virou "Nova Manutenção"; filtro de status de Manutenção virou um `<select>` em vez de botões; campo Setor do cadastro de usuário virou um `<select>` (dropdown de `useSetores()`) em vez de texto livre; e-mail de exemplo mudou de `@prefeitura.gov.br` pra `@cge.ms.gov.br`.
4. **Teste descrevia uma funcionalidade que não existe mais** — "Taxa de Aprovação" e a tabela de veículos em Relatórios não existem no componente atual (é só cards de resumo agregado); os describe blocks "(stub)" de Minhas Solicitações/Checkout/Checkin testavam texto de placeholder ("Em construção") de quando essas telas eram esqueleto — hoje são páginas completas e reais, os testes foram reescritos pra validar o conteúdo de verdade.

**Mais 2 bugs reais de mock encontrados e corrigidos durante esse trabalho** (não eram só desatualização de teste):
- `serverTimestamp()`/`Timestamp.now()`/`Timestamp.fromDate()` do mock retornavam um `Date` puro sem `.toDate()` — qualquer tela que lesse `criadoEm?.toDate()` de um documento recém-criado no mock quebrava com `TypeError`. Corrigido pra retornar um objeto `{ toDate, seconds, nanoseconds }`.
- Snapshots do mock (`getDocs`/`onSnapshot`) não tinham a propriedade `.empty` que o Firestore real tem — código que fazia `if (!snap.empty) snap.docs[0]...` (ex.: `Checkin.tsx`) quebrava com `Cannot read properties of undefined` quando a query realmente não tinha resultado, porque `snap.empty` era sempre `undefined` (falsy) e o código achava que tinha dado. Corrigido adicionando `empty: mockDocs.length === 0`.

**Seed de dados novo no mock** (`store` em `firestore.ts`): `setores`, `salas`, `reservasSalas`, `equipamentos`, `emprestimosEquipamentos`, `veiculosProprios` (1 registro já aprovado pro `uid-usuario-teste`) e `indenizacoes` — necessário pra qualquer teste desses módulos funcionar (o mock não tinha nenhuma dessas coleções antes).

**Resultado final: 127 de 127 testes e2e passando**, zero falhas conhecidas na suíte.

### ✅ Cobertura de teste NOVA — Salas, Equipamentos, Indenização, Setores (2026-07-18)

Item original pedido pelo usuário, escrito depois que a infraestrutura de mock foi corrigida (sem isso, qualquer teste novo nasceria quebrado pelo mesmo motivo):

- `e2e/salas.spec.ts` (9 testes) — renderização, cadastro de sala (gestor), reserva + cancelamento (usuário), validação de campo obrigatório.
- `e2e/equipamentos.spec.ts` (6 testes) — renderização, cadastro (gestor), ciclo completo Reservar → Retirar → Devolver (usuário).
- `e2e/setores.spec.ts` (6 testes) — renderização, cadastro, rejeição de nome duplicado, ativar/desativar.
- `e2e/indenizacao.spec.ts` (12 testes) — Anexo I já aprovado (dados do mock), Anexo II desbloqueado gera PDF (para antes de "Enviar ao RH" de propósito — dispararia e-mail real), Anexo II continua bloqueado sem Anexo I aprovado, gestor aprova Anexo I pendente.
- Novo seed no mock (`store` em `src/firebase/__mocks__/firestore.ts`): `setores` (3), `salas` (2), `equipamentos` (1), `veiculosProprios` (2 — um aprovado pro usuário de teste padrão, um pendente pra "Pedro Motorista"), coleções vazias pra `reservasSalas`/`emprestimosEquipamentos`/`indenizacoes`.
- Mock de auth (`src/firebase/__mocks__/auth.ts`) ganhou um terceiro perfil de teste (e-mail contendo `"outro"` → `uid-outro-servidor`) pra poder logar como um segundo servidor com Anexo I pendente, sem mexer no usuário de teste padrão.

**Resultado: 160 de 160 testes e2e passando** (127 pré-existentes + 33 novos).

### ✅ Suíte Vitest (testes unitários/componente) corrigida — 2026-07-18

Depois da suíte e2e fechar 100%, o usuário pediu pra investigar `npm run test:run` (Vitest + Testing Library) também — achado: **80 testes falhando**, o mesmo número que este arquivo já vinha citando como dívida desde a Fase 1 (`"suíte já tinha 80 testes falhando"`). Essa suíte usa `vi.mock(...)` manual por arquivo (não os mocks compartilhados de `src/firebase/__mocks__/` usados pela e2e), então cada um dos 13 arquivos em `src/__tests__/` tinha seu próprio conjunto de exports faltando — a mesma classe de bug encontrada na e2e, só que repetida arquivo a arquivo.

**Causas por arquivo, resumidas:**
- Falta de `where`/`onSnapshot`/`setDoc`/`deleteDoc`/`getDoc`/`Timestamp` no `vi.mock("firebase/firestore", ...)` de quase todo arquivo — qualquer página renderiza `<Sidebar/>`, que assina `onSnapshot` quando `perfil==="gestor"`.
- Mesmas 4 categorias de conteúdo desatualizado já descritas na seção da e2e acima (heading inexistente, ambiguidade de texto, placeholder/rótulo mudou, funcionalidade removida) — resolvidas com `within(screen.getByRole("main"))`, regex em vez de string exata pra texto quebrado em múltiplos elementos (`👤 {nome}`), e ajuste dos seletores pra bater com o componente real.
- **`Aprovacoes.tsx`/`Manutencao.tsx` chamam `registrarAuditoria()`** (`src/firebase/auditoria.ts`), que usa `addDoc`/`serverTimestamp` do mesmo módulo `firebase/firestore` — faltava `addDoc` no mock de alguns arquivos.
- **`StubPages.test.tsx` não mockava nada** (nem Router, nem Auth, nem Firestore) pras páginas de Minhas Solicitações/Checkin/Checkout — reescrito do zero com `MemoryRouter`+`Routes`+`Route` (pra `useParams` funcionar) e os mocks completos. As páginas deixaram de ser stubs há tempo; os testes ainda esperavam texto "Em construção".
- **`Sidebar.test.tsx` não mockava `firebase/firestore` nem `../firebase/config` de jeito nenhum** — o `Sidebar` em modo gestor **fazia uma chamada real ao Firestore de produção** (`gestaofrotacge530101`) durante os testes, via `onSnapshot` genuíno, ainda que sem aguardar resposta. Corrigido com um `onSnapshot` mockado que simula a contagem de pendentes sincronamente, sem nenhuma chamada de rede.
- **Achado à parte, sem correção no componente** (só no teste): a interface `SidebarProps` ainda declara `pendentes?: number`, mas a função `Sidebar({perfil})` nunca desestrutura essa prop — dead code do tempo em que a contagem vinha de fora; hoje o componente sempre calcula sozinho via `onSnapshot`. Não mexido no componente (fora do escopo pedido), só documentado aqui.
- **2 bugs reais adicionais**, iguais aos já achados na e2e: `serverTimestamp()`/`Timestamp` sem `.toDate()`, e erro de login mockado sem `.code` (`err.code` é o que `login.tsx` usa pra mapear a mensagem).

**Resultado: 141 de 141 testes passando.** `tsc -b` sem erros. `vite build` conclui com sucesso (avisos pré-existentes não relacionados: bundle >500kB por causa do `jsPDF`/`html2canvas`, já registrado como dívida na Fase 2; e um "ineffective dynamic import" em `login.tsx` que importa `firebase/firestore`/`config` dinamicamente apesar de já serem importados estaticamente em outros arquivos — nenhum dos dois é regressão desta sessão).

### ✅ Rebrand FrotaGov → Hub — tela de login e Sidebar, 2026-07-19

Pedido do usuário: "mudanças no layout da tela inicial que faça jus ao hub". Até aqui, o CLAUDE.md já documentava a identidade "Hub — Central de Recursos Compartilhados" (seção "Identidade visual", desde a Fase 0), mas nenhuma tela tinha sido atualizada — login e Sidebar ainda diziam "FrotaGov" em todo lugar.

**Decisão de escopo (pergunta feita ao usuário):** rebrand completo (login + Sidebar), não só a tela de login, pra manter a marca consistente em toda a área autenticada.

- `src/components/login.tsx`: título "FrotaGov" → "Hub", subtítulo "Sistema de Gestão de Frota Oficial" → "Central de Recursos Compartilhados", ícone trocado de caminhão para grade 2×2 (referência Microsoft 365/Google Workspace, como o CLAUDE.md já pedia). **Adicionada vitrine de módulos** — 4 chips (Veículos/Salas/Equipamentos/Indenização, cada um com cor e ícone próprios) entre o subtítulo e o card de login, pra comunicar visualmente que o sistema cobre mais que só frota.
  - **Restrição encontrada:** Salas e Equipamentos não têm mirror público de dados (só `calendarioPublico`, dos veículos, é legível sem login) — então os chips são só identidade visual/navegação, não calendários ao vivo. Criar mirrors públicos pra esses módulos ficaria como trabalho futuro caso se queira calendário público deles também.
  - O calendário à direita (`CalendarioGrade`) continua mostrando só a frota (é o único com dado público) — o subtítulo padrão dele ("...da frota oficial") já deixa isso claro, não precisou mudar.
- `src/components/layout/Sidebar.tsx`: logo "FrotaGov" → "Hub", ícone do caminhão trocado pelo mesmo ícone de grade usado no login (reaproveitado do próprio `IcoMap.dashboard` já existente) — consistência visual entre login e área logada.
- `index.html`: `<title>` "FrotaGov" → "Hub — CGE-MS".
- Testes atualizados pra bater com o texto novo: `Login.test.tsx`, `Sidebar.test.tsx`, `e2e/login.spec.ts`, `e2e/gestor.spec.ts`, `e2e/usuario.spec.ts`.
- Verificado: `tsc -b` sem erro, **141/141 Vitest**, **160/160 e2e**, e checagem visual manual (`npm run dev` + screenshot da tela de login) confirmando layout sem sobreposição/corte de texto.

**Fora do escopo, não alterado:** o e-mail placeholder do login continua `gestor@frota.ms.gov.br` (domínio do sistema, não é branding visual); nome do projeto Firebase (`gestaofrotacge530101`) e URL de produção (`gestaofrotacge530101.web.app`) continuam com "frota" no nome — trocar isso seria migração de projeto/domínio, não um ajuste de tela.

### ✅ CI/CD via GitHub Actions — configurado e funcionando em 2026-07-19

Repositório publicado em `https://github.com/diegoareco67-bit/Gest-o-Frota`. Decisão do usuário: enviar o histórico local completo, substituindo o remoto.

**Segredo exposto encontrado no primeiro push:** `src/.claude/settings.local.json` (config local do Claude Code de uma sessão anterior, em outra máquina) tinha um token OAuth `ya29.` real do Google embutido em várias entradas de allowlist de permissão (`Bash(curl ... Authorization: Bearer ya29...)`). O GitHub bloqueou o push por secret scanning. Causa raiz do arquivo ter sido versionado: o `.gitignore` tinha `.claude/settings.local.json` sem prefixo `**/` — esse padrão só ancora na raiz do repo, não bate com `src/.claude/settings.local.json`. Corrigido:
- `.gitignore` ajustado para `**/.claude/settings.local.json`
- Arquivo removido do tracking (`git rm --cached`) em `main` e `master`
- **Decisão do usuário:** em vez de reescrever os 24 commits do histórico local pra remover o segredo de todos eles, criado um branch órfão com **um commit único limpo** e publicado como `main` — mais simples, sem reescrita de histórico. O histórico completo (24 commits, incluindo o do segredo) continua só local no branch `master`, nunca publicado.

**Workflow criado** (`.github/workflows/deploy.yml`): a cada push/PR em `main` roda `tsc -b`, `npm run test:run` (Vitest), `npm run test:e2e` (Playwright) e `npm run build`; se tudo passar e for push em `main`, faz `firebase-tools deploy --only hosting,firestore:rules,storage,functions`.

**Secrets configurados no GitHub** (Settings → Secrets and variables → Actions):
- `VITE_APPS_SCRIPT_URL` — a mesma URL do Apps Script já usada localmente (Fase 2)
- `FIREBASE_SERVICE_ACCOUNT` — chave JSON de uma conta de serviço gerada no Firebase Console (Configurações do projeto → Contas de serviço), usada pro `firebase-tools` autenticar sem login interativo

**3 erros de configuração corrigidos até o pipeline fechar verde:**
1. `echo "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}" > arquivo` quebrava o JSON — o GitHub Actions substitui o secret direto no texto do comando, e as aspas duplas embutidas no JSON fechavam a string do `echo` prematuramente, corrompendo o arquivo. Corrigido usando `env:` + `printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > arquivo` (referência de variável de shell de verdade, segura contra caracteres especiais).
2. `Missing permissions ... iam.serviceAccounts.ActAs` e depois `Permission denied to get service [firebasestorage.googleapis.com]` — a conta de serviço `firebase-adminsdk-fbsvc@...` usada pelo CI não tinha os papéis de IAM necessários pra fazer deploy de Functions/verificar APIs habilitadas. Resolvido concedendo, via Google Cloud Console → IAM, os papéis **"Usuário da conta de serviço"** e **"Administrador do Firebase"** a essa conta (decisão do usuário: resolver via console em vez de tirar Functions do escopo do deploy automático).
3. `Could not find rules for the following storage targets: rules` — mesmo bug de sintaxe já documentado no deploy manual (ver bloco de status no topo): o comando usava `storage:rules`, mas esse projeto não tem targets nomeados. Corrigido para `--only storage` no workflow.

**Resultado:** pipeline completo (test-and-build + deploy) passou 100% verde na execução #3 (`https://github.com/diegoareco67-bit/Gest-o-Frota/actions`).

**Pendente de segurança, não urgente:** revogar o Personal Access Token do GitHub usado manualmente pra criar o primeiro push (não é mais necessário agora que o CI usa os secrets próprios) — Settings → Developer settings → Personal access tokens, no perfil do usuário.

### ✅ Bug do `storage.rules` — corrigido em 2026-07-17 (cross-service `firestore.get()` não resolvia em produção)

**Sintoma:** teste manual do Anexo I (`/usuario/veiculo-proprio`) falhou ao enviar o termo assinado — `FirebaseError: Firebase Storage: User does not have permission to access '...' (storage/unauthorized)`, HTTP 403, mesmo logado como o próprio dono do arquivo com `usuarios/{uid}.perfil = "usuario"` confirmado no Firestore.

**Diagnóstico (feito com um redeploy temporário e reversível da regra, revertido em seguida):**
- Regra `allow write: if isAuth() && request.auth.uid == uid` (sem checar perfil) → **sucesso** (upload completo).
- Regra `allow read: if isGestor() || isUsuario()` (checagem original, que chama `perfil()` → `firestore.get(...)`) → **403**, mesmo com o documento correto no Firestore.
- Com leitura E escrita simplificadas para `isAuth() && uid == uid` (sem `perfil()`) → **sucesso total**.

**Causa raiz:** a função `perfil()` em `storage.rules` (linha ~9-11) usa `firestore.get(/databases/(default)/documents/usuarios/$(request.auth.uid))` — uma chamada cross-service do Storage Rules pro Firestore. Essa chamada está falhando/retornando vazio em produção neste projeto, fazendo `isGestor()` e `isUsuario()` sempre avaliarem falso, então **toda regra de Storage que depende de perfil (Anexo I e Anexo II) nega acesso pra todo mundo**, inclusive o dono legítimo do arquivo.

**Correção aplicada em 2026-07-17 — Firebase Auth Custom Claims em vez de `firestore.get()` cross-service:**
- Criado `functions/index.js` — Cloud Function `syncPerfilClaim` (`onDocumentWritten` em `usuarios/{uid}`, 2ª geração, região `southamerica-east1`), que grava `perfil` como **custom claim** no token de Auth do usuário sempre que o doc `usuarios/{uid}` é criado/atualizado. Usa `firebase-admin`/`firebase-functions`, deployada com `firebase deploy --only functions`.
- `firebase.json` ganhou a seção `"functions": { "source": "functions" }`.
- `storage.rules`: `function perfil()` trocada de `firestore.get(...)` para `request.auth.token.perfil` — sem chamada cross-service, sem essa classe de falha.
- **Isso só foi possível porque o projeto já está no plano Blaze** (destravado pra resolver o bloqueador do Storage, ver decisão abaixo) — Cloud Functions exige Blaze, e a restrição original do CLAUDE.md ("Cloud Functions fora") foi atualizada de acordo (ver CLAUDE.md).
- **Contas pré-existentes** (as 2 contas de teste, criadas antes da function existir) precisaram ser "tocadas" (re-write do doc `usuarios/{uid}`) pra disparar a sincronização do claim pela primeira vez — isso só é necessário uma vez por conta já existente; contas novas ou com perfil alterado dali pra frente sincronizam automaticamente.
- **Primeiro deploy de Cloud Functions teve duas falhas transitórias de propagação de IAM/Eventarc** (comuns na primeira vez que 2ª geração é usada num projeto nunca usado pra Functions) — resolvidas apenas esperando alguns minutos e tentando de novo, sem mudança de código.
- **Verificado em produção com as contas de teste:** leitura do PDF do Anexo I via Storage (HTTP 200), aprovação do Anexo I pelo gestor funcionando, Anexo II desbloqueado automaticamente após aprovação — fluxo completo confirmado funcional.
- **Pendente:** cobertura de teste automatizado ainda não escrita para este fluxo.
- ✅ **Envio real do Anexo II ao RH testado em 2026-07-17** (com autorização explícita do usuário pra disparar e-mail real) — status final `enviado_rh` (confirmado), não caiu no fallback `enviado` (não confirmado). Confirma que a chamada ao Apps Script funciona ponta a ponta em produção, inclusive lendo a resposta apesar da configuração `text/plain` anti-CORS.

### ✅ Contas e dados de teste — criados e depois removidos em 2026-07-17

Pra testar sem usar identidade de servidor real, foram criadas em produção 2 contas (`teste.gestor.qa@cge.ms.gov.br`, `teste.usuario.qa@cge.ms.gov.br`) e dados associados (1 equipamento — na verdade 2, uma duplicata de uma execução de teste anterior — 1 veículo próprio, 1 indenização, PDFs no Storage, reservas de sala). **Tudo removido depois de usado**: contas de Auth, docs `usuarios`/`equipamentos`/`veiculosProprios`/`indenizacoes`/`emprestimosEquipamentos`, arquivos no Storage. Confirmado via `accounts:lookup` que as contas não existem mais e a contagem de `usuarios/` voltou a 5 (os originais).

### Backfill do custom claim pras contas que já existiam antes da Cloud Function (2026-07-17)

A Cloud Function `syncPerfilClaim` só sincroniza o claim em escritas *novas* de `usuarios/{uid}`. Contas criadas antes do deploy da function precisavam de um "touch" manual (re-write do doc) pra ganhar o claim pela primeira vez — feito pras 7 contas que existiam: as 2 de teste e mais 5 encontradas no Firestore.

**Achado ao fazer esse backfill:** das 5 contas "reais" (não-teste) em `usuarios/`, só **2 têm conta de Auth de verdade e funcionam pra login**:
- ✅ `gestor@frota.gov.br` (perfil `gestor`) — claim sincronizado, login funcional.
- ✅ `condutor@frota.gov.br` (perfil `usuario`, nome "João Silva") — claim sincronizado, login funcional.
- ✅ **3 documentos órfãos removidos em 2026-07-17** — não tinham conta correspondente no Firebase Authentication (dois docs duplicados de `dareco@cge.ms.gov.br` e um de `diegoareco67@gmail.com`, Gmail pessoal, resquício de teste antigo). Usuário confirmou que eram lixo de teste, não servidores reais ativos. Apagados do Firestore. `usuarios/` agora tem só os 2 documentos reais e funcionais.

### Achado extra: `e2e/fixtures/firebase.ts` desalinhado com o componente real de login

Os testes e2e de login (`e2e/login.spec.ts`) e o fixture `fazerLogin()` usam os seletores `#email`/`#senha`, mas o componente real em produção (`src/components/login.tsx`) usa `#login-email`/`#login-senha`. Isso por si só já explica parte dos "80 testes pré-existentes falhando" citados nas Fases 1-5 — vale corrigir o fixture quando a cobertura de teste (item pendente de longa data) for finalmente escrita/consertada.

### ✅ Bloqueador do Storage resolvido em 2026-07-17 (histórico da decisão)

A suposição da Fase 0 (CLAUDE.md, "Ficar inteiramente no Firebase Spark: Authentication, Firestore, Storage, Hosting") **estava desatualizada** — o Firebase passou a exigir o plano **Blaze** (cartão cadastrado) para provisionar Storage, mesmo dentro da cota gratuita. Isso conflitava com a restrição inegociável do projeto (CLAUDE.md, "orçamento zero, sem cartão cadastrado").

**Decisão do usuário em 2026-07-17:** ciente do risco de governança (rastreabilidade de gasto público, responsabilização LGPD como controlador de dados, continuidade/propriedade da infraestrutura), optou por prosseguir com **cartão pessoal** em vez de aguardar conta institucional. Upgrade pro Blaze concluído, alerta de orçamento configurado em **R$10**, Storage habilitado e `storage.rules` deployado com sucesso (`firebase deploy --only storage` — atenção: **não** `storage:rules`, esse projeto não tem targets nomeados e esse sufixo quebra o comando).

## Fase 0 — Auditoria do que já existe ✅ concluída em 2026-07-10

- [x] Framework do front-end confirmado: React 19.2 + TypeScript + Vite 8 + react-router-dom 7 (não era suposição — verificado em `package.json`)
- [x] Estrutura de coleções do Firestore mapeada (ver `CLAUDE.md`): `usuarios`, `veiculos`, `solicitacoes`, `calendarioPublico`, `usos`, `manutencoes`, `solicitacoesAcesso`, `auditoria`
- [x] `firestore.rules` lido e documentado — separação pública/sensível já implementada via coleção-espelho `calendarioPublico`
- [x] Fluxo de autenticação mapeado: Firebase Auth (e-mail/senha) + doc `usuarios/{uid}` com campo `perfil` ("gestor" | "condutor"), rota protegida por perfil em `App.tsx`
- [x] Implementação do calendário público identificada: `src/components/login.tsx` (em produção, correta) vs. `src/pages/CalendarioPublico.tsx` (código órfão, não roteado, consulta a coleção errada — não usar como base)
- [x] Achado extra: Firebase Storage não inicializado no código ainda (sem `getStorage()`), apesar de configurado no projeto
- [x] Achado extra: arquivos de outro projeto (SUAD/SEGOV — `.vsdx`, `.xlsx`, scripts Python/PowerShell) misturados dentro de `src/` — não fazem parte do Hub, não mexer

## Fase 1 — Módulo Salas (piloto)

Objetivo: validar desenho de dados e regras num módulo simples, antes de partir para algo mais arriscado (sem e-mail, sem PDF, sem hash).

### 1a. Pré-requisito de perfis ✅ concluído e deployado em 2026-07-10

Decisão do usuário: o perfil "condutor" virou **"usuario"** (passa a reservar salas, não só dirigir), e foi criado um terceiro perfil **"consulta"** (só leitura, só enxerga calendários — sem telas internas de gestão).

- [x] `Perfil` = `"gestor" | "usuario" | "consulta"` em `types.ts`
- [x] Rotas `/condutor/*` → `/usuario/*`; nova rota `/consulta` com dashboard próprio
- [x] `AuthContext`: `ehCondutor` → `ehUsuario`, novo `ehConsulta`; fallback de conta sem doc em `usuarios/{uid}` agora cai em `perfil: "consulta"` (privilégio mínimo) em vez de `"condutor"`
- [x] `firestore.rules`: `isCondutor()` → `isUsuario()`, novo `isConsulta()`; leitura de `veiculos`, `solicitacoes`, `manutencoes`, `usos` restrita a `isGestor() || isUsuario()` — perfil consulta não lê essas coleções, só o mirror público `calendarioPublico`
- [x] Página de gestão `gestor/Condutores.tsx` → `gestor/Usuarios.tsx`, rota `/gestor/condutores` → `/gestor/usuarios`
- [x] Componente de calendário extraído de `src/components/login.tsx` para `src/components/CalendarioGrade.tsx`, reutilizável via prop `colecao` + tema claro/escuro — usado no Login (público) e na nova `pages/consulta/Dashboard.tsx` (autenticado)
- [x] Removido `src/pages/CalendarioPublico.tsx` (código órfão identificado na Fase 0)
- [x] Testes unitários e specs e2e renomeados/atualizados; `tsc`, `vite build` e `vitest run` conferidos — nenhuma regressão nova (suíte já tinha 80 testes falhando antes desta mudança, por dessincronia pré-existente entre testes e componentes; números idênticos antes/depois)
- [x] Deploy de `firestore:rules` + `hosting` feito em 2026-07-10 (`firebase deploy --only firestore:rules,hosting`)
- [x] Migração de dados concluída em 2026-07-10 — 4 documentos em `usuarios/{uid}` atualizados de `perfil:"condutor"` para `perfil:"usuario"` via `scripts/migrar-perfil-usuario.html` (script apagado após o uso, era de uso único)

### 1b. Módulo Salas em si ✅ implementado e deployado em 2026-07-10

**Schema** — duas coleções novas, sem mirror público/sensível (diferente de carros): Salas fica atrás do login pros três perfis (`gestor`, `usuario`, `consulta`), então não existe o problema de expor dado sensível pra internet anônima que motivou o mirror `calendarioPublico`. Decisão: `reservasSalas` guarda tudo (inclusive `responsavelNome`/`motivo`) e os três perfis autenticados leem a coleção inteira — se isso precisar mudar (ex.: esconder `motivo` do perfil consulta), é um ajuste pontual na regra, não uma mudança de schema.

- `salas` — `{ nome, capacidade, localizacao, ativo }`. Só gestor escreve.
- `reservasSalas` — `{ salaId, salaNome, responsavelId, responsavelNome, responsavelSetor, motivo, dataInicio, dataFim (ISO "YYYY-MM-DDTHH:MM"), status: "confirmada"|"cancelada", criadoEm }`. Gestor e usuário criam pra si mesmos; auto-confirmada, sem fila de aprovação (decisão do usuário). Cancelamento: dono da reserva ou gestor.

- [x] `firestore.rules`: `match /salas` e `match /reservasSalas` adicionados, leitura para os 3 perfis autenticados, escrita restrita
- [x] `CalendarioGrade.tsx` generalizado — agora aceita `campoTitulo`, `campoDataInicio`, `campoDataFim`, `statusMap`, `statusFiltro` (antes eram fixos pra veículo); uso em `login.tsx`/`consulta/Dashboard.tsx` continua igual (usa os defaults)
- [x] Página `src/pages/salas/Salas.tsx` — calendário + lista de próximas reservas com cancelamento + modal de nova reserva (checagem de conflito de horário no cliente) + cadastro rápido de sala (só gestor) — rota `/salas`, sem restrição de perfil (qualquer autenticado entra, botão de reservar escondido para `consulta`)
- [x] Sidebar: item "Salas" adicionado nas seções de `gestor` e `usuario`
- [x] `pages/consulta/Dashboard.tsx`: segunda instância do `CalendarioGrade` mostrando o calendário de salas
- [x] `tsc`, `vite build`, `vitest run` conferidos — sem regressão nova (mesmos 80 testes pré-existentes falhando, nenhum a mais)
- [x] Deploy de `firestore:rules` (coleções `salas`/`reservasSalas`) + `hosting` feito em 2026-07-10
- [x] Campo `equipamentos` adicionado ao cadastro de sala (dado real fornecido pelo usuário)
- [x] 3 salas reais cadastradas em produção em 2026-07-10 (Sala de Reunião AGE, Sala de Oitiva CRG, Sala de Treinamento) — feito via API REST do Firestore autenticada pelo token do Firebase CLI, sem precisar de senha de gestor; script de seed removido depois de confirmado
- [ ] **Pendente:** cobertura de teste (unit/e2e) para o módulo Salas — não escrita ainda, ficou pra um passo seguinte

## Fase 2 — Indenização de Transporte

Módulo mais delicado do sistema.

### Bloqueador ✅ resolvido em 2026-07-10 — texto oficial do Decreto nº 10.154/2000 recebido

**Valores vigentes (últimas redações, não os valores impressos no formulário original de 2000):**
- R$ 0,80/km rodado (redação do Decreto nº 12.606/2008 — o Anexo II impresso ainda mostra "R$ 0,40" porque é o texto original de 2000, já superado; usar 0,80 no cálculo)
- Limite de 2.500 km/mês para deslocamento a serviço (redação do Decreto nº 13.317/2011)
- Elemento de despesa orçamentária: 3390.93 (redação do Decreto nº 11.171/2003)

**São dois formulários, não um só:**

1. **Anexo I — Termo de Opção e Cadastramento de Veículo** (cadastro único por servidor, feito uma vez, não por viagem):
   - `nomeServidor`, `categoriaFuncional`
   - Dados do veículo: `marca`, `modelo`, `placa`
   - Texto de declaração de opção (fixo, gerado no PDF, não é input)
   - `localidade`, `data` (do termo)
   - Assinatura do servidor (fora do sistema, via Gov.br — ver fluxo em `CLAUDE.md` seção 4.4)
   - Aprovação: `dataAprovacao`, autoridade concedente (Secretário de Estado / Procurador-Geral / Diretor-Presidente) — nome, cargo, assinatura

2. **Anexo II — Boletim Demonstrativo de Viagem e Homologação da Indenização** (um por período/viagem):
   - **Parte I — Determinação de Serviço Fora da Sede** (preenchido antes da viagem): `nomeServidor`, `categoriaFuncional`, `servicoARealizar` (texto livre), `localidadesServico` (com estimativa de km por trecho), `inicioAutorizado` (data+hora), `retornoPrevisto` (data+hora), `odometroInicial`, `kmPreviamenteFixada` (opcional), responsável pela autorização
   - **Parte II — Relato do Responsável pelo Serviço** (preenchido depois): tabela repetível de `{ data, odometroInicial, trajetoPercorrido, kmRodados }` (o formulário oficial permite múltiplas linhas/múltiplos formulários), `servicosRealizados` (texto), flag `houveAlteracaoForcaMaior` (sim/não) + `justificativa` se sim, `odometroFinal`, `totalKmRodados`, responsável pela execução
   - **Parte III — Homologação**: confirmação de veracidade, `totalKmRodados × 0,80 = valor` (e valor por extenso), responsável pela homologação

**Destinatário do Anexo II homologado (confirmado em 2026-07-10):** `suad@cge.ms.gov.br`

- [x] E-mail do RH/Contabilidade confirmado (`suad@cge.ms.gov.br`)
- [x] Guia de configuração do Apps Script escrito em `docs/apps-script-setup.html`
- [x] Apps Script implantado pelo usuário e testado em 2026-07-10 — `POST .../exec` retorna `{"ok":true}` (HTTP 200), e-mail de teste enviado com sucesso pro RH. **Importante:** a URL do Web App responde com redirect 302 pra `script.googleusercontent.com/macros/echo?...`; quem for chamar via `fetch()`/`curl` sem seguir redirect automaticamente vai falhar — no browser (`fetch` do app) isso é transparente, mas em scripts de teste precisa `-L` ou seguir o `Location` manualmente.
- [x] URL guardada em `.env` (`VITE_APPS_SCRIPT_URL`, não commitado — `.env.example` documenta a variável, `.gitignore` atualizado)

### Implementação ✅ concluída em 2026-07-10 (`firestore:rules` e `hosting` deployados; `storage:rules` bloqueado até habilitar o Storage no console — ver bloco de status no topo; não testada em navegador real)

- [x] Firebase Storage inicializado (`storage` exportado de `src/firebase/config.ts`) + `storage.rules` novo (paths `veiculosProprios/{uid}/...` e `indenizacoes/{uid}/...`, valida `contentType: application/pdf` e tamanho < 10MB) + `firebase.json` atualizado com a seção `storage`
- [x] Duas coleções novas no Firestore: `veiculosProprios` (Anexo I) e `indenizacoes` (Anexo II), regras próprias (dono ou gestor leem/escrevem, `consulta` não vê — dado financeiro/pessoal sensível)
- [x] `jsPDF` adicionado como dependência (aumentou o bundle bastante por causa do `html2canvas` que vem junto mesmo sem ser usado — candidato a code-splitting/lazy-import futuro, não feito agora)
- [x] `src/utils/pdfIndenizacao.ts` — gera os dois PDFs fiéis aos campos oficiais (não pixel-perfect ao layout escaneado, mas com todas as informações), inclui conversor número→extenso em português para o valor da indenização, e `calcularHashSHA256` via `crypto.subtle.digest`
- [x] `src/pages/indenizacao/VeiculoProprio.tsx` (usuário) — formulário → gera PDF → baixa → (assina fora do sistema) → reenvia assinado → upload no Storage + doc no Firestore com `status: "pendente"`
- [x] `src/pages/indenizacao/Indenizacoes.tsx` (usuário) — bloqueado até o Anexo I estar `"aprovado"`; formulário único cobre Partes I e II do Anexo II (decisão de escopo: não separei em "antes da viagem" / "depois da viagem" como o papel original sugere, pra não construir um workflow multi-etapa maior — ver nota abaixo); ao reenviar o PDF assinado, chama o Apps Script automaticamente
- [x] `src/pages/indenizacao/GestorIndenizacoes.tsx` — aba de Veículos Próprios pendentes (aprovar/recusar) + lista de Indenizações enviadas
- [x] Rotas `/usuario/veiculo-proprio`, `/usuario/indenizacoes`, `/gestor/indenizacoes` + itens novos na Sidebar
- [x] `tsc`, `vite build`, `vitest run` conferidos — sem regressão nova (mesmos 80 testes pré-existentes)

**Decisões de escopo tomadas nesta implementação (revisar se o processo real exigir mais rigor):**
- Não há gate de aprovação do gestor *antes* de gerar/enviar o Anexo II — segue literalmente o fluxo já combinado no `CLAUDE.md` (upload do PDF assinado → chama Apps Script na hora), sem fila de homologação digital. A assinatura de "Responsável pela homologação" do formulário oficial fica por conta de quem for assinar fisicamente/via Gov.br antes do servidor fazer o reenvio — o sistema não orquestra múltiplos signatários.
- Anexo II é um formulário único (não duas etapas no tempo, antes/depois da viagem, como o papel sugere) — simplificação deliberada.
- Chamada ao Apps Script usa `Content-Type: text/plain;charset=utf-8` em vez de `application/json` — Apps Script Web Apps não tratam bem o preflight CORS (requisição `OPTIONS`) que `application/json` dispara a partir do navegador; `text/plain` é uma "simple request" e não dispara preflight. O `doPost` do lado do Apps Script já faz `JSON.parse(e.postData.contents)` independentemente do Content-Type declarado, então isso não quebra o parsing. Se a resposta não puder ser lida por causa de CORS mesmo assim, o código trata como "enviado, não confirmado" (`status: "enviado"`) em vez de erro — o e-mail já foi disparado no servidor de qualquer forma.

- [x] **Teste manual em navegador real** — feito em 2026-07-17, ver seção "Bug do storage.rules" acima
- [x] **Cobertura de teste (e2e)** — `e2e/indenizacao.spec.ts` (12 testes), ver seção "Cobertura nova" acima
- [x] **`VITE_APPS_SCRIPT_URL` em CI/build** — resolvido em 2026-07-19: configurado como GitHub Actions secret (`secrets.VITE_APPS_SCRIPT_URL`), injetado como `env` no workflow. Ver seção "CI/CD via GitHub Actions" abaixo.

## Fase 3 — Equipamentos ✅ implementada e deployada em 2026-07-10 (não testada em navegador real)

Decisões do usuário: patrimônio individual por equipamento (não por tipo/quantidade), empréstimo auto-confirmado (mesmo padrão de Salas, sem fila de aprovação).

- [x] Fluxo de estado: Disponível → Reservado → Retirado → Devolvido → Disponível, implementado como transições de botão (Retirar/Devolver/Cancelar) na própria lista de empréstimos, não como páginas separadas tipo Solicitar/Checkout/Checkin de veículos
- [x] Duas coleções: `equipamentos` (catálogo, `{ nome, tipo, patrimonio, status, ativo }`) e `emprestimosEquipamentos` (`{ protocolo, equipamentoId, equipamentoNome, equipamentoPatrimonio, responsavelId, responsavelNome, responsavelSetor, motivo, dataInicio, dataFim, status: "reservado"|"retirado"|"devolvido"|"cancelado" }`)
- [x] `firestore.rules`: leitura pros 3 perfis autenticados, escrita gestor+usuario (dono do empréstimo avança o próprio status)
- [x] Página compartilhada `src/pages/equipamentos/Equipamentos.tsx` (rota `/equipamentos`, sem perfil fixo) — catálogo, `CalendarioGrade` reaproveitado, lista de empréstimos com ações, cadastro rápido de equipamento pelo gestor
- [x] Terceiro `CalendarioGrade` adicionado ao dashboard do perfil consulta
- [x] Reaproveitou os padrões de Salas (auto-confirmação, checagem de conflito de horário, `CalendarioGrade` genérico) — Fase 1 pagou esse investimento

**Achado durante a implementação — bug real corrigido:** `firestore.rules` só permitia `isGestor()` escrever em `veiculos`, mas `Checkout.tsx`/`Checkin.tsx` (páginas do usuário) sempre dependeram de atualizar `status`/`kmAtual` de `veiculos` ao retirar/devolver um veículo oficial. Esse `updateDoc` falhava com `permission-denied` — bug pré-existente, de antes desta sessão, não causado por nenhuma mudança feita aqui. Corrigido para `isGestor() || isUsuario()`.

- [ ] **Pendente:** teste manual em navegador real
- [ ] **Pendente:** cobertura de teste (unit/e2e) — não escrita ainda

## Fase 4 — Administração ✅ implementada, deployada e com os 13 setores semeados em 2026-07-10

Decisão do usuário: **manter os 3 perfis atuais** (`gestor`/`usuario`/`consulta`) — não expandir para os 6 do plano original (Administrador, Administrativo, Chefia, Servidor). Se um dia isso mudar, é um projeto do tamanho do rename `condutor`→`usuario` da Fase 1, não um ajuste pontual.

- [x] Cadastro de servidores, salas, veículos, equipamentos — **já existiam** de fases anteriores (`gestor/Usuarios.tsx`, `salas/Salas.tsx`, `gestor/Veiculos.tsx`, `equipamentos/Equipamentos.tsx`); o que faltava mesmo era:
- [x] Nova coleção `setores` (catálogo de departamentos da CGE-MS) — leitura pública (o formulário de solicitação de acesso roda sem login), escrita só gestor
- [x] `src/pages/gestor/Setores.tsx` — listar, cadastrar, ativar/desativar
- [x] `src/hooks/useSetores.ts` — hook compartilhado, usado nos dropdowns
- [x] Campo "Setor" trocado de texto livre para dropdown em `Usuarios.tsx` (2 modais) e `SolicitarAcesso.tsx`
- [x] **Gap real corrigido:** desde que o perfil `consulta` foi criado na Fase 1, não existia nenhum jeito de criar uma conta com esse perfil pela UI — o cadastro manual só criava `usuario`. Adicionado seletor de perfil no modal "Novo Usuário"; a lista agora mostra contas `usuario` e `consulta` juntas, com badge de perfil
- [x] `tsc`, `vite build`, `vitest run` conferidos — sem regressão nova

**Os 13 setores reais da CGE-MS** foram semeados em produção em 2026-07-10 (ver bloco de status de deploy no topo do arquivo).

- [x] Deploy + seed dos 13 setores concluído em 2026-07-10
- [ ] **Pendente:** cobertura de teste — não escrita ainda

## Fase 5 — Dashboard, auditoria e testes ✅ implementada e deployada em 2026-07-10

- [x] **Tela inicial consolidando os módulos**: cards de Salas/Equipamentos/Indenizações adicionados às "Ações Rápidas" dos dashboards de gestor e usuário (antes só existiam na Sidebar, não apareciam na tela inicial). Sem contador agregado, como decidido — só atalhos.

- [x] **Checklist obrigatório revisado em TODAS as telas**, não só as novas:
  - `limit()` explícito adicionado a toda query `getDocs`/`onSnapshot` que não tinha — atingiu a maior parte do app pré-existente (Calendario.tsx, Solicitar.tsx, MinhasSolicitacoes.tsx, Checkin.tsx, Dashboard usuário e gestor, Aprovações, Manutenção, Veículos, Usuários, Relatórios, useSetores). A regra em si só foi escrita no `CLAUDE.md` nesta sessão — o app original nunca a seguiu.
  - **Exceção deliberada**: `Relatorios.tsx` usa `limit(2000)` como backstop, não recorte funcional — a tela existe pra somar o histórico inteiro em CSV, então truncar silenciosamente seria pior que um teto alto.
  - **`CalendarioGrade.tsx` trocado de `onSnapshot` fixo para recarregamento periódico (60s)** — essa era uma decisão já escrita no `CLAUDE.md` desde a Fase 1 ("preferir recarregamento periódico... especialmente na tela pública") mas nunca implementada; o componente aparece na tela de login pública, exatamente o cenário "TV de recepção" que a decisão original mirava.
  - Sidebar (badge de pendentes) manteve `onSnapshot` — é autenticado, só gestor, badge pequeno, risco baixo — mas ganhou `limit(200)`.

- [x] **Revisão de conformidade LGPD** (mapeamento documentado aqui, não uma auditoria externa formal):
  - `veiculosProprios`/`indenizacoes` (dado pessoal/financeiro mais sensível do sistema): corretamente restritos a dono + gestor, `consulta` não vê. Bem desenhado desde a Fase 2.
  - `calendarioPublico`: só campos não-sensíveis, como já era. OK.
  - `salas`/`reservasSalas` e `equipamentos`/`emprestimosEquipamentos`: os 3 perfis autenticados leem tudo, inclusive `responsavelNome`/`motivo` — decisão já tomada e documentada nas Fases 1/3 (não é público-anônimo como carros, então o mirror de campo sensível não se aplicava do mesmo jeito). Revisitado aqui, mantido.
  - ✅ **Achado corrigido em 2026-07-19** (decisão do usuário: "Estender o `calendarioPublico`"): `solicitacoes` e `usos` eram legíveis por **qualquer conta `usuario`**, não só o dono do registro — um condutor conseguia ler `condutorNome`/`destino`/`motivo` de viagens de outros condutores (e, via URL de checkin/checkout, também o registro completo de outro condutor). Corrigido em duas frentes, sem perder o bloqueio de conflito de horário:
    - `firestore.rules`: leitura de `solicitacoes` e `usos` restrita a `isGestor() || (isUsuario() && resource.data.condutorId == request.auth.uid)` — antes era `isGestor() || isUsuario()` (qualquer usuario, sem checar dono).
    - `Solicitar.tsx`: a checagem de conflito de horário (`verificarConflito`) deixou de ler `solicitacoes` (agora bloqueada pela regra acima) e passou a ler `calendarioPublico` — que já tem `veiculoPlaca`/`dataSaida`/`dataRetorno`/`status` sem dado sensível. Pra isso não perder o comportamento de bloquear conflito em solicitações ainda `pendente` (só `aprovada` existia no mirror antes), `Solicitar.tsx` agora também escreve o mirror em `calendarioPublico` **na criação** da solicitação (status `"pendente"`), não só na aprovação — as transições de status seguintes (aprovar/recusar/cancelar/checkout/checkin) já mantinham esse mirror sincronizado desde antes (`Aprovacoes.tsx`, `MinhasSolicitacoes.tsx`, `Checkout.tsx`, `Checkin.tsx`), então não precisaram mudar.
    - `Checkin.tsx`: a leitura de `usos` (`where("solicitacaoId","==",id)`) precisou ganhar também `where("condutorId","==",usuario.uid)` — o Firestore exige que toda query multi-documento inclua explicitamente o campo usado na regra de segurança (não avalia "por resultado", rejeita a query inteira se não conseguir provar de antemão que todo resultado possível bate com a regra). Exigiu importar `useAuth` no componente (não usava antes).
    - Auditado manualmente (a suíte de teste usa mocks sem simulação de regra, então não detectaria uma regressão de permissão) todo ponto do código que lê `solicitacoes`/`usos`: os únicos dois lugares com query multi-documento não escopada por `condutorId` eram justamente `Solicitar.tsx` (corrigido, trocado de coleção) e `Checkin.tsx` (corrigido, ganhou o `where`); os demais (`Dashboard.tsx`/`MinhasSolicitacoes.tsx` do usuario) já filtravam por `condutorId`; os de gestor (`Aprovacoes.tsx`, `gestor/Dashboard.tsx`, `Calendario.tsx`, `Relatorios.tsx`, `Sidebar.tsx`) continuam de leitura ampla, sem mudança — `isGestor()` já tinha acesso irrestrito e continua tendo.
    - Verificado: `tsc -b` sem erro, **141/141 Vitest** e **160/160 e2e** passando sem nenhuma mudança de teste necessária, `vite build` concluído sem erro novo.
    - **Pendente:** deploy de `firestore.rules` em produção (rodar `firebase deploy --only firestore:rules` ou aguardar o próximo push passar pelo CI/CD, que já inclui esse target).
    - **Achado secundário, não corrigido (fora do pedido original):** a regra de escrita de `calendarioPublico` (`allow write: if isGestor() || isUsuario();`) permite que qualquer `usuario` escreva/apague **qualquer** documento da coleção, não só os relacionados às próprias solicitações — diferente de `reservasSalas`/`emprestimosEquipamentos`, que escopam por `responsavelId == uid`. Como `calendarioPublico` só tem campos não-sensíveis, o risco é de vandalismo no calendário público (esconder/alterar reserva alheia), não de vazamento de dado pessoal — registrado aqui, não corrigido agora.

- [ ] **Testes de carga leve simulando volume real** — avaliado e **deliberadamente não construído**: a frota tem 3 veículos, 3 salas, poucos equipamentos, <5 indenizações/dia — não existe infraestrutura de teste de carga no projeto (sem k6/artillery), e construir isso do zero pra um volume tão pequeno não se paga. O risco real que o `CLAUDE.md` já identifica ("não é volume de uso, é bug de listener") foi endereçado pelo item de checklist acima, que é a mitigação que importa de verdade nessa escala.

- [ ] **Pendente:** cobertura de teste (Fases 1–5) segue pendente, acumulada das fases anteriores — deploy e seed dos 13 setores (Fase 4) já concluídos, ver bloco de status no topo

## Lacunas conhecidas — confirmar antes de codar o que depende disso

- ~~Campos do Anexo II do Decreto Estadual nº 10.154/2000~~ — resolvido em 2026-07-10, ver Fase 2
- ~~E-mail institucional do RH/Contabilidade~~ — resolvido em 2026-07-10 (`suad@cge.ms.gov.br`)
- ~~URL do Web App do Apps Script~~ — resolvido e testado em 2026-07-10, guardado em `.env`

Nenhuma lacuna conhecida pendente — Fase 2 liberada para implementação (Storage, PDF, upload, chamada ao Apps Script).
