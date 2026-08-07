# Plano de fases — Hub (Central de Recursos Compartilhados)

Lista de tarefas viva. Atualizar conforme o progresso — não é histórico congelado. Contexto estável (restrições, decisões de arquitetura) está em [`CLAUDE.md`](./CLAUDE.md).

## ✅ Correções 1 a 3 — APLICADAS em 2026-08-07

Os três problemas abaixo foram levantados em 2026-08-06 e **corrigidos**. O texto original
do diagnóstico foi mantido para registro; a solução de cada um está marcada como ✅.

### ✅ 1. E-mail de definição de senha vinha em INGLÊS — CORRIGIDO

**Solução:** `auth.languageCode = "pt-BR"` em `src/firebase/config.ts`, logo após o `getAuth()`.
Passa a servir a versão pt-BR do template do Firebase nos **três** pontos que disparam e-mail
(aprovação de solicitação, cadastro manual e "esqueci minha senha").

**Ainda vale fazer (não bloqueia):** customizar o texto em Firebase Console → Authentication →
Templates, para assinar como CGE-MS/Hub em vez do texto genérico do Firebase. O `languageCode`
resolve o idioma, não a identidade institucional.

### ✅ 2. Entrada de data/hora ruim e inconsistente — CORRIGIDO

**Solução em duas peças:**
- **`src/utils/periodo.ts`** — validação compartilhada: intervalo, duração máxima, início no
  passado e horizonte futuro. Uma função só (`validarPeriodo`), usada por todos os módulos.
- **`src/components/CampoPeriodo.tsx`** — componente único de início/fim, com:
  - validação **enquanto digita** (o erro aparece antes de tentar salvar, não depois)
  - resumo da duração em texto ("Duração: 2 dias e 4h · máximo permitido: 7 dias")
  - atalhos de duração (1h/2h/4h/8h) que preenchem os dois campos de uma vez
  - `min`/`max` nos inputs, o que impede o seletor nativo de aceitar ano absurdo
  - formatação pt-BR garantida via `formatarDataHoraBR`, independente do locale do SO

Aplicado em **Solicitar (veículos)**. Salas, Equipamentos e Indenizações passaram a usar a
mesma função de validação (mantendo os campos atuais, que já são adequados: data única +
hora início/fim limita a um dia por construção).

### ✅ 3. Reserva sem limite de duração — CORRIGIDO

**O problema real:** em teste de uso, um usuário reservou um veículo por **~100 anos**. A causa
estava em `Solicitar.tsx`: dois `datetime-local` independentes, e a única checagem era
"retorno > saída" — nada limitava a duração nem o horizonte.

**Solução em três camadas:**
1. **Limite de duração** — `MAX_DIAS_RESERVA = 7` para veículos; 1 dia para salas e
   equipamentos; 30 dias para o Anexo II (que é retroativo, registro de viagem já ocorrida).
2. **Horizonte futuro** — no máximo 12 meses de antecedência, o que pega o erro de digitação
   no ano (2026 → 2126) mesmo quando a duração calculada "parece" válida.
3. **Regra do Firestore** (`periodoSao`) — barreira real, não só cliente, seguindo o princípio
   já registrado no `CLAUDE.md`. Como as datas são texto ISO e a regra não faz aritmética de
   data sobre string, a regra garante o limite **absoluto** (nada além de 2 anos à frente),
   que é exatamente o caso que aconteceu. A duração exata fica no cliente.

**Cobertura:** `src/__tests__/periodo.test.ts` — 20 testes, incluindo o caso reportado
(reserva até 2126) e os limites de borda (exatamente 7 dias passa, 8 dias não).

**Efeito colateral encontrado ao rodar a suíte:** três testes usavam datas fixas de 2025 e um
usava "hoje às 14h" — todos passaram a falhar corretamente, já que a validação agora rejeita
o passado. O de "hoje às 14h" era pior: só quebrava se a suíte rodasse depois das 14h. Todos
migrados para datas futuras calculadas em tempo de execução, que não apodrecem.

**Bug meu, corrigido junto:** o refactor de emojis (commit `bd9a0ec`) tinha inserido JSX dentro
de literais de string em três pontos — `Solicitar.tsx` (aviso de CNH vencendo) e `Checkin.tsx`
(rótulos "Normal"/"Multa"). Apareceria para o usuário como o texto cru `<IcoAlerta tam={14}/>`.
O script tratava aspas mas não crase; nenhum teste pegou porque nenhum exercitava esses textos.

---

## ⏳ PENDÊNCIAS ABERTAS

### 4. Termo de Opção (Anexo I) diverge do modelo do decreto e não é digital

**Problema de texto** — o PDF gerado (`src/utils/pdfIndenizacao.ts`, `gerarPdfAnexoI`) traz:

> `Assinatura da Autoridade Concedente (Secretário de Estado, Procurador-Geral ou Diretor-Presidente)`

O Anexo I do Decreto nº 10.154/2000 não tem esse parêntese explicativo. O modelo oficial é:

```
(Assinatura do Servidor)
______________________________
Nome do Servidor

APROVADO EM ____/_____/_______

(Assinatura da Autoridade Concedente)
_____________________________________
Nome/Cargo da Autoridade Concedente
```

**Divergências a corrigir:**
- Tirar o parêntese explicativo do rótulo da autoridade concedente
- O rótulo `(Assinatura do Servidor)` / `(Assinatura da Autoridade Concedente)` vai **acima** da
  linha; **abaixo** dela vai o nome (`Nome do Servidor`, `Nome/Cargo da Autoridade Concedente`).
  Hoje o código põe o rótulo abaixo e não imprime nome nenhum.
- `Aprovado em:` → `APROVADO EM` (caixa alta, como no decreto)

**Problema de fluxo — precisa ser 100% digital.** Hoje o servidor baixa o PDF, assina fora do
sistema e faz upload do arquivo assinado. Precisa ficar fácil de preencher e assinável
digitalmente por **duas** vias:
- **gov.br** — assinador digital federal (fluxo já citado no `CLAUDE.md`, seção 4.4)
- **E-MS** — o sistema estadual, que também tem assinador digital próprio

A definir: se o Hub apenas orienta/linka os dois assinadores mantendo o upload, ou se integra
de fato. Vale checar se o E-MS expõe API de assinatura ou só interface web — isso decide o
tamanho do trabalho.

### 5. Recusa sem justificativa em 2 dos 3 fluxos

O usuário precisa saber **por que** foi recusado para poder corrigir e reenviar. Situação atual:

| Fluxo | Onde | Campo de justificativa | Usuário vê? |
|---|---|---|---|
| Solicitação de **veículo** | `gestor/Aprovacoes.tsx` | ✅ tem, e é obrigatório | ✅ sim, em `MinhasSolicitacoes.tsx` |
| Solicitação de **acesso** | `gestor/Usuarios.tsx` (~124) | ❌ não tem — só um `ModalConfirm` | ❌ não há tela onde ver |
| **Anexo I** (veículo próprio) | `indenizacao/GestorIndenizacoes.tsx` (~54) | ❌ não tem — só troca o status | ❌ não |

**A fazer:** replicar nos dois fluxos faltantes o padrão que já funciona em Aprovações —
campo obrigatório de motivo, gravado no documento, exibido para o solicitante.

Dois pontos a decidir:
- **Solicitação de acesso** é feita por quem **ainda não tem conta** — não existe tela logada
  onde ele veria o motivo. Provavelmente precisa ir por e-mail (o Apps Script já é usado para
  notificação de aprovação/recusa de veículo; dá para reaproveitar).
- **Reenvio após correção:** hoje o formulário público tem cooldown de 24h por navegador. Se a
  pessoa foi recusada e precisa corrigir, o cooldown atrapalha — vale liberar o reenvio quando
  a solicitação anterior estiver `recusada`.

---

## ⏳ Diagnóstico original (mantido para registro)

### 1. E-mail de definição de senha vem em INGLÊS (prioridade alta)

**Sintoma:** quando o gestor aprova uma solicitação de acesso (ou cadastra alguém pelo botão "Novo Usuário"), o servidor recebe um e-mail para definir a senha — **em inglês**. É o primeiro contato do servidor com o sistema, num órgão público estadual; precisa estar em português do Brasil.

**Causa confirmada:** o e-mail não é escrito pelo Hub — é o template padrão do Firebase Authentication, disparado por `sendPasswordResetEmail()` em `gestor/Usuarios.tsx` (linhas ~112 e ~147) e em `components/login.tsx` (~39, fluxo "Esqueci minha senha"). O Firebase serve esse template **em inglês por padrão**; só troca de idioma se `auth.languageCode` for definido. Uma busca por `languageCode` no projeto não retorna nada — ou seja, nunca foi configurado.

**Duas frentes de correção (as duas valem):**
- **No código (rápido):** definir `auth.languageCode = "pt-BR";` em `src/firebase/config.ts`, logo após o `getAuth()`. Faz o Firebase servir a versão em português do template padrão. Resolve o idioma, mas o texto continua genérico ("Follow this link to reset...") e assinado como o projeto Firebase.
- **No Console (recomendado para produção):** Firebase Console → Authentication → Templates → *Password reset*. Permite reescrever o assunto e o corpo com a identidade do Hub/CGE-MS, ajustar o nome do remetente e o "responder para". Ideal para comunicação institucional.

**Atenção ao testar:** o mesmo template é usado nos três pontos (aprovação de solicitação, cadastro manual e "esqueci minha senha") — conferir os três depois de mudar.

### 2. Entrada de data e hora está ruim e inconsistente

**Sintoma:** informar horário no sistema é desconfortável. Não é uma tela só — o problema está espalhado.

**Diagnóstico — hoje convivem 3 padrões diferentes:**
| Padrão | Onde | Problema |
|---|---|---|
| `datetime-local` (data+hora num campo) | Indenizações (Anexo II): início autorizado, retorno previsto | O seletor nativo muda muito de navegador para navegador; digitação é confusa |
| `date` + `time` + `time` (3 campos) | Salas, Equipamentos | Obriga preencher três campos para marcar um intervalo simples |
| só `date` | Manutenção (previsão), Solicitar Acesso (venc. CNH, publicação) | OK para data pura, mas o formato exibido depende do locale do SO |

**Problemas concretos identificados:**
- **Sem validação de intervalo na entrada:** dá para escolher hora de fim anterior à de início; o erro só aparece depois, na submissão.
- **Sem atalhos:** para reservar "amanhã das 14h às 15h" o usuário digita tudo manualmente. Faltam blocos rápidos (30min/1h/manhã/tarde) e "próxima hora cheia".
- **Depende do locale do sistema operacional:** o campo nativo pode exibir `mm/dd/aaaa` em máquina configurada em inglês, o que é grave num sistema em pt-BR.
- **Inconsistência entre módulos:** reservar uma sala e pedir uma indenização usam mecânicas diferentes para a mesma tarefa (marcar um intervalo de tempo).

**Direção sugerida (a decidir):** criar um componente único `<CampoPeriodo>` que encapsule data + hora início + hora fim, com validação de intervalo embutida, presets de duração e formato pt-BR garantido — e usá-lo em Salas, Equipamentos, Indenizações e Solicitar Veículo. Resolve os quatro problemas de uma vez e segue o mesmo princípio já aplicado no refactor de design (componente compartilhado em vez de repetição por tela).

---

## ✅ Revisão de design aplicada — sistema de design criado (2026-08-06)

Revisão feita com a skill `advanced-design-systems` apontou 11 problemas; **todos aplicados**.
Antes de mexer em qualquer tela foi gerado um **baseline visual** (marco HubCGE 1.0, 30 telas
em `C:\Users\barbarah\Documents\HubCGE`), e depois um marco 1.1 para comparação — se algo
regredir visualmente, o 1.0 é o ponto de retorno.

**Arquivos novos (a fundação):**
- `src/design/tokens.ts` — cor, raio, tipografia, espaço, elevação, layout. **Nenhum hex novo deve ser escrito solto em componente daqui pra frente.**
- `src/design/estilos.ts` — estilos compartilhados (`base`), `badgeEstado`, `gridAuto()`
- `src/components/Icone.tsx` — ~30 ícones SVG estilo Lucide
- `src/components/Skeleton.tsx` — `Skeleton`, `SkeletonLista`, `SkeletonTabela`, `SkeletonGrade`
- `src/components/EstadoVazio.tsx` — estado vazio padronizado

**Os 11 itens:**
1. **Tokens centralizados** — 82 cores hex soltas em 16 arquivos → 70, todas derivadas dos tokens.
2. **Regra Lila** — roxo decorativo (`#7C3AED`/`#5b21b6`/`#ede9fe`) em 12 pontos → zero; accent único é o azul institucional `#1E3A8A`.
3. **Shape Consistency Lock** — 7 escalas de `border-radius` (6/8/10/12/14/16/99) → 4 (6, 8, 12, pill).
4. **Feedback tátil** — de 130 botões só 6 reagiam ao mouse. **Causa raiz: estilo inline não suporta pseudo-classe.** Resolvido com ~15 linhas de CSS global em `index.css` (`button:hover`, `:active` com `scale(.985)`, `:focus-visible`, `:disabled`) — cobre os 130 de uma vez, sem reescrever componente.
5. **Loading** — 21 telas com "Carregando..." em texto puro → skeletons que imitam o formato do conteúdo final.
6. **Empty states** — 3 padrões convivendo (texto seco / emoji 48px / composição) e nenhum explicava como popular a tela → `<EstadoVazio>` único, com descrição orientando o próximo passo.
7. **Duplicação** — 16 arquivos repetiam `page`/`topbar`/`card`/`input`/`btnPrimario` com valores divergentes → `src/design/estilos.ts`.
8. **Emoji como ícone** — 114 emojis substituídos por SVG. Dois deles (🛻 e 🪪) são emojis recentes que **viram quadradinho no Windows 10** — problema que este projeto já tinha documentado.
9. **Código morto** — `src/App.css` (boilerplate do Vite, nunca importado) removido. **Efeito colateral importante:** todas as media queries do projeto estavam nesse arquivo morto, ou seja, o app tinha **zero responsividade ativa**.
10. **Responsividade** — tabelas passaram a rolar dentro do próprio card (`.tabela-rolavel`), topbar empilha em telas estreitas, e `prefers-reduced-motion` respeitado.
11. **Escala tipográfica** — tamanhos ad-hoc (9, 11.5, 12.5, 17, 19, 22, 26...) → escala de 7 níveis.

**Decisão de escopo:** as cores de estado (verde/vermelho/âmbar/azul/neutro) foram **mantidas** — são semânticas (comunicam situação do dado), não decorativas. O que foi eliminado foi a variedade sem significado: sidebar arco-íris (cada ícone com uma cor), avatares sorteando entre 6 cores, e uma cor por tipo de ação na trilha de auditoria (agora a cor vem da *natureza* da ação: aprovação, recusa, criação, alteração, devolução).

**Verificado:** `tsc -b` limpo, **141/141 Vitest**, **190/190 e2e**, `vite build` OK, lint 0 erros.
Um teste e2e precisou de ajuste (`indenizacao.spec.ts`) — ele localizava a aba pelo emoji `💰`,
que deixou de existir; passou a escopar por `main` (o texto "Indenizações" também é item da Sidebar).

- [ ] **Pendente:** deploy — o CI/CD dispara sozinho no push para `main`.

## ✅ Valor do km da indenização parametrizado (dívida técnica fechada) — 2026-08-06

Item de "evolução futura" identificado na auditoria de homologação (custo/benefício não compensava até então — reajustes do Decreto 10.154/2000 são raros) — implementado a pedido do usuário.

**Problema:** o valor de R$ 0,80/km (Decreto 10.154/2000, redação do Decreto nº 12.606/2008) estava fixo direto em `src/utils/pdfIndenizacao.ts`. Se o decreto fosse reajustado de novo, exigiria deploy de código em vez de o gestor simplesmente editar um campo.

**Solução, seguindo o mesmo padrão já usado para `setores` (Fase 4):**
- Novo doc único `configuracoes/indenizacao` (`{ valorPorKm, atualizadoEm, atualizadoPor }`) no Firestore — não uma coleção inteira, é um valor só.
- `firestore.rules`: leitura pros perfis `gestor`/`usuario` (o usuário precisa do valor pra calcular o Anexo II no formulário), escrita só `gestor`.
- `src/hooks/useConfiguracaoIndenizacao.ts` (novo) — mesmo molde do `useSetores.ts`: busca o valor no mount, cai num fallback de segurança (`VALOR_KM_PADRAO = 0.8`, exportado de `pdfIndenizacao.ts`) se o doc não existir ou a leitura falhar.
- `src/utils/pdfIndenizacao.ts`: `calcularValor()` e `gerarPdfAnexoII()` passaram a receber `valorPorKm` como parâmetro (com o fallback como default), em vez de usar a constante `VALOR_KM` fixa internamente.
- `src/pages/gestor/Configuracoes.tsx` (nova tela) — único campo "Valor por km rodado (R$)" + botão salvar; rota `/gestor/configuracoes`, item novo "Configurações" na Sidebar (seção GESTÃO, ícone engrenagem). Toda alteração é registrada via `registrarAuditoria("alterar_configuracao", ...)` — novo valor da união `AcaoAuditoria`, com rótulo amigável em `gestor/Auditoria.tsx`.
- `src/pages/indenizacao/Indenizacoes.tsx` e `GestorIndenizacoes.tsx` atualizados pra usar o hook.
- **Bug latente corrigido de quebra:** as duas telas de indenização recalculavam o valor de boletins *já enviados* a partir de `totalKmRodados × constante`, em vez de ler o campo `valorTotal` já gravado no documento no momento do envio. Isso era inofensivo enquanto o valor nunca mudava, mas quebraria a exibição de boletins antigos assim que o valor fosse parametrizado (mostraria o valor **novo** aplicado a viagens **antigas**). Corrigido pra exibir `i.valorTotal ?? calcularValor(...)` (usa o valor histórico gravado; recalcula só como fallback pra registros sem o campo).
- Verificado: `tsc -b` limpo, **141/141 Vitest**, **190/190 e2e** (mock `configuracoes/indenizacao` seedado em `src/firebase/__mocks__/firestore.ts`), `npm run lint` limpo (0 erros — 1 falso positivo da regra experimental `react-hooks/set-state-in-effect` suprimido pontualmente com comentário, mesmo padrão de fetch-no-mount já usado sem erro em `Setores.tsx`/`VeiculoProprio.tsx`).
- **Pendente:** deploy (`firestore:rules` + `hosting`) — ainda não enviado ao GitHub/CI nesta sessão.

## ✅ Uso real em produção — "e-mail de solicitação de acesso não chega" investigado (2026-08-02)

Usuário testou `/solicitar-acesso` em produção como um servidor externo simulado, duas vezes, e o e-mail nunca chegou. **Não é bug** — é comportamento por design mal comunicado: `SolicitarAcesso.tsx` só grava o documento em `solicitacoesAcesso` (status `"pendente"`); nenhum e-mail é disparado nesse momento. O e-mail (`sendPasswordResetEmail`) só é enviado quando um **gestor aprova** a solicitação em `gestor/Usuarios.tsx` — como ninguém aprovou as duas solicitações de teste, era esperado que nada chegasse. A tela de sucesso já mencionava isso, mas de forma discreta.

Erro relatado à parte ("Algo deu errado", ErrorBoundary) na primeira tentativa: não encontrada nenhuma falha de código na página (o hook `useSetores` já trata erro sem quebrar a UI); avaliado como provável chunk JS desatualizado no cache do navegador logo após deploy (code-splitting por rota) — resolvido com o refresh que o usuário já fez, sem necessidade de mudança de código.

Correções aplicadas:
- **`src/pages/SolicitarAcesso.tsx`**: tela de sucesso reescrita para deixar explícito que "nenhum e-mail é enviado agora" e que o envio só ocorre após aprovação do gestor, com aviso pra checar a caixa de spam.
- **Cooldown de 24h contra reenvio repetido** (client-side, via `localStorage` — não dá pra checar duplicata no servidor sem abrir leitura pública de `solicitacoesAcesso`, o que vazaria CNH/matrícula de outros solicitantes): após um envio bem-sucedido, uma nova visita a `/solicitar-acesso` no mesmo navegador mostra a tela de sucesso de novo (com aviso do prazo restante) em vez do formulário, até o cooldown expirar. Não é à prova de burla (limpar o localStorage libera de novo), mas resolve o caso de uso real — clicar "enviar" várias vezes achando que não funcionou.
- Novo `e2e/solicitar-acesso.spec.ts` (3 testes): envio + texto da tela de sucesso, bloqueio dentro do cooldown, liberação após cooldown expirado.
- Verificado: `tsc -b` limpo, **190 e2e** (187 + 3 novos), lint limpo.

## Rumo a 100% — fechamento das ressalvas (2026-07-19)

Após o parecer "Apto com ressalvas", o usuário pediu para fechar todas as ressalvas restantes. Feito por ondas:

- **Polimento técnico:** `firestore.indexes.json` versionado (índice `usuarios` existente + novo `solicitacoes` condutorId/criadoEm que a tela Minhas Solicitações precisa — corrige um índice que faltava em produção); CI passou a deployar `--only firestore` (rules+indexes). Code-splitting por rota (`React.lazy`+`Suspense` no `App.tsx`) — bundle inicial de **1.240 kB → 647 kB** (jsPDF e telas internas fora do carregamento inicial).
- ✅ **Notificação por e-mail — CONCLUÍDO em 2026-08-02** (aprovação/recusa de solicitação de veículo): `src/firebase/notificacoes.ts` chama o mesmo Apps Script (`VITE_APPS_SCRIPT_URL`) com `tipo:"notificacao_solicitacao"`, guardado por `import.meta.env.PROD` (não dispara em dev/e2e). `Aprovacoes.tsx` passou a carregar o e-mail do condutor e a notificar em aprovar/recusar. Trecho colado no `doPost` do Apps Script pelo usuário; a reimplantação gerou uma URL de deployment **nova** (diferente da original) — secret `VITE_APPS_SCRIPT_URL` do GitHub Actions e `.env` local atualizados para a URL nova, e um teste real (`curl` direto ao endpoint) confirmou `{"ok":true}` para os cenários aprovada/recusada, com e-mails recebidos. De quebra, corrigido um teste flaky pré-existente em `Solicitar.test.tsx` (race condition entre `getDocs` assíncrono e a asserção do `<select>`) que travava o CI. **Pendência de segurança residual:** dois tokens de acesso do GitHub (`ghp_...` fine-grained e `github_pat_...` classic) foram colados em texto puro no chat durante o processo — revogar em Settings → Developer settings → Personal access tokens.
- ✅ **Retenção/anonimização (LGPD) — prazos confirmados em 2026-08-02** contra a Resolução CGE/MS n. 133/2025 (Política de Privacidade e Proteção de Dados Pessoais da CGE/MS) e a Tabela de Temporalidade de Documentos das atividades-meio (Decreto Estadual n. 15.721/2021, Anexo III — é essa a tabela aplicável a frota/salas/equipamentos/indenização, por serem atividades-meio, não atividades-fim da CGE). Resumo:
  - **Retenção com conta ativa:** pela vigência do vínculo funcional (Art. 12 da Resolução CGE/MS n. 133/2025 c/c Art. 5º, hipóteses de tratamento).
  - **Retenção após inativação:** **5 anos** — prazo padronizado adotado como único do sistema por segurança jurídica (cobre o item mais conservador da Tabela: itens 4.5.8.9 a 4.5.8.12 do Anexo III do Decreto nº 15.721/2021 — autorização/ocorrência/sindicância de trânsito com veículo oficial, termos de cessão/permissão de uso de bens móveis; itens de guarda mais curta como recibo de vale-transporte, 1-2 anos, ficam dentro desse teto).
  - **Base legal:** Art. 5º, I e II da Resolução CGE/MS n. 133/2025 — cumprimento de obrigação legal (LC Estadual n. 230/2016) e execução de políticas públicas; dispensa consentimento do titular (arts. 7º/11 LGPD, c/c parágrafo único do Art. 5º da Resolução). **Lacuna identificada e reconfirmada em 2026-08-06 (texto oficial obtido e lido na íntegra — PDF do Anexo Único da Resolução CGE/MS n. 133/2025):**
    - O Art. 6º da Política **lista 8 aplicabilidades de tratamento por área** (I. ouvidoria/FalaBR; II. transparência/LAI; III. corregedoria; IV. auditoria; V. governança/compliance de PJ; VI. recursos humanos; VII. execução financeira; VIII. navegação no portal) — **gestão de frota/salas/equipamentos/indenização de transporte não está entre elas.** O Hub opera numa área de fato não mapeada no Art. 6º.
    - **Achado novo (não visto na verificação de 08-02):** o **Art. 12** da Resolução (Seção V, "Duração do tratamento") diz que os dados são eliminados/anonimizados quando atingido o prazo da **"Tabela de Temporalidade de Documentos das atividades-fim"**, com link direto para a Resolução Conjunta SAD/CGE n. 1/2022 (`www.sad.ms.gov.br/wp-content/uploads/2022/06/ResSadCge01_2022.pdf`) — ou seja, **a própria Política da CGE aponta genericamente para a tabela de atividades-fim (auditoria/correição/ouvidoria) como referência de prazo**, e não para o Decreto nº 15.721/2021 (atividades-meio) usado como base técnica pelo Hub. Isso não invalida a escolha técnica feita (frota/salas/equipamentos são inequivocamente atividades-meio, não atividades-fim — a Resolução Conjunta SAD/CGE 1/2022 nem trata dessas matérias), mas reforça que **o Art. 12 da Política ainda não contempla explicitamente qual tabela usar para dados de atividades-meio geridos pela CGE** — combinado com a lacuna do Art. 6º, é o mesmo ponto, só que agora com a redação exata da norma. Vale reportar os dois achados juntos ao encarregado de dados da CGE/MS (`encarregadolgpd@cge.ms.gov.br`, confirmado como canal oficial no Art. 16, §2º da própria Resolução) para complementação futura da Política.
  - **Dados já anonimizados:** sem prazo adicional de guarda como "dado pessoal" (Art. 13 da Resolução — anonimização irreversível tira o dado do escopo da LGPD); o órgão pode reter a trilha técnica anonimizada indefinidamente para fins de auditoria.
  - ✅ **Texto do Aviso de Privacidade atualizado em 2026-08-02** (`src/pages/Privacidade.tsx`, seção "Retenção e anonimização") — passou a citar o prazo confirmado de 5 anos após a inativação da conta, com a fonte normativa (Decreto Estadual nº 15.721/2021, Anexo III), em vez de "prazos propostos". `Usuarios.tsx` (ação `Anonimizar dados (LGPD)`) não precisou de alteração — o diálogo de confirmação já não citava nenhum prazo específico, só os campos apagados. Verificado: `tsc -b` limpo.
  - **Nota de correção (2026-08-06):** uma verificação anterior, feita por busca na internet sem acesso ao PDF oficial, não conseguiu localizar a Resolução CGE/MS n. 133/2025 e levantou a hipótese dela ser uma citação fabricada. **Isso estava errado** — o texto oficial (Anexo Único da Resolução CGE/MS n. 133, de 4 de setembro de 2025, publicado pela própria CGE/MS) foi obtido e lido na íntegra, confirmando que a resolução existe e que a citação já usada no código e neste plano está correta. Fica registrado para não se repetir o alarme falso.
- ✅ **MFA (TOTP) — habilitado em 2026-08-02:** tela `gestor/Seguranca.tsx` (rota `/gestor/seguranca`, item "Segurança (2FA)" no Sidebar) para o gestor ativar/remover 2FA por app autenticador; `login.tsx` ganhou o desafio de código quando a conta tem 2FA (`auth/multi-factor-auth-required` → `getMultiFactorResolver`). Stubs de MFA no mock de auth (senão o import quebraria o e2e). TOTP habilitado no console do Firebase Auth (Sign-in method → Advanced → MFA) e confirmado pelo usuário com "2FA Ativo" na tela — opcional, não forçado, como o relatório recomendou.
- ✅ **`calendarioPublico`/`calendarioPublicoSalas` — falha de escopo de escrita corrigida em 2026-08-02.** Achado da auditoria (item 6 da lista de pendências pós-onda 4): a regra `allow write: if isGestor() || isUsuario()` permitia que qualquer conta `usuario` alterasse ou apagasse o evento de **outro** usuário no calendário público (vandalismo — sem exposição de dado sensível, já que a coleção só tem campos não-identificáveis). Corrigido seguindo o mesmo padrão já usado em `reservasSalas`/`emprestimosEquipamentos` (escopo por `responsavelId`):
  - `firestore.rules`: `calendarioPublico` e `calendarioPublicoSalas` passaram a ter `create`/`update`/`delete` separados — gestor mantém acesso total; `usuario` só pode escrever/apagar o próprio evento (`condutorId`/`responsavelId == request.auth.uid`).
  - Passou a gravar o campo `condutorId` (não é PII, só o uid) no mirror `calendarioPublico` em `Solicitar.tsx` (criação) e `Aprovacoes.tsx` (aprovação — usava `setDoc` sem `merge`, então precisava regravar o campo para não perdê-lo); e `responsavelId` no mirror `calendarioPublicoSalas` em `Salas.tsx` (criação). `Checkout.tsx`/`Checkin.tsx`/`MinhasSolicitacoes.tsx` não precisaram mudar — usam `merge:true` ou já dependiam do campo já gravado na criação.
  - Verificado: `tsc -b` limpo, **187 e2e** (nenhuma quebra), lint limpo.
- ✅ **Prop `pendentes` morta no `Sidebar` — removida em 2026-08-02.** Achado da auditoria (item 7): `SidebarProps` declarava `pendentes?:number`, mas o componente nunca a desestruturava — a contagem já era calculada internamente via `onSnapshot`. Removida da interface; nenhum caller passava essa prop, então não quebrou nada.
- ✅ **Cobertura de teste do fluxo de Storage do Anexo I — escrita em 2026-08-02.** Achado da auditoria (item 5): só havia testes do estado "Anexo I já aprovado" (dado seedado no mock); o fluxo real de `VeiculoProprio.tsx` (gerar PDF → upload do assinado no Storage → criar doc `veiculosProprios`) nunca tinha sido exercitado. Como não existia mock de `firebase/storage` (só `firebase/auth`/`firebase/firestore` eram aliasados em `vite.test.config.ts`), qualquer teste real bateria no Storage de produção — mesma classe de bug já corrigida antes para `firestore`/`auth`. Resolvido:
  - Novo `src/firebase/__mocks__/storage.ts` (mocka `ref`/`uploadBytes`/`getDownloadURL`/`getStorage`, guarda os blobs enviados em memória).
  - Alias `firebase/storage` adicionado em `vite.test.config.ts` (usado tanto pelo Vitest quanto pelo servidor de dev do Playwright em modo teste).
  - Novo servidor de teste `uid-terceiro-servidor` (sem `veiculoProprio` seedado) no mock do Firestore + branch de e-mail `"terceiro"` no mock de auth, para exercitar o cadastro do zero.
  - `e2e/veiculo-proprio.spec.ts` (3 testes novos): exibe o formulário quando não há registro, gera o PDF do Termo de Opção, e o fluxo completo de upload do PDF assinado + criação do registro `pendente`.
  - Verificado: `tsc -b` limpo, **187 e2e** (184 + 3 novos), **141 Vitest** (sem regressão), lint limpo.
- **Verificação geral:** `tsc -b` limpo, **141 Vitest**, **187 e2e**, lint limpo (obrigatório no CI).

## Correções da auditoria técnica (2026-07-19) — em andamento

Após a auditoria de homologação (artifact publicado), correções por onda seguindo o plano aprovado:

### ✅ Onda 1 — regras críticas de segurança (`firestore.rules`)
- **Escalonamento de privilégio fechado** (achado crítico): auto-update de `usuarios/{uid}` agora trava `perfil` e `ativo` — só o gestor muda esses campos. Antes, qualquer conta gravava `{perfil:"gestor"}` em si mesma e virava gestor.
- **`veiculos`/`equipamentos`**: escrita do `usuario` restrita via `diff().affectedKeys().hasOnly([...])` só aos campos de status/km (Checkout/Checkin/empréstimo); gestor mantém escrita total; `delete: false` (antes o `write` amplo permitia deletar).
- **`auditoria`**: create exige `usuarioId == request.auth.uid` (barra autoria forjada).
- **`solicitacoesAcesso`**: guarda de forma no create (campos obrigatórios + tamanhos máximos).

### ✅ Onda 1b — App Check no formulário público (reCAPTCHA v3, gratuito) — CONCLUÍDO e FORÇADO em 2026-07-19
- `src/firebase/config.ts` inicializa App Check com `ReCaptchaV3Provider`, guardado por `import.meta.env.PROD && VITE_RECAPTCHA_SITE_KEY` — **o guard de `PROD` é essencial**: sem ele, o servidor de e2e (Playwright, modo dev) enxergava o secret no CI e tentava atestar contra localhost, quebrando os testes (aconteceu no run #14, corrigido no #15).
- Env `VITE_RECAPTCHA_SITE_KEY` configurado como secret do GitHub Actions; chave reCAPTCHA v3 registrada para os domínios `hubcge.web.app`, `gestaofrotacge530101.web.app` e `.firebaseapp.com`.
- **App Check ativado e em enforcement em produção:** registrado no Firebase Console (chave secreta do reCAPTCHA v3), verificado no monitor (tráfego ao vivo ~100% verificado após o deploy), e **enforcement ligado ("Aplicada") em Cloud Firestore e Cloud Storage**. Confirmado com teste de fumaça: login em `hubcge.web.app` e telas com dados (Veículos, Dashboard) carregam normalmente com o enforcement ativo.
- Authentication (App Check pré-lançamento) deixado em "Monitorando" de propósito — forçar o login traria risco por pouco ganho, já que dados/arquivos já estão protegidos.
- Backend não é afetado: Cloud Function e deploy do CI usam Admin SDK / conta de serviço, que não passam pelo App Check.

### ✅ URL de produção migrada para hubcge.web.app (2026-07-19)
O app agora é servido em **`https://hubcge.web.app`** (site de hospedagem `hubcge` adicionado ao mesmo projeto — o ID do projeto Firebase `gestaofrotacge530101` é permanente e não pode ser renomeado). `firebase.json` virou array de hosting: deploy vai para os dois sites (o novo `hubcge` e o antigo `gestaofrotacge530101`, mantido para não quebrar links já divulgados). `hubcge.web.app` é a URL canônica dali em diante.

### ✅ Onda 2 — governança
- **Perfil `auditor` novo** (`types.ts`, `AuthContext`, `RotaProtegida` aceita lista de perfis, `Sidebar`, `App.tsx`, `firestore.rules`) — só leitura de auditoria + relatórios, nenhuma escrita. Landing em `/auditor`.
- **Log de auditoria completado**: `registrarAuditoria` agora é chamado em checkout, checkin, cadastro/edição de veículo, registro/conclusão de manutenção, reserva/cancelamento de sala, reserva/retirada/devolução/cancelamento de equipamento, aprovação/recusa de veículo próprio e envio de indenização (antes só 2 de 10 ações). Union `AcaoAuditoria` estendido.
- **Tela `gestor/Auditoria.tsx`** (nova) — trilha read-only, busca, rótulos amigáveis por ação; visível a gestor e auditor. Item no Sidebar.
- **Criação de conta unificada** (`Usuarios.tsx`): cadastro manual passou a usar senha aleatória descartável + `sendPasswordResetEmail` (o gestor nunca conhece a senha), removido o campo "Senha inicial"; seletor de perfil ganhou "Auditor".
- **Relatórios honestos**: removido o filtro "Tipo" inerte e a afford­ância falsa "Ver relatório →" dos cards (agora informativos); removido o card "Consumo de Combustível" (sem dado de custo por trás).
- **Testes**: 141 Vitest verdes, 176 e2e verdes (7 novos em `e2e/auditoria.spec.ts` cobrindo trilha + perfil auditor + controle de acesso); mocks e fixtures ganharam o perfil auditor e seed de `auditoria`.

### ✅ Onda 3 — LGPD e acessibilidade
- **Aviso de Privacidade** (LGPD, antes ausente): página `src/pages/Privacidade.tsx` (rota pública `/privacidade`) — controlador (CGE-MS), finalidade, base legal (art. 7º III / art. 23), dados tratados, compartilhamento, direitos do titular. Link no rodapé do login + aviso no topo do formulário público de solicitação.
- **Bug pré-existente corrigido de brinde:** `/solicitar-acesso` **não tinha rota registrada** em `App.tsx` — o botão "Solicitar cadastro" caía no catch-all e voltava pro login (o formulário público era inalcançável). Rota registrada.
- **Acessibilidade (WCAG 1.3.1/3.3.2)**: par `htmlFor`/`id` adicionado em todos os formulários (Veiculos, Manutencao, Usuarios, Salas, Equipamentos, Indenizacoes, Solicitar, VeiculoProprio; Setores ganhou `aria-label`) — antes o rótulo não era anunciado pelo leitor de tela ao focar o campo.
- **Modais fecham com Esc**: hook `src/hooks/useEscClose.ts` aplicado ao `ModalConfirm` (cobre todas as confirmações) e aos modais de cadastro de Veiculos/Manutencao/Usuarios/Salas/Equipamentos/Indenizacoes.

### ✅ Onda 4 — manutenibilidade
- **Util `src/utils/conflitoHorario.ts`** (`intervalosSobrepoem`) — extrai a checagem de sobreposição de horário antes triplicada em Solicitar/Salas/Equipamentos.
- **"Lembrar-me" removido** do login (era decorativo — o Firebase Auth já persiste sessão; o checkbox enganava o usuário).
- **Lint no CI**: o script `lint` estava quebrado (sem `eslint.config.js` no repo — ESLint v9 exige flat config). Criado `eslint.config.js` (padrão Vite React-TS, com `_`-ignore e `any` liberado em testes/mocks); ajustados 2 imports mortos; lint passa com 0 erros (3 warnings pré-existentes aceitos). Passo `npm run lint` adicionado ao workflow do CI, agora obrigatório.
- **Verificação final**: `tsc -b` limpo, **141 Vitest**, **180 e2e** (4 novos de LGPD/privacidade em `login.spec.ts`), `npm run lint` limpo.

### Fora de escopo desta rodada (documentado no plano aprovado)
Code-splitting (feito depois, ver "Polimento técnico" em 2026-07-19), paginação com cursor, MFA (feito depois, ver 2026-08-02), ambiente de staging separado — evolução futura (§16 do relatório de auditoria). ~~Parametrizar R$ 0,80/km~~ — feito em 2026-08-06, ver topo do arquivo.

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
- ✅ **Calendário público de Salas na tela de login, 2026-07-19** — pedido do usuário pra dar mais substância ao "hub" além do rebrand visual: a tela de login agora tem abas Veículos/Salas, ambas com dado real (não só o chip estático). Ver seção "Calendário público de Salas" abaixo.
- ✅ **Etiqueta do veículo no calendário público passa a mostrar marca+modelo, 2026-07-19** — usuário notou que a etiqueta só mostrava a placa, sem dar pra identificar visualmente "a Chevrolet" ou "a Fiat Titano". Corrigido em `calendarioPublico` (campo novo `veiculoLabel`); Salas já mostrava `salaNome` (nome real), não precisou mudar.
- ✅ **Dashboard do gestor ganhou o calendário de Salas também, 2026-07-19** — antes só tinha o de Veículos. Agora mostra os dois, empilhados, mesmo padrão do login/consulta.
- ✅ **Manual de Uso da Aplicação — 7 PDFs, um por item de Gestão, 2026-07-19** — novo item no Sidebar (abaixo de Aprovações) leva a uma tela com 7 manuais em PDF (Veículos, Salas, Equipamentos, Manutenção, Usuários, Setores, Indenizações), gerados por script a partir do comportamento real de cada tela. Ver seção "Manual de Uso da Aplicação" abaixo.

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

### ✅ Calendário público de Salas na tela de login — 2026-07-19

Depois do rebrand visual, o usuário pediu pra "aplicar as informações referente aos dois calendários na tela inicial" — ou seja, não só o chip estático de "Salas", mas um calendário público de verdade, igual ao de Veículos já existente.

**Mesma restrição já identificada no rebrand:** `reservasSalas` não é lida sem login (só `gestor`/`usuario`/`consulta`). Resolvido com o mesmo padrão já usado pra veículos — um mirror público novo:

- `firestore.rules`: nova coleção `calendarioPublicoSalas`, `allow read: if true`, escrita por `isGestor() || isUsuario()` (mesmo padrão de `calendarioPublico`). Campos: `salaNome, dataInicio, dataFim, status` — sem `responsavelNome`/`motivo` (LGPD).
- `Salas.tsx`: `reservar()` agora também escreve o mirror em `calendarioPublicoSalas/{id}` (mesmo id da reserva) logo após criar a reserva; `cancelar()` apaga o mirror (mesmo padrão de `deleteDoc` já usado em `Aprovacoes.tsx`/`MinhasSolicitacoes.tsx` pros veículos).
- `login.tsx`: painel direito ganhou abas ("🚚 Veículos" / "🚪 Salas") acima do calendário — troca entre as duas instâncias de `CalendarioGrade` (a de Salas usa `colecao="calendarioPublicoSalas"`, `campoTitulo="salaNome"`, e o mesmo `statusMap`/`statusFiltro` já usados na tela interna de Salas). Aba padrão continua Veículos, sem mudar o comportamento anterior.
- Cobertura nova: 3 testes em `e2e/login.spec.ts` (abas visíveis, calendário de Veículos por padrão, troca pra Salas exibe o título certo).
- Verificado: `tsc -b` sem erro, **141/141 Vitest**, **163/163 e2e** (160 + 3 novos), checagem visual manual (screenshot das duas abas).
- **Equipamentos e Indenização continuam só como chip estático** — não pedido agora; seguiria o mesmo padrão (`calendarioPublicoEquipamentos`) se algum dia for necessário. Indenização não tem "calendário" no sentido de disponibilidade (é fluxo de aprovação individual), então não se aplicaria da mesma forma.

### ✅ Etiqueta do veículo no calendário público — marca+modelo em vez de só placa, 2026-07-19

Depois de ver as duas abas funcionando, o usuário perguntou como diferenciar "a camionete Chevrolet" da "Fiat Titano" no calendário — a etiqueta de cada evento (e o balão ao passar o mouse) mostrava só a placa (`campoTitulo="veiculoPlaca"`, o default do `CalendarioGrade`), o que exige já saber de cor qual placa é qual carro. Salas não tinha esse problema (`campoTitulo="salaNome"` já mostra o nome real da sala).

- `Solicitar.tsx`: ao criar a solicitação, passa a gravar `veiculoMarca`/`veiculoModelo` também no doc de `solicitacoes` (lookup no `veiculos` já carregado pelo `veiculoId` selecionado), e escreve um novo campo `veiculoLabel` (`"${marca} ${modelo}"`) no mirror `calendarioPublico` — decisão do usuário: só marca+modelo, sem a placa junto.
- `Aprovacoes.tsx`: ao aprovar, o mirror escrito por lá também passa a incluir `veiculoLabel`, montado a partir de `sol.veiculoMarca`/`sol.veiculoModelo` (por isso precisou vir do doc de `solicitacoes`, não só do formulário).
- `login.tsx` e `pages/consulta/Dashboard.tsx`: os dois lugares que mostram o calendário de `calendarioPublico` passam a usar `campoTitulo="veiculoLabel"` em vez do default `"veiculoPlaca"`.
- `veiculoPlaca` continua gravado no mirror (não removido) — ainda é usado pelo `where("veiculoPlaca","==",...)` da checagem de conflito em `Solicitar.tsx`.
- Verificado: `tsc -b` sem erro, **141/141 Vitest**, **163/163 e2e**. Não deu pra confirmar visualmente com dado real em produção porque não há reserva ativa agora — calendário fica vazio até a próxima solicitação aprovada, mas a lógica foi conferida por tipo e pelos testes automatizados.
- **Efeito colateral aceito:** mirrors antigos (criados antes desta mudança) não têm `veiculoLabel` — vão aparecer com etiqueta em branco até vencerem/serem substituídos por novas solicitações, que já nascem com o campo preenchido. Não corrigido retroativamente (são poucos registros transitórios, se auto-resolvem).

### ✅ Calendário de Salas no dashboard do gestor — 2026-07-19

Depois de ver os dois calendários funcionando na tela de login, o usuário mandou um print do dashboard interno do gestor (`gestor/Dashboard.tsx`) pedindo os dois ali também — até então só tinha "Calendário de Agendamentos" (só veículos, componente `Calendario.tsx`, que é diferente do `CalendarioGrade` usado nas outras telas: mostra os status reais da solicitação — Pendente/Aprovada/Em Uso/Concluída — lendo `solicitacoes` direto, sem precisar de mirror já que é área autenticada).

- `gestor/Dashboard.tsx`: adicionado um segundo card abaixo do calendário de Veículos, com `CalendarioGrade colecao="reservasSalas"` — mesmo padrão já usado em `Salas.tsx` e `pages/consulta/Dashboard.tsx` (área autenticada lê a coleção real direto, não precisa do mirror público `calendarioPublicoSalas`, que é só pra tela de login sem login).
- Título da seção existente renomeado pra "Calendário de Agendamentos — Veículos" (deixa explícito que é só frota, já que agora tem um segundo calendário logo abaixo).
- Verificado: `tsc -b` sem erro, **141/141 Vitest**, **163/163 e2e**, e checagem visual — login mockado como gestor via `PLAYWRIGHT_TEST=1` no `npm run dev` (sem precisar de credencial real de produção) confirmando os dois calendários empilhados, sem sobreposição, painel de Ações Rápidas intacto.

### ✅ Manual de Uso da Aplicação — 7 PDFs, 2026-07-19

Pedido do usuário: um item de menu "Manual de uso da aplicação" abaixo de Aprovações, com um manual em PDF pra cada um dos 7 itens da seção GESTÃO (Veículos, Salas, Equipamentos, Manutenção, Usuários, Setores, Indenizações).

- **`scripts/gerar-manuais.mjs`** (novo, mantido no repo pra poder regenerar se a UI mudar) — script Node que usa `jsPDF` (já era dependência do projeto, usado em `pdfIndenizacao.ts`) pra montar os 7 PDFs a partir de conteúdo estruturado (objetivo do módulo + seções com passo a passo numerado + caixas de "Atenção"). Roda com `node scripts/gerar-manuais.mjs` e escreve em `public/manuais/`.
- **Conteúdo de cada manual** foi escrito a partir da leitura direta do código de cada tela (`gestor/Veiculos.tsx`, `Salas.tsx`, `equipamentos/Equipamentos.tsx`, `gestor/Manutencao.tsx`, `gestor/Usuarios.tsx`, `gestor/Setores.tsx`, `indenizacao/GestorIndenizacoes.tsx`) — botões, campos obrigatórios e efeitos colaterais reais (ex.: cadastrar manutenção "Agendada" marca o veículo como "Manutenção" automaticamente), não just genérico.
- **Bug real encontrado e corrigido durante a geração:** caracteres fora da codificação padrão da fonte Helvetica do jsPDF (`→`, `✓`, `✕`, `📄`, `⚠`) corrompiam a linha inteira do PDF — texto veio com espaçamento esticado entre letras e cortado no meio, sem quebra de linha correta. As fontes padrão do jsPDF (as "standard 14" do PDF) só suportam WinAnsiEncoding (Latin-1 estendido), não emoji/setas Unicode. Corrigido substituindo `→` por `>` e removendo os emojis dos textos (mantendo só a palavra entre aspas, ex.: `"Aprovar"` em vez de `"✓ Aprovar"`) — acentuação em português (ã, ç, é...) não teve problema, já está dentro do WinAnsiEncoding.
- **`src/pages/gestor/ManualUso.tsx`** (novo) — grid de 7 cards (ícone + título + descrição curta + botão "Baixar PDF" apontando pra `/manuais/<arquivo>.pdf` com atributo `download`) — página estática, sem leitura de Firestore.
- **`App.tsx`**: rota `/gestor/manual`, protegida por `RotaProtegida perfil="gestor"` (mesmo padrão de Aprovações).
- **`Sidebar.tsx`**: novo item "Manual de Uso da Aplicação" na seção PRINCIPAL, logo abaixo de Aprovações (pedido explícito de posição) — novo ícone `manual` (livro) adicionado ao `IcoMap`.
- **Cobertura nova:** `e2e/manual-uso.spec.ts` (6 testes) — título, os 7 cards, os 7 links de download com o `href` correto, um teste que de fato baixa o PDF de Veículos via `request.get()` e confere HTTP 200 (não só que o link existe), navegação pelo Sidebar, e controle de acesso (usuario não acessa `/gestor/manual`, redireciona pra `/usuario`).
- Verificado: `tsc -b` sem erro, **141/141 Vitest**, **169/169 e2e** (163 + 6 novos), checagem visual manual (login mockado como gestor, screenshot da tela).
- **Escopo, por decisão implícita do pedido:** só a área do gestor — o item de menu e a rota são gestor-only, batendo com a seção GESTÃO (que também é exclusiva do gestor). Perfis usuario/consulta não têm um manual equivalente ainda.

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
