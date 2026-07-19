// Notifica o condutor por e-mail quando sua solicitação de veículo é aprovada/recusada.
// Reaproveita o mesmo Web App do Apps Script já usado no módulo de indenização
// (VITE_APPS_SCRIPT_URL) — o doPost lá diferencia pelo campo `tipo`. A chamada nunca
// bloqueia o fluxo: se a URL não estiver configurada, o e-mail faltar, ou a rede falhar,
// apenas registra um aviso no console.
export interface NotificacaoSolicitacao {
  email: string;
  nomeCondutor: string;
  protocolo: string;
  veiculoPlaca: string;
  status: "aprovada" | "recusada";
  motivo?: string;
}

export async function notificarCondutor(dados: NotificacaoSolicitacao): Promise<void> {
  // Só envia no build de produção — evita disparar e-mail/rede real durante os testes
  // e2e (que rodam em modo dev, mas com a URL do Apps Script definida no CI).
  if (!import.meta.env.PROD) return;
  const url = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined;
  if (!url || !dados.email) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ tipo: "notificacao_solicitacao", ...dados }),
    });
  } catch (e) {
    console.warn("[notificacao] falha ao notificar o condutor (não bloqueia a operação):", e);
  }
}
