import { Sidebar } from "../../components/layout/Sidebar";

interface Manual {
  arquivo: string;
  titulo: string;
  descricao: string;
  cor: string;
  bg: string;
  icone: React.ReactNode;
}

const MANUAIS: Manual[] = [
  {
    arquivo: "manual-veiculos.pdf",
    titulo: "Veículos",
    descricao: "Cadastro, edição e status da frota oficial.",
    cor: "#1563D5", bg: "#eff6ff",
    icone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  },
  {
    arquivo: "manual-salas.pdf",
    titulo: "Salas",
    descricao: "Cadastro de salas e gestão de reservas.",
    cor: "#7C3AED", bg: "#F5F3FF",
    icone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="1"/><circle cx="15" cy="12" r="1" fill="currentColor"/></svg>,
  },
  {
    arquivo: "manual-equipamentos.pdf",
    titulo: "Equipamentos",
    descricao: "Catálogo e ciclo de empréstimo de patrimônio.",
    cor: "#0891B2", bg: "#ECFEFF",
    icone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="1"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  },
  {
    arquivo: "manual-manutencao.pdf",
    titulo: "Manutenção",
    descricao: "Registro e conclusão de manutenções da frota.",
    cor: "#B45309", bg: "#fef9c3",
    icone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  },
  {
    arquivo: "manual-usuarios.pdf",
    titulo: "Usuários",
    descricao: "Cadastro de contas e aprovação de acessos.",
    cor: "#166534", bg: "#dcfce7",
    icone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    arquivo: "manual-setores.pdf",
    titulo: "Setores",
    descricao: "Catálogo de departamentos usado nos cadastros.",
    cor: "#1E3A8A", bg: "#dbeafe",
    icone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/><line x1="9" y1="18" x2="15" y2="18"/></svg>,
  },
  {
    arquivo: "manual-indenizacoes.pdf",
    titulo: "Indenizações",
    descricao: "Aprovação de Anexo I e acompanhamento do Anexo II.",
    cor: "#059669", bg: "#d1fae5",
    icone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 6v12M18 6v12"/></svg>,
  },
];

export default function ManualUso() {
  return (
    <div style={s.page}>
      <Sidebar perfil="gestor" />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Manual de Uso da Aplicação</div>
            <div style={s.sub}>Guias em PDF para cada módulo de gestão do Hub</div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto" }}>
          <div style={s.grid}>
            {MANUAIS.map(m => (
              <div key={m.arquivo} style={s.card}>
                <div style={{ ...s.iconWrap, background: m.bg, color: m.cor }}>{m.icone}</div>
                <div style={s.cardTitulo}>{m.titulo}</div>
                <div style={s.cardDesc}>{m.descricao}</div>
                <a href={`/manuais/${m.arquivo}`} download style={s.btnBaixar}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Baixar PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:       { display: "flex", minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', system-ui, sans-serif" },
  main:       { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" },
  topbar:     { background: "#ffffff", borderBottom: "1.5px solid #E1EAF5", padding: "14px 24px", flexShrink: 0 },
  title:      { fontSize: 18, fontWeight: 700, color: "#0F172A" },
  sub:        { color: "#7A95B2", fontSize: 12, marginTop: 2 },
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 },
  card:       { background: "#ffffff", border: "1px solid #E1EAF5", borderRadius: 14, padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "flex-start" },
  iconWrap:   { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardTitulo: { fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 4 },
  cardDesc:   { fontSize: 12.5, color: "#7A95B2", marginBottom: 16, lineHeight: 1.4 },
  btnBaixar:  { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#1E3A8A", color: "#fff", borderRadius: 8, fontSize: 12.5, fontWeight: 700, textDecoration: "none", marginTop: "auto" },
};
