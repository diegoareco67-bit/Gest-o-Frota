import type { CSSProperties } from "react";
import { cor, raio, fonte, texto, peso, espaco, sombra, layout } from "./tokens";

/**
 * Estilos compartilhados entre as telas.
 *
 * Antes, 16 arquivos repetiam os mesmos objetos (`page`, `topbar`, `card`, `input`,
 * `btnPrimario`...) com valores levemente divergentes — mudar o azul institucional
 * exigia editar 16 arquivos. Agora cada tela importa daqui e só declara o que é
 * realmente específico dela.
 *
 * Uso: `const s = { ...base, meuEstiloLocal: {...} }`
 */

export const base = {
  // ─── Casca da página ───────────────────────────────────────────────────────
  page: {
    display: "flex",
    minHeight: "100vh",
    background: cor.fundo,
    fontFamily: fonte.familia,
  } as CSSProperties,

  /** Página sem sidebar, conteúdo centralizado (login, privacidade, solicitar acesso) */
  pageCentro: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: cor.fundo,
    padding: `${espaco.x8}px ${espaco.x4}px`,
    fontFamily: fonte.familia,
  } as CSSProperties,

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflowY: "auto",
  } as CSSProperties,

  topbar: {
    background: cor.superficie,
    borderBottom: `1.5px solid ${cor.borda}`,
    padding: `${espaco.x4}px ${espaco.x6}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaco.x4,
    flexShrink: 0,
    flexWrap: "wrap",
  } as CSSProperties,

  title: {
    fontSize: texto.xl,
    fontWeight: peso.forte,
    color: cor.textoForte,
  } as CSSProperties,

  sub: {
    color: cor.textoFraco,
    fontSize: texto.sm,
    marginTop: espaco.x1 / 2,
  } as CSSProperties,

  content: {
    padding: `${espaco.x5}px ${espaco.x6}px`,
    flex: 1,
    maxWidth: layout.conteudoMax,
    width: "100%",
  } as CSSProperties,

  // ─── Superfícies ───────────────────────────────────────────────────────────
  card: {
    background: cor.superficie,
    border: `1px solid ${cor.borda}`,
    borderRadius: raio.lg,
    padding: espaco.x5,
    boxShadow: sombra.card,
  } as CSSProperties,

  /** Card sem padding — para tabelas que encostam na borda */
  cardLiso: {
    background: cor.superficie,
    border: `1px solid ${cor.borda}`,
    borderRadius: raio.lg,
    overflow: "hidden",
    boxShadow: sombra.card,
  } as CSSProperties,

  secaoTitulo: {
    fontSize: texto.lg,
    fontWeight: peso.forte,
    color: cor.textoForte,
    marginBottom: espaco.x3,
  } as CSSProperties,

  // ─── Formulário ────────────────────────────────────────────────────────────
  label: {
    display: "block",
    fontSize: texto.sm,
    color: cor.textoSuave,
    marginBottom: espaco.x1,
    fontWeight: peso.semi,
  } as CSSProperties,

  input: {
    width: "100%",
    padding: `9px ${espaco.x3}px`,
    border: `1px solid ${cor.borda}`,
    borderRadius: raio.sm,
    fontSize: texto.base,
    boxSizing: "border-box",
    background: cor.superficie,
    color: cor.textoForte,
    fontFamily: "inherit",
  } as CSSProperties,

  // ─── Botões ────────────────────────────────────────────────────────────────
  // O feedback de hover/active vem do CSS global (index.css), não daqui —
  // estilo inline não suporta pseudo-classes.
  btnPrimario: {
    padding: `10px ${espaco.x5}px`,
    border: "none",
    borderRadius: raio.md,
    background: cor.accent,
    color: cor.superficie,
    fontSize: texto.base,
    fontWeight: peso.forte,
    cursor: "pointer",
  } as CSSProperties,

  btnSecundario: {
    padding: `10px ${espaco.x5}px`,
    border: `1px solid ${cor.borda}`,
    borderRadius: raio.md,
    background: cor.fundo,
    color: cor.textoSuave,
    fontSize: texto.base,
    fontWeight: peso.semi,
    cursor: "pointer",
  } as CSSProperties,

  btnMini: {
    background: cor.fundo,
    color: cor.accent,
    border: `1px solid ${cor.borda}`,
    borderRadius: raio.sm,
    padding: `5px ${espaco.x3}px`,
    fontSize: texto.xs,
    fontWeight: peso.forte,
    cursor: "pointer",
  } as CSSProperties,

  // ─── Sinalização ───────────────────────────────────────────────────────────
  badge: {
    padding: `${espaco.x1}px ${espaco.x3}px`,
    borderRadius: raio.pill,
    fontSize: texto.xs,
    fontWeight: peso.forte,
    whiteSpace: "nowrap",
  } as CSSProperties,

  erro: {
    background: cor.perigoBgSuave,
    border: "1px solid #FECACA",
    borderRadius: raio.md,
    padding: `${espaco.x2}px ${espaco.x3}px`,
    fontSize: texto.sm,
    color: cor.perigoForte,
    fontWeight: peso.medio,
  } as CSSProperties,

  ok: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: raio.md,
    padding: `${espaco.x2}px ${espaco.x3}px`,
    fontSize: texto.sm,
    color: cor.sucesso,
    fontWeight: peso.medio,
  } as CSSProperties,

  aviso: {
    background: cor.alertaBg,
    border: "1px solid #FDE68A",
    borderRadius: raio.md,
    padding: `${espaco.x3}px ${espaco.x4}px`,
    fontSize: texto.base,
    color: cor.alerta,
  } as CSSProperties,

  link: {
    color: cor.accent,
    fontSize: texto.base,
    fontWeight: peso.semi,
    textDecoration: "none",
  } as CSSProperties,

  // ─── Modal ─────────────────────────────────────────────────────────────────
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.6)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: espaco.x8,
  } as CSSProperties,

  modal: {
    background: cor.superficie,
    borderRadius: raio.lg,
    padding: espaco.x6,
    width: "100%",
    maxWidth: 620,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: sombra.modal,
  } as CSSProperties,

  modalTitulo: {
    fontSize: texto.xl,
    fontWeight: peso.forte,
    color: cor.textoForte,
    marginTop: 0,
    marginBottom: espaco.x5,
  } as CSSProperties,
} satisfies Record<string, CSSProperties>;

/** Badge de estado — usa só cores semânticas, nunca decorativas. */
export const badgeEstado = {
  sucesso: { background: cor.sucessoBg, color: cor.sucesso },
  alerta:  { background: cor.alertaBg,  color: cor.alerta },
  perigo:  { background: cor.perigoBg,  color: cor.perigo },
  info:    { background: cor.accentBg,  color: cor.accentHover },
  neutro:  { background: cor.neutroBg,  color: cor.neutro },
} as const;

/** Grid responsivo com as 3 larguras de coluna permitidas. */
export function gridAuto(coluna: "sm" | "md" | "lg" = "md", gap = espaco.x4): CSSProperties {
  const min = coluna === "sm" ? layout.colunaSm : coluna === "lg" ? layout.colunaLg : layout.colunaMd;
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap,
  };
}
