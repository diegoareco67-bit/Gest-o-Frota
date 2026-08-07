import { useMemo } from "react";
import { cor, raio, texto, peso, espaco } from "../design/tokens";
import { base } from "../design/estilos";
import { validarPeriodo, formatarDuracao, MAX_DIAS_RESERVA, type OpcoesPeriodo } from "../utils/periodo";

/**
 * Entrada de período (início e fim) padronizada.
 *
 * Antes existiam três mecânicas diferentes para marcar um intervalo:
 *  - `datetime-local` em par (Solicitar veículo, Indenizações)
 *  - `date` + `time` + `time` (Salas, Equipamentos)
 *  - só `date` (Manutenção)
 * Nenhuma validava a duração — daí ter sido possível reservar um veículo por ~100 anos.
 *
 * Este componente unifica: mesma mecânica, validação de duração embutida, atalhos de
 * duração e resumo em texto para o usuário conferir antes de enviar.
 */

interface Props {
  inicio: string;                       // "YYYY-MM-DDTHH:MM"
  fim: string;
  aoMudar: (inicio: string, fim: string) => void;
  rotuloInicio?: string;
  rotuloFim?: string;
  idBase: string;                       // prefixo dos ids (acessibilidade)
  opcoes?: OpcoesPeriodo;
  /** Atalhos de duração em minutos. `null` esconde os atalhos. */
  presets?: number[] | null;
}

const PRESETS_PADRAO = [60, 120, 240, 480]; // 1h, 2h, 4h, 8h (expediente)

/** Data/hora local em formato aceito pelo input datetime-local (nunca UTC). */
function paraInputLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function rotuloPreset(min: number): string {
  if (min < 60) return `${min}min`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h}h` : `${Math.floor(h)}h${min % 60}`;
}

export function CampoPeriodo({
  inicio, fim, aoMudar,
  rotuloInicio = "Início", rotuloFim = "Fim",
  idBase, opcoes = {}, presets = PRESETS_PADRAO,
}: Props) {
  const maxDias = opcoes.maxDias ?? MAX_DIAS_RESERVA;

  // Limita o que o seletor nativo aceita — impede digitar o ano errado (2126)
  // antes mesmo da validação, em vez de só reclamar depois.
  const { minAttr, maxAttr } = useMemo(() => {
    const agora = new Date();
    const limite = new Date();
    limite.setMonth(limite.getMonth() + 12);
    return {
      minAttr: opcoes.permitePassado ? undefined : paraInputLocal(agora),
      maxAttr: paraInputLocal(limite),
    };
  }, [opcoes.permitePassado]);

  const erro = inicio && fim ? validarPeriodo(inicio, fim, opcoes) : null;
  const duracao = inicio && fim && !erro ? formatarDuracao(inicio, fim) : null;

  function aplicarPreset(minutos: number) {
    const partida = inicio ? new Date(inicio) : proximaHoraCheia();
    const novoFim = new Date(partida.getTime() + minutos * 60000);
    aoMudar(paraInputLocal(partida), paraInputLocal(novoFim));
  }

  function proximaHoraCheia(): Date {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: espaco.x2 }}>
      <div style={{ display: "flex", gap: espaco.x3, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor={`${idBase}-inicio`} style={base.label}>{rotuloInicio}</label>
          <input
            id={`${idBase}-inicio`} type="datetime-local"
            value={inicio} min={minAttr} max={maxAttr}
            onChange={e => aoMudar(e.target.value, fim)}
            style={base.input}
          />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor={`${idBase}-fim`} style={base.label}>{rotuloFim}</label>
          <input
            id={`${idBase}-fim`} type="datetime-local"
            value={fim} min={inicio || minAttr} max={maxAttr}
            onChange={e => aoMudar(inicio, e.target.value)}
            style={base.input}
          />
        </div>
      </div>

      {presets && (
        <div style={{ display: "flex", gap: espaco.x1, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: texto.xs, color: cor.textoMinimo, marginRight: espaco.x1 }}>Duração rápida:</span>
          {presets.map(min => (
            <button key={min} type="button" onClick={() => aplicarPreset(min)} style={estilo.preset}>
              {rotuloPreset(min)}
            </button>
          ))}
        </div>
      )}

      {/* Devolutiva imediata: o usuário vê a duração antes de enviar, e o erro
          aparece enquanto digita — não só depois de tentar salvar. */}
      {erro ? (
        <div role="alert" style={{ ...base.erro, fontSize: texto.sm }}>{erro}</div>
      ) : duracao ? (
        <div style={estilo.resumo}>
          Duração: <strong style={{ color: cor.texto }}>{duracao}</strong>
          <span style={{ color: cor.textoMinimo }}> · máximo permitido: {maxDias} dias</span>
        </div>
      ) : null}
    </div>
  );
}

const estilo: Record<string, React.CSSProperties> = {
  preset: {
    background: cor.fundo, color: cor.accent,
    border: `1px solid ${cor.borda}`, borderRadius: raio.sm,
    padding: `4px ${espaco.x3}px`, fontSize: texto.xs, fontWeight: peso.forte, cursor: "pointer",
  },
  resumo: {
    fontSize: texto.sm, color: cor.textoSuave,
    background: cor.superficieAlt, border: `1px solid ${cor.borda}`,
    borderRadius: raio.sm, padding: `${espaco.x2}px ${espaco.x3}px`,
  },
};
