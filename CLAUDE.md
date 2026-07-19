# Hub — Central de Recursos Compartilhados (CGE-MS)

Sistema web para o Poder Executivo do Estado de Mato Grosso do Sul (CGE-MS) que centraliza o controle de recursos compartilhados do órgão: veículos, salas de reunião, equipamentos e indenização de transporte.

**Não é um projeto do zero.** Já existe em produção o **FrotaGov** (`https://gestaofrotacge530101.web.app`, Firebase project `gestaofrotacge530101`). O Hub absorve o FrotaGov como módulo **Transportes** — mesmo projeto Firebase, mesmo repositório, mesma identidade visual como ponto de partida. Não recriar do zero, não criar projeto Firebase novo.

Idioma de trabalho: pt-BR.

## Stack confirmada (Fase 0 — auditoria de 2026-07-10)

- React 19.2 + TypeScript + Vite 8 + react-router-dom 7
- Firebase 12: Authentication, Firestore, Storage, Hosting, **Cloud Functions (2ª geração, região `southamerica-east1`)** — plano **Blaze** desde 2026-07-17 (ver decisão abaixo).
- Cloud Function `syncPerfilClaim` (`functions/index.js`) sincroniza `usuarios/{uid}.perfil` como custom claim no token de Auth — usado por `storage.rules` pra evitar chamada cross-service ao Firestore (ver PLANO.md, "Bug do storage.rules").
- Testes: Vitest (unit) + Playwright (e2e), cobertura já existente na maioria das páginas.

## Orçamento: plano Blaze ativo desde 2026-07-17, cartão pessoal, alerta em R$10

A restrição original era "orçamento zero, sem cartão cadastrado" (Spark apenas). Isso mudou:

- ⚠️ **2026-07-17: Firebase passou a exigir plano Blaze pra provisionar Storage pela primeira vez num projeto**, mesmo dentro da cota gratuita — não é mais possível ficar 100% no Spark se o módulo de Indenização (que depende de Storage) for usado.
- **Decisão do usuário:** cadastrou cartão **pessoal** (não institucional) pra fazer o upgrade, ciente do risco de governança (rastreabilidade de gasto público, responsabilização LGPD como controlador de dados, continuidade/propriedade da infraestrutura — discussão completa no histórico de sessão de 2026-07-17). Alerta de orçamento configurado em **R$10** (é um alerta por e-mail, não um bloqueio automático de cobrança).
- **Cloud Functions agora está em uso** (destravado pelo Blaze) — não é mais uma restrição. Antes de adicionar novas functions além de `syncPerfilClaim`, ainda vale considerar custo/complexidade, mas a barreira "exige Blaze" não existe mais.
- Qualquer automação de backend que não precise rodar no servidor (ex.: envio de e-mail) continua preferindo **Google Apps Script publicado como Web App** como proxy HTTP gratuito — `MailApp` para e-mail, `UrlFetchApp` para buscar arquivo por URL. Rodar a partir de conta institucional, nunca Gmail pessoal.

## Decisões de arquitetura fechadas — não reabrir esses debates

**Volume de uso é baixo, não otimizar prematuramente.** Frota: 3 carros. Salas: 3 salas, usadas todo dia. Indenização: <5 pedidos/dia. Cota gratuita do Firestore (20 mil escritas / 50 mil leituras por dia, projeto inteiro) tem folga enorme. Nenhuma tela precisa de contador agregado — cada tela consulta o Firestore diretamente no carregamento. Não implementar cache de contagem nem documento de estatísticas mantido por trigger.

**Dois calendários, mesmo componente visual, fontes e regras diferentes.**
- Carros: público, sem login (já existe — grade mensal, legenda Disponível/Em uso/Manutenção/Livre).
- Salas: mesmo componente visual, atrás do login, leitura restrita a autenticado.
- Construir **um componente de calendário único e reutilizável**, parametrizado pela coleção de origem e pela regra de acesso — não duplicar UI.
- Preferir **recarregamento periódico (~60s)** a `onSnapshot` permanente, especialmente na tela pública (risco de listener aberto indefinidamente numa tela sem controle de audiência, ex. TV de recepção).
- ⚠️ Achado da Fase 0: o componente real do calendário público já em produção é `src/components/login.tsx` (função interna `CalendarioPublico`, lê a coleção `calendarioPublico`). **Não usar** `src/pages/CalendarioPublico.tsx` como base — é código órfão (não roteado em `App.tsx`) e lê a coleção errada (`solicitacoes`, que exige auth).

**Regras do Firestore: separar campo público de campo sensível.** No calendário público de carros a leitura pode liberar `status`/`horário`, nunca nome do servidor, matrícula ou destino no mesmo documento de leitura pública. Já implementado assim hoje via a coleção espelho `calendarioPublico` (doc ID = ID da solicitação, criado/atualizado via `setDoc(..., {merge:true})` a partir de `solicitacoes`). Repetir esse padrão de coleção-espelho ao desenhar o schema de Salas.

**Fluxo de indenização de transporte e notificação ao RH** (Fase 2, ver PLANO.md):
1. Servidor preenche formulário (Anexo I — cadastro do veículo, uma vez — e Anexo II — Boletim de Viagem, por deslocamento — do Decreto Estadual nº 10.154/2000; campos exatos confirmados em 2026-07-10, ver `PLANO.md` Fase 2), sistema gera PDF client-side (`jsPDF` ou `pdf-lib`). Valor vigente do km: R$ 0,80 (não o R$0,40 impresso no formulário original de 2000).
2. Servidor baixa o PDF, assina pelo Gov.br (fora do sistema, sem integração direta), volta e faz upload do PDF assinado.
3. Sistema grava o PDF no Storage e registra metadado (data, usuário, versão, hash SHA-256 via `crypto.subtle.digest`) no Firestore.
4. Cliente chama o Web App do Apps Script passando a **URL do arquivo** (não o PDF inteiro) + metadados.
5. Apps Script busca o arquivo (`UrlFetchApp`) e envia por e-mail, **com o PDF anexado** (decisão explícita: manter anexo no e-mail, não só link), para `suad@cge.ms.gov.br` (RH/Contabilidade, confirmado em 2026-07-10).
6. Status do pedido rastreado no Firestore para consulta dentro do Hub.
7. Envio ao sistema de ofícios/processos eletrônicos do órgão continua manual — sem integração direta.

QR code, hash e PDF: **100% client-side**, nenhum depende de servidor.

## Checklist obrigatório antes de qualquer tela ir para produção

Defesa contra o principal risco real de estourar a cota gratuita: não é volume de uso, é bug de listener.

- [ ] Todo `onSnapshot` tem função de limpeza (`unsubscribe`) chamada no unmount/saída da tela.
- [ ] Nenhum listener é recriado sem fechar o anterior primeiro.
- [ ] Toda query tem `.limit(N)` explícito — nunca "traga tudo da coleção".
- [ ] Tempo real (`onSnapshot`) só onde de fato compensa; padrão default é recarregamento periódico.
- [ ] Regras do Firestore são a barreira de segurança real — nunca confiar só em validação no cliente.
- [ ] Regra de leitura pública (calendário de carros) expõe só os campos não sensíveis.

## Escopo dos módulos

| Módulo | Status |
|---|---|
| Transportes | Já existe (FrotaGov) — absorver como está, não recriar |
| Indenização de Transporte | A construir — depende do Decreto 10.154/2000, PDF, hash, e-mail |
| Salas | A construir — piloto, reaproveita calendário de Transportes |
| Equipamentos | A construir — fluxo Disponível → Reservado → Retirado → Devolvido → Disponível |
| Administração | A construir — cadastro de servidores/setores/salas/veículos/equipamentos/perfis |
| Dashboard | A construir — sem contador agregado (ver decisão de volume acima) |

Perfis de acesso (visão de longo prazo, do documento original): Administrador, Administrativo, Gestor, Chefia, Servidor, Consulta — permissões específicas por módulo, a detalhar conforme construção.

**Implementação atual:** 4 perfis existem no código — `"gestor" | "usuario" | "consulta" | "auditor"` (`src/types.ts`). O antigo perfil `"condutor"` foi renomeado para `"usuario"` porque agora reserva salas além de veículos; `"consulta"` é só leitura, só vê calendários; `"auditor"` (adicionado em 2026-07-19 na correção da auditoria — segregação de função) é só leitura da trilha de auditoria e dos relatórios, sem nenhuma permissão de escrita nem tela de gestão. Os demais perfis Administrador/Administrativo/Chefia/Servidor do documento original seguem sem implementação — quando chegar a Fase 4 (Administração), decidir se viram variações de `"usuario"`/`"gestor"` ou perfis novos de verdade.

## Identidade visual

Nome **Hub**, subtítulo "Central de Recursos Compartilhados". Visual minimalista institucional (referência: Microsoft 365, Google Workspace, Atlassian) — cantos arredondados, cartões, sombras leves. Paleta: azul-marinho, azul médio, verde, cinza claro, branco. Calendário aparece na interface, não no logotipo.

## Legislação aplicável

Lei Federal nº 13.709/2018 (LGPD) · Lei nº 12.527/2011 (Lei de Acesso à Informação) · Decreto Estadual nº 10.154/2000 (Indenização de Transporte) · Decreto Estadual nº 15.572/2020 (LGPD no Poder Executivo de MS) · Política Estadual de Segurança da Informação.

## Onde está o plano de fases

O plano faseado (o que já foi auditado, o que falta, ordem de execução) fica em [`PLANO.md`](./PLANO.md), atualizado à mão conforme o progresso — não é conteúdo congelado aqui.
