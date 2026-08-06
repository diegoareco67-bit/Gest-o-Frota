import { cor, texto, peso, espaco } from "../design/tokens";
import { base } from "../design/estilos";

/**
 * Estado vazio padronizado.
 *
 * Antes o sistema tinha três padrões convivendo: texto seco ("Nenhum equipamento
 * cadastrado ainda."), emoji gigante de 48px + texto, e composição título+subtítulo.
 * Nenhum explicava como popular a tela. Este componente unifica os três e abre
 * espaço para uma ação.
 */

interface Props {
  /** Ícone do módulo — use os de `Icone.tsx`, nunca emoji */
  icone?: React.ReactNode;
  titulo: string;
  /** Explica como popular a tela — é o que faltava nos estados antigos */
  descricao?: string;
  acao?: { rotulo: string; aoClicar: () => void };
  /** `compacto` para caber dentro de cards menores */
  compacto?: boolean;
}

export function EstadoVazio({ icone, titulo, descricao, acao, compacto = false }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compacto ? `${espaco.x6}px ${espaco.x4}px` : `${espaco.x10}px ${espaco.x6}px`,
        gap: espaco.x2,
      }}
    >
      {icone && (
        <div
          style={{
            width: compacto ? 36 : 48,
            height: compacto ? 36 : 48,
            borderRadius: "50%",
            background: cor.fundo,
            border: `1px solid ${cor.borda}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: cor.textoMinimo,
            marginBottom: espaco.x1,
          }}
        >
          {icone}
        </div>
      )}

      <div style={{ fontSize: compacto ? texto.md : texto.lg, fontWeight: peso.forte, color: cor.texto }}>
        {titulo}
      </div>

      {descricao && (
        <div style={{ fontSize: texto.base, color: cor.textoFraco, maxWidth: 380, lineHeight: 1.5 }}>
          {descricao}
        </div>
      )}

      {acao && (
        <button type="button" onClick={acao.aoClicar} style={{ ...base.btnPrimario, marginTop: espaco.x3 }}>
          {acao.rotulo}
        </button>
      )}
    </div>
  );
}
