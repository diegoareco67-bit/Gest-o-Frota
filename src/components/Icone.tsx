/**
 * Ícones SVG inline, estilo Lucide (traço 2px, currentColor).
 *
 * Substitui os ~64 emojis que a interface usava como ícone. Motivos:
 *  - Emoji colorido ao lado de SVG monocromático (Sidebar) quebrava a consistência visual.
 *  - Emojis novos não existem na fonte do Windows 10 e viram quadradinho — 🛻 e 🪪
 *    estavam em uso e já tinham dado esse problema neste projeto.
 *  - Emoji não herda cor do contexto; SVG com `currentColor` sim.
 */

interface Props {
  /** Tamanho em px (largura e altura) */
  tam?: number;
  style?: React.CSSProperties;
  className?: string;
}

function svg(caminho: React.ReactNode, preenchido = false) {
  return function Ico({ tam = 16, style, className }: Props) {
    return (
      <svg
        width={tam} height={tam} viewBox="0 0 24 24"
        fill={preenchido ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, ...style }}
        className={className}
        aria-hidden="true" focusable="false"
      >
        {caminho}
      </svg>
    );
  };
}

// ─── Transporte ───────────────────────────────────────────────────────────────
export const IcoCarro = svg(<>
  <path d="M5 17H3v-5l2-5h14l2 5v5h-2" />
  <circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" />
  <path d="M9.5 17h5M3 12h18" />
</>);

export const IcoCaminhonete = svg(<>
  <path d="M3 17V9h9l3 3h6v5h-2" />
  <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
  <path d="M9 17h6" />
</>);

export const IcoSemaforo = svg(<>
  <rect x="8" y="2" width="8" height="16" rx="3" />
  <circle cx="12" cy="6" r="1.2" /><circle cx="12" cy="10" r="1.2" /><circle cx="12" cy="14" r="1.2" />
  <path d="M12 18v4" />
</>);

// ─── Lugares e objetos ────────────────────────────────────────────────────────
export const IcoPorta = svg(<>
  <rect x="5" y="2" width="14" height="20" rx="1" />
  <circle cx="15" cy="12" r="1" />
</>);

export const IcoPredio = svg(<>
  <rect x="4" y="2" width="16" height="20" rx="1" />
  <path d="M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01M9 18h6" />
</>);

export const IcoMonitor = svg(<>
  <rect x="2" y="4" width="20" height="12" rx="1" />
  <path d="M8 20h8M12 16v4" />
</>);

export const IcoChave = svg(
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
);

export const IcoLocal = svg(<>
  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
  <circle cx="12" cy="10" r="3" />
</>);

// ─── Pessoas ──────────────────────────────────────────────────────────────────
export const IcoPessoa = svg(<>
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  <circle cx="12" cy="7" r="4" />
</>);

export const IcoCredencial = svg(<>
  <rect x="2" y="5" width="20" height="14" rx="2" />
  <circle cx="8" cy="11" r="2" />
  <path d="M5 16c.7-1.3 1.8-2 3-2s2.3.7 3 2M14 10h5M14 14h3" />
</>);

// ─── Documentos ───────────────────────────────────────────────────────────────
export const IcoDocumento = svg(<>
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  <path d="M14 2v6h6M9 13h6M9 17h6" />
</>);

export const IcoPrancheta = svg(<>
  <rect x="8" y="2" width="8" height="4" rx="1" />
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  <path d="M9 12h6M9 16h4" />
</>);

export const IcoJornal = svg(<>
  <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9h4" />
  <path d="M10 6h8M10 10h8M10 14h5" />
</>);

export const IcoEditar = svg(<>
  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
</>);

// ─── Comunicação ──────────────────────────────────────────────────────────────
export const IcoEmail = svg(<>
  <rect x="2" y="4" width="20" height="16" rx="2" />
  <path d="m22 7-10 6L2 7" />
</>);

export const IcoCaixaVazia = svg(<>
  <path d="M22 12h-6l-2 3h-4l-2-3H2" />
  <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
</>);

// ─── Tempo ────────────────────────────────────────────────────────────────────
export const IcoCalendario = svg(<>
  <rect x="3" y="4" width="18" height="18" rx="2" />
  <path d="M16 2v4M8 2v4M3 10h18" />
</>);

// ─── Estados e ações ──────────────────────────────────────────────────────────
export const IcoCheck = svg(<polyline points="20 6 9 17 4 12" />);

export const IcoCheckCirculo = svg(<>
  <circle cx="12" cy="12" r="10" />
  <path d="m9 12 2 2 4-4" />
</>);

export const IcoX = svg(<path d="M18 6 6 18M6 6l12 12" />);

export const IcoXCirculo = svg(<>
  <circle cx="12" cy="12" r="10" />
  <path d="m15 9-6 6M9 9l6 6" />
</>);

export const IcoAlerta = svg(<>
  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  <path d="M12 9v4M12 17h.01" />
</>);

export const IcoSirene = svg(<>
  <path d="M12 2a5 5 0 0 0-5 5v5h10V7a5 5 0 0 0-5-5z" />
  <path d="M5 12h14a1 1 0 0 1 1 1v2H4v-2a1 1 0 0 1 1-1zM12 2V1M4 19h16M19.5 5.5 21 4M4.5 5.5 3 4" />
</>);

export const IcoCadeado = svg(<>
  <rect x="3" y="11" width="18" height="11" rx="2" />
  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
</>);

export const IcoDinheiro = svg(<>
  <rect x="2" y="6" width="20" height="12" rx="2" />
  <circle cx="12" cy="12" r="2.5" />
  <path d="M6 6v12M18 6v12" />
</>);

export const IcoVoltar = svg(<path d="M19 12H5M12 19l-7-7 7-7" />);

export const IcoAtualizar = svg(<>
  <path d="M21 12a9 9 0 1 1-3-6.7" />
  <path d="M21 3v6h-6" />
</>);

export const IcoMenu = svg(<path d="M3 6h18M3 12h18M3 18h18" />);

export const IcoDownload = svg(<>
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  <path d="M7 10l5 5 5-5M12 15V3" />
</>);
