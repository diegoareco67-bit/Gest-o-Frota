import { cor, raio, espaco } from "../design/tokens";

/**
 * Placeholder de carregamento que imita o formato do conteúdo final.
 *
 * Substitui os "Carregando..." em texto puro que existiam em 21 telas — texto
 * solto não comunica o que está vindo nem quanto, e faz a tela "pular" quando
 * o dado chega.
 */

interface SkeletonProps {
  /** Altura da barra em px */
  altura?: number;
  /** Largura CSS (ex.: "100%", 180) */
  largura?: number | string;
  radio?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ altura = 14, largura = "100%", radio = raio.sm, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        height: altura,
        width: largura,
        borderRadius: radio,
        background: `linear-gradient(90deg, ${cor.borda} 25%, ${cor.superficieAlt} 50%, ${cor.borda} 75%)`,
        backgroundSize: "200% 100%",
        animation: "skeletonBrilho 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/** Lista de cards em carregamento — usar onde a tela mostra uma lista vertical. */
export function SkeletonLista({ itens = 3 }: { itens?: number }) {
  return (
    <div role="status" aria-label="Carregando" style={{ display: "flex", flexDirection: "column", gap: espaco.x3 }}>
      {Array.from({ length: itens }).map((_, i) => (
        <div
          key={i}
          style={{
            background: cor.superficie,
            border: `1px solid ${cor.borda}`,
            borderRadius: raio.lg,
            padding: espaco.x5,
            display: "flex",
            flexDirection: "column",
            gap: espaco.x2,
          }}
        >
          <Skeleton altura={12} largura="35%" />
          <Skeleton altura={16} largura="60%" />
          <Skeleton altura={12} largura="45%" />
        </div>
      ))}
    </div>
  );
}

/** Linhas de tabela em carregamento. */
export function SkeletonTabela({ linhas = 4, colunas = 4 }: { linhas?: number; colunas?: number }) {
  return (
    <>
      {Array.from({ length: linhas }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: colunas }).map((_, j) => (
            <td key={j} style={{ padding: `${espaco.x3}px ${espaco.x4}px` }}>
              <Skeleton altura={12} largura={j === 0 ? "60%" : "80%"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Grade de cards em carregamento — para catálogos (veículos, equipamentos, salas). */
export function SkeletonGrade({ itens = 3 }: { itens?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: espaco.x4 }}
    >
      {Array.from({ length: itens }).map((_, i) => (
        <div
          key={i}
          style={{
            background: cor.superficie,
            border: `1px solid ${cor.borda}`,
            borderRadius: raio.lg,
            padding: espaco.x5,
            display: "flex",
            flexDirection: "column",
            gap: espaco.x2,
          }}
        >
          <Skeleton altura={14} largura="70%" />
          <Skeleton altura={11} largura="40%" />
          <Skeleton altura={24} largura="55%" style={{ marginTop: espaco.x2 }} />
        </div>
      ))}
    </div>
  );
}
