import { useMemo } from "react";
import { base } from "../design/estilos";
import { EXPEDIENTE_INICIO, EXPEDIENTE_FIM, PASSO_MINUTOS } from "../utils/periodo";

/**
 * Seleção de horário em lista fechada, no lugar do `<input type="time">`.
 *
 * Motivo: o seletor nativo de hora do navegador não tem botão de confirmação — depois
 * de escolher hora e minuto é preciso clicar fora do campo para o valor ser aceito, o que
 * confunde. Ele também lista os 60 minutos, um a um.
 *
 * Um `<select>` resolve os dois: escolher já confirma (comportamento nativo do select) e
 * a lista só contém horários válidos, de 15 em 15 minutos dentro do expediente.
 */

interface Props {
  id: string;
  valor: string;                    // "HH:MM"
  aoMudar: (valor: string) => void;
  /** Fora do expediente (ex.: viagem que começa de madrugada), passe false */
  apenasExpediente?: boolean;
  /** Não permite escolher horário anterior a este — usado no campo de fim */
  minimo?: string;
  style?: React.CSSProperties;
}

function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function paraHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function CampoHora({ id, valor, aoMudar, apenasExpediente = true, minimo, style }: Props) {
  const opcoes = useMemo(() => {
    const de = apenasExpediente ? paraMinutos(EXPEDIENTE_INICIO) : 0;
    const ate = apenasExpediente ? paraMinutos(EXPEDIENTE_FIM) : 24 * 60 - PASSO_MINUTOS;
    const lista: string[] = [];
    for (let m = de; m <= ate; m += PASSO_MINUTOS) lista.push(paraHHMM(m));
    return lista;
  }, [apenasExpediente]);

  const limite = minimo ? paraMinutos(minimo) : -1;

  return (
    <select
      id={id}
      value={valor}
      onChange={e => aoMudar(e.target.value)}
      style={{ ...base.input, cursor: "pointer", ...style }}
    >
      <option value="">--:--</option>
      {opcoes.map(h => (
        // Horário anterior ao início fica visível mas desabilitado — some da lista seria
        // pior, o usuário não entenderia por que as opções mudaram.
        <option key={h} value={h} disabled={limite >= 0 && paraMinutos(h) <= limite}>
          {h}
        </option>
      ))}
    </select>
  );
}
