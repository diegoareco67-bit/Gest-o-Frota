# Notificação por e-mail ao condutor (aprovação/recusa)

O sistema (`src/firebase/notificacoes.ts`) chama o **mesmo Web App do Apps Script** já
usado pelo módulo de indenização (`VITE_APPS_SCRIPT_URL`), enviando um corpo com
`tipo: "notificacao_solicitacao"`. Basta **adicionar um bloco no topo do `doPost`** do seu
Apps Script para tratar esse tipo — o resto do script (envio de indenização ao RH) continua
igual, logo abaixo.

## Trecho a adicionar (logo depois de fazer o `JSON.parse` do corpo)

```javascript
function doPost(e) {
  var dados = JSON.parse(e.postData.contents);

  // ── NOVO: notificação ao condutor (aprovação/recusa de solicitação de veículo) ──
  if (dados.tipo === "notificacao_solicitacao") {
    var assunto = (dados.status === "aprovada")
      ? "Solicitação de veículo APROVADA — Protocolo " + dados.protocolo
      : "Solicitação de veículo RECUSADA — Protocolo " + dados.protocolo;

    var corpo = "Olá, " + dados.nomeCondutor + ".\n\n";
    if (dados.status === "aprovada") {
      corpo += "Sua solicitação do veículo " + dados.veiculoPlaca +
               " (protocolo " + dados.protocolo + ") foi APROVADA.\n" +
               "Você já pode iniciar o uso do veículo pelo sistema Hub.";
    } else {
      corpo += "Sua solicitação do veículo " + dados.veiculoPlaca +
               " (protocolo " + dados.protocolo + ") foi RECUSADA.\n" +
               "Motivo: " + (dados.motivo || "não informado") + ".";
    }
    corpo += "\n\n— Hub CGE-MS · mensagem automática, não responda.";

    MailApp.sendEmail(dados.email, assunto, corpo);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── (resto do doPost existente — envio da indenização ao RH — continua aqui) ──
  // ...
}
```

## Passos

1. Abra o projeto do Apps Script (o mesmo já publicado como Web App).
2. Cole o bloco acima logo após o `JSON.parse(e.postData.contents)`, **antes** da lógica
   de indenização existente.
3. Salve e **reimplante** o Web App (Implantar → Gerenciar implantações → editar → nova versão),
   mantendo a mesma URL.

Enquanto esse trecho não estiver no Apps Script, a aprovação/recusa continua funcionando
normalmente no sistema — só o e-mail ao condutor não é enviado (a chamada falha em silêncio,
sem bloquear nada). O e-mail do RH (indenização) não é afetado.
