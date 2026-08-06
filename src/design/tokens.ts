/**
 * Design tokens do Hub — fonte única de verdade para cor, forma, tipografia e espaço.
 *
 * Antes destes tokens o sistema tinha 82 cores hex distintas espalhadas por 16 arquivos,
 * 7 escalas de border-radius e tamanhos de fonte ad-hoc (11, 11.5, 12, 12.5, 13...).
 * Qualquer valor visual novo deve sair daqui — não escreva hex solto em componente.
 */

// ─── Cor ──────────────────────────────────────────────────────────────────────
// Um único accent (azul institucional CGE). As cores de estado abaixo são
// semânticas (comunicam situação do dado), não decorativas — não use nenhuma
// delas para "dar variedade visual".
export const cor = {
  // Superfícies
  fundo:        "#F1F5F9",
  superficie:   "#FFFFFF",
  superficieAlt:"#F8FAFC",

  // Bordas
  borda:        "#E1EAF5",
  bordaForte:   "#CBD5E1",

  // Texto (do mais forte ao mais fraco)
  textoForte:   "#0F172A",
  texto:        "#334155",
  textoSuave:   "#5A7A9A",
  textoFraco:   "#7A95B2",
  textoMinimo:  "#94A3B8",

  // Accent — o único da interface
  accent:       "#1E3A8A",
  accentHover:  "#1E40AF",
  accentClaro:  "#3B82F6",
  accentBg:     "#DBEAFE",
  accentBgSuave:"#EFF6FF",

  // Estados semânticos
  sucesso:      "#166534",
  sucessoBg:    "#DCFCE7",
  alerta:       "#854D0E",
  alertaBg:     "#FEF9C3",
  perigo:       "#991B1B",
  perigoBg:     "#FEE2E2",
  perigoForte:  "#DC2626",
  perigoBgSuave:"#FEF2F2",
  neutro:       "#475569",
  neutroBg:     "#F1F5F9",

  // Sidebar (tema escuro)
  sidebarFundo: "#0F1E3D",
  sidebarTexto: "#FFFFFF",
} as const;

// ─── Forma (Shape Consistency Lock) ───────────────────────────────────────────
// Apenas 3 raios + pill. Não introduza 10, 14 ou 16 de novo.
export const raio = {
  sm:   6,   // inputs, badges, botões pequenos
  md:   8,   // botões, cards compactos
  lg:   12,  // cards, modais, painéis
  pill: 999, // badges arredondados, avatares
} as const;

// ─── Tipografia ───────────────────────────────────────────────────────────────
export const fonte = {
  familia: "'Sora', system-ui, sans-serif",
  mono:    "ui-monospace, 'JetBrains Mono', monospace",
} as const;

export const texto = {
  xs:   11,  // rótulos minúsculos, legendas
  sm:   12,  // metadados, captions
  base: 13,  // corpo padrão da interface
  md:   14,  // corpo destacado, células de tabela
  lg:   15,  // títulos de card
  xl:   18,  // título de página
  xxl:  24,  // números de destaque (KPIs)
} as const;

export const peso = {
  normal:  400,
  medio:   500,
  semi:    600,
  forte:   700,
} as const;

// ─── Espaço (grid de 4px) ─────────────────────────────────────────────────────
export const espaco = {
  x1:  4,
  x2:  8,
  x3:  12,
  x4:  16,
  x5:  20,
  x6:  24,
  x8:  32,
  x10: 40,
} as const;

// ─── Elevação ─────────────────────────────────────────────────────────────────
// Preferir borda a sombra (regra da skill). Sombra só quando comunica elevação real.
export const sombra = {
  card:  "0 1px 3px rgba(15,23,42,0.05)",
  modal: "0 20px 60px rgba(15,23,42,0.30)",
  popup: "0 4px 24px rgba(15,23,42,0.08)",
} as const;

// ─── Layout ───────────────────────────────────────────────────────────────────
export const layout = {
  sidebar:     240,
  conteudoMax: 1400,
  /** Largura mínima das colunas em grids responsivos — use só estes 3 valores. */
  colunaSm: 180,
  colunaMd: 220,
  colunaLg: 280,
} as const;
