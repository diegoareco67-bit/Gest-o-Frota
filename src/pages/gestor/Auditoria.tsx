import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { Sidebar } from "../../components/layout/Sidebar";
import type { AcaoAuditoria } from "../../firebase/auditoria";

interface RegistroAuditoria {
  id: string;
  acao: AcaoAuditoria | string;
  usuarioId: string;
  usuarioNome: string;
  detalhes?: Record<string, unknown>;
  criadoEm?: { toDate: () => Date };
}

const ACAO_LABEL: Record<string, { texto: string; cor: string; bg: string }> = {
  aprovar_solicitacao:             { texto: "Aprovou solicitação",       cor: "#166534", bg: "#dcfce7" },
  recusar_solicitacao:             { texto: "Recusou solicitação",       cor: "#991b1b", bg: "#fee2e2" },
  checkout:                        { texto: "Retirou veículo",           cor: "#1e40af", bg: "#dbeafe" },
  checkin:                         { texto: "Devolveu veículo",          cor: "#475569", bg: "#f1f5f9" },
  cadastrar_veiculo:               { texto: "Cadastrou veículo",         cor: "#1e40af", bg: "#dbeafe" },
  editar_veiculo:                  { texto: "Editou veículo",            cor: "#854d0e", bg: "#fef9c3" },
  registrar_manutencao:            { texto: "Registrou manutenção",      cor: "#854d0e", bg: "#fef9c3" },
  concluir_manutencao:             { texto: "Concluiu manutenção",       cor: "#166534", bg: "#dcfce7" },
  reservar_sala:                   { texto: "Reservou sala",             cor: "#5b21b6", bg: "#ede9fe" },
  cancelar_reserva_sala:           { texto: "Cancelou reserva de sala",  cor: "#991b1b", bg: "#fee2e2" },
  reservar_equipamento:            { texto: "Reservou equipamento",      cor: "#0369a1", bg: "#e0f2fe" },
  retirar_equipamento:             { texto: "Retirou equipamento",       cor: "#1e40af", bg: "#dbeafe" },
  devolver_equipamento:            { texto: "Devolveu equipamento",      cor: "#475569", bg: "#f1f5f9" },
  cancelar_emprestimo_equipamento: { texto: "Cancelou empréstimo",       cor: "#991b1b", bg: "#fee2e2" },
  aprovar_veiculo_proprio:         { texto: "Aprovou veículo próprio",   cor: "#166534", bg: "#dcfce7" },
  recusar_veiculo_proprio:         { texto: "Recusou veículo próprio",   cor: "#991b1b", bg: "#fee2e2" },
  enviar_indenizacao:              { texto: "Enviou indenização ao RH",  cor: "#0369a1", bg: "#e0f2fe" },
};

function resumoDetalhes(d?: Record<string, unknown>): string {
  if (!d) return "—";
  return Object.entries(d)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export default function Auditoria() {
  const { usuario } = useAuth();
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const snap = await getDocs(query(collection(db, "auditoria"), orderBy("criadoEm", "desc"), limit(500)));
        setRegistros(snap.docs.map(d => ({ id: d.id, ...d.data() } as RegistroAuditoria)));
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, []);

  const filtrados = registros.filter(r => {
    if (!busca) return true;
    const t = busca.toLowerCase();
    return (r.usuarioNome || "").toLowerCase().includes(t)
      || (ACAO_LABEL[r.acao]?.texto || r.acao).toLowerCase().includes(t)
      || resumoDetalhes(r.detalhes).toLowerCase().includes(t);
  });

  function fmt(r: RegistroAuditoria) {
    try { return r.criadoEm?.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) || "—"; }
    catch { return "—"; }
  }

  return (
    <div style={s.page}>
      <Sidebar perfil={usuario?.perfil === "auditor" ? "auditor" : "gestor"} />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Trilha de Auditoria</div>
            <div style={s.sub}>Registro imutável das ações sensíveis do sistema (500 mais recentes)</div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto" }}>
          <div style={{ position: "relative", maxWidth: 360, marginBottom: 16 }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A95B2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por ação, autor ou detalhe..."
              aria-label="Buscar na trilha de auditoria"
              style={{ width: "100%", padding: "9px 12px 9px 32px", border: "1px solid #E1EAF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", fontFamily: "inherit", color: "#0F172A" }} />
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E1EAF5", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E1EAF5" }}>
                    {["Data / Hora", "Ação", "Autor", "Detalhes"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#5A7A9A", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: "3rem", color: "#94A3B8", fontSize: 13 }}>Carregando trilha...</td></tr>
                  ) : filtrados.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: "3rem" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>Nenhum registro encontrado</div>
                      <div style={{ fontSize: 12, color: "#7A95B2" }}>As ações do sistema aparecem aqui conforme acontecem</div>
                    </td></tr>
                  ) : filtrados.map(r => {
                    const a = ACAO_LABEL[r.acao] || { texto: r.acao, cor: "#475569", bg: "#f1f5f9" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#7A95B2", whiteSpace: "nowrap" }}>{fmt(r)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: a.bg, color: a.cor, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{a.texto}</span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>{r.usuarioNome || "—"}</td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#5A7A9A" }}>{resumoDetalhes(r.detalhes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:   { display: "flex", minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', system-ui, sans-serif" },
  main:   { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" },
  topbar: { background: "#ffffff", borderBottom: "1.5px solid #E1EAF5", padding: "14px 24px", flexShrink: 0 },
  title:  { fontSize: 18, fontWeight: 700, color: "#0F172A" },
  sub:    { color: "#7A95B2", fontSize: 12, marginTop: 2 },
};
