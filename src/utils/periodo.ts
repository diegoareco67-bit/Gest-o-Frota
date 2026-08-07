/**
 * Validação de período (data/hora de início e fim).
 *
 * Motivo: em teste de uso real um usuário conseguiu reservar um veículo por
 * ~100 anos. Os campos `datetime-local` de início e fim eram independentes e
 * a única checagem existente era "fim > início" — nada limitava a duração.
 */

/** Duração máxima de uma reserva/solicitação de recurso. */
export const MAX_DIAS_RESERVA = 7;

/** Quão longe no futuro se pode agendar. Barra erro de digitação no ano (2026 → 2126). */
export const MAX_MESES_ANTECEDENCIA = 12;

/** Expediente da CGE-MS. Reserva de recurso compartilhado só vale dentro desta janela. */
export const EXPEDIENTE_INICIO = "07:30";
export const EXPEDIENTE_FIM = "17:30";

/**
 * Granularidade dos campos de hora, em segundos (15 min).
 * Vai no atributo `step` do input — faz o seletor nativo mostrar só 00/15/30/45
 * em vez dos 60 minutos, que era o que deixava a lista enorme e difícil de acertar.
 */
export const PASSO_MINUTOS = 15;
export const PASSO_SEGUNDOS = PASSO_MINUTOS * 60;

/** "HH:MM" → minutos desde a meia-noite. */
function emMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** Valida se um horário "HH:MM" cai dentro do expediente e no passo de 15 min. */
export function validarHorarioExpediente(hora: string): string | null {
  if (!hora) return null;
  const min = emMinutos(hora);
  if (isNaN(min)) return "Horário inválido.";

  if (min < emMinutos(EXPEDIENTE_INICIO) || min > emMinutos(EXPEDIENTE_FIM)) {
    return `O horário deve estar dentro do expediente, das ${EXPEDIENTE_INICIO} às ${EXPEDIENTE_FIM}.`;
  }
  if (min % PASSO_MINUTOS !== 0) {
    return `Use intervalos de ${PASSO_MINUTOS} minutos (00, 15, 30 ou 45).`;
  }
  return null;
}

const MS_DIA = 24 * 60 * 60 * 1000;

export interface OpcoesPeriodo {
  /** Duração máxima em dias (padrão: MAX_DIAS_RESERVA) */
  maxDias?: number;
  /** Permite início no passado — usado em registros retroativos, como o Anexo II */
  permitePassado?: boolean;
  /** Como chamar o período na mensagem de erro ("A reserva", "O empréstimo"...) */
  rotulo?: string;
  /** Exige que início e fim caiam no expediente (07:30–17:30) e no passo de 15 min */
  exigeExpediente?: boolean;
}

/**
 * Retorna a mensagem de erro, ou `null` se o período for válido.
 * Aceita strings ISO ("YYYY-MM-DDTHH:MM") — o formato usado em todo o sistema.
 */
export function validarPeriodo(inicio: string, fim: string, opcoes: OpcoesPeriodo = {}): string | null {
  const { maxDias = MAX_DIAS_RESERVA, permitePassado = false, rotulo = "A reserva" } = opcoes;

  if (!inicio || !fim) return "Informe a data e hora de início e de fim.";

  const ini = new Date(inicio);
  const f = new Date(fim);
  if (isNaN(ini.getTime()) || isNaN(f.getTime())) return "Data ou hora inválida.";

  if (f <= ini) return "O horário final deve ser depois do inicial.";

  const dias = (f.getTime() - ini.getTime()) / MS_DIA;
  if (dias > maxDias) {
    return `${rotulo} não pode passar de ${maxDias} ${maxDias === 1 ? "dia" : "dias"}. `
         + `O período informado tem ${formatarDuracao(ini, f)}.`;
  }

  if (!permitePassado) {
    const agora = new Date();
    // Tolera 5 min de folga: o usuário pode ter aberto o formulário há pouco.
    if (ini.getTime() < agora.getTime() - 5 * 60 * 1000) {
      return "A data de início não pode estar no passado.";
    }
  }

  const limite = new Date();
  limite.setMonth(limite.getMonth() + MAX_MESES_ANTECEDENCIA);
  if (ini > limite) {
    return `Só é possível agendar com até ${MAX_MESES_ANTECEDENCIA} meses de antecedência. Confira o ano informado.`;
  }

  if (opcoes.exigeExpediente) {
    const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const erroInicio = validarHorarioExpediente(hhmm(ini));
    if (erroInicio) return `Início: ${erroInicio}`;
    const erroFim = validarHorarioExpediente(hhmm(f));
    if (erroFim) return `Fim: ${erroFim}`;
  }

  return null;
}

/** Duração em texto legível — usado nas mensagens de erro e no resumo do formulário. */
export function formatarDuracao(inicio: Date | string, fim: Date | string): string {
  const ini = typeof inicio === "string" ? new Date(inicio) : inicio;
  const f = typeof fim === "string" ? new Date(fim) : fim;
  if (isNaN(ini.getTime()) || isNaN(f.getTime())) return "—";

  const min = Math.round((f.getTime() - ini.getTime()) / 60000);
  if (min <= 0) return "—";
  if (min < 60) return `${min} min`;

  const horas = Math.floor(min / 60);
  const restoMin = min % 60;
  if (horas < 24) return restoMin ? `${horas}h${String(restoMin).padStart(2, "0")}` : `${horas}h`;

  const dias = Math.floor(horas / 24);
  const restoHoras = horas % 24;
  const parteDias = `${dias} ${dias === 1 ? "dia" : "dias"}`;
  return restoHoras ? `${parteDias} e ${restoHoras}h` : parteDias;
}

/** "2026-08-07T14:00" → "07/08/2026 14:00" (formato pt-BR, independente do locale do SO). */
export function formatarDataHoraBR(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
