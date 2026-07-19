import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";

interface Solicitacao {
  id: string;
  protocolo: string;
  condutorId?: string;
  condutorNome: string;
  condutorSetor?: string;
  veiculoPlaca: string;
  veiculoMarca?: string;
  veiculoModelo?: string;
  destino: string;
  motivo: string;
  descricao?: string;
  dataSaida: string;
  dataRetorno: string;
  status: string;
  motivoRecusa?: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pendente:  { label: "Pendente",  color: "#854d0e", bg: "#fef9c3"  },
  aprovada:  { label: "Aprovada",  color: "#166534", bg: "#dcfce7"  },
  recusada:  { label: "Recusada",  color: "#991b1b", bg: "#fee2e2"  },
  em_uso:    { label: "Em Uso",    color: "#1e40af", bg: "#dbeafe"  },
  concluida: { label: "Concluída", color: "#475569", bg: "#f1f5f9"  },
};

export default function Aprovacoes() {
  const { usuario } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<string>("pendente");
  const [modal, setModal] = useState<{ id: string; protocolo: string } | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [processando, setProcessando] = useState(false);
  const [avisosCnh, setAvisosCnh] = useState<Record<string,string>>({});
  const [erroGlobal, setErroGlobal] = useState("");
  const [erroModal, setErroModal] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const snap = await getDocs(query(collection(db, "solicitacoes"), orderBy("criadoEm", "desc"), limit(500)));
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Solicitacao));
      setSolicitacoes(lista);
      // Verificar CNH dos condutores com solicitações pendentes
      const avisos: Record<string,string> = {};
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const pendentes = lista.filter(s => s.status === "pendente" && s.condutorId);
      if (pendentes.length > 0) {
        const usersSnap = await getDocs(query(collection(db, "usuarios"), limit(500)));
        const usersByUid: Record<string, { vencimentoCnh?: string }> = {};
        usersSnap.forEach(d => { const data = d.data(); if (data.uid) usersByUid[data.uid] = data; });
        pendentes.forEach(sol => {
          if (!sol.condutorId) return;
          const venc = usersByUid[sol.condutorId]?.vencimentoCnh;
          if (venc) {
            const vencDate = new Date(venc + "T00:00:00");
            const dias = Math.ceil((vencDate.getTime() - hoje.getTime()) / (1000*60*60*24));
            if (dias < 0) avisos[sol.id] = `CNH vencida em ${vencDate.toLocaleDateString("pt-BR")}`;
            else if (dias <= 60) avisos[sol.id] = `CNH vence em ${dias} dia(s) — ${vencDate.toLocaleDateString("pt-BR")}`;
          }
        });
      }
      setAvisosCnh(avisos);
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  }

  async function aprovar(id: string) {
    const sol = solicitacoes.find(s => s.id === id);
    // Bloquear aprovação se CNH vencida (botão já é disabled, mas defesa dupla)
    if (avisosCnh[id]?.startsWith("CNH vencida")) {
      setErroGlobal(`Não é possível aprovar: ${avisosCnh[id]}`);
      return;
    }
    setErroGlobal("");
    setProcessando(true);
    try {
      await updateDoc(doc(db, "solicitacoes", id), { status: "aprovada", motivoRecusa: "" });
      // Escreve apenas campos não-sensíveis na coleção pública do calendário
      await setDoc(doc(db, "calendarioPublico", id), {
        veiculoPlaca: sol?.veiculoPlaca ?? "",
        veiculoLabel: `${sol?.veiculoMarca ?? ""} ${sol?.veiculoModelo ?? ""}`.trim(),
        dataSaida:    sol?.dataSaida   ?? "",
        dataRetorno:  sol?.dataRetorno ?? "",
        status: "aprovada",
      });
      setSolicitacoes(p => p.map(s => s.id === id ? { ...s, status: "aprovada" } : s));
      await registrarAuditoria("aprovar_solicitacao", usuario?.uid || "", usuario?.nome || "", {
        solicitacaoId: id, protocolo: sol?.protocolo, condutorNome: sol?.condutorNome, veiculoPlaca: sol?.veiculoPlaca,
      });
    } catch (e) { console.error(e); setErroGlobal("Erro ao aprovar solicitação. Tente novamente."); }
    finally { setProcessando(false); }
  }

  async function recusar() {
    if (!modal) return;
    setErroModal("");
    if (!motivoRecusa.trim()) { setErroModal("Informe o motivo da recusa."); return; }
    const sol = solicitacoes.find(s => s.id === modal.id);
    setProcessando(true);
    try {
      await updateDoc(doc(db, "solicitacoes", modal.id), {
        status: "recusada",
        motivoRecusa: motivoRecusa.trim(),
      });
      // Remove do calendário público caso tenha sido aprovada anteriormente
      try { await deleteDoc(doc(db, "calendarioPublico", modal.id)); } catch { /* pode não existir */ }
      setSolicitacoes(p => p.map(s =>
        s.id === modal.id ? { ...s, status: "recusada", motivoRecusa: motivoRecusa.trim() } : s
      ));
      await registrarAuditoria("recusar_solicitacao", usuario?.uid || "", usuario?.nome || "", {
        solicitacaoId: modal.id, protocolo: modal.protocolo, motivo: motivoRecusa.trim(),
        condutorNome: sol?.condutorNome, veiculoPlaca: sol?.veiculoPlaca,
      });
      setModal(null);
      setMotivoRecusa("");
    } catch (e) { console.error(e); setErroModal("Erro ao recusar. Tente novamente."); }
    finally { setProcessando(false); }
  }

  function formatarData(str: string) {
    if (!str) return "—";
    return new Date(str).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  const filtradas = solicitacoes.filter(s => filtro === "todas" || s.status === filtro);

  const STATUS_ACCENT: Record<string, string> = {
    pendente:  "#F59E0B",
    aprovada:  "#22C55E",
    recusada:  "#EF4444",
    em_uso:    "#3B82F6",
    concluida: "#94A3B8",
  };

  return (
    <div style={s.page}>
      {/* Modal de Recusa */}
      {modal && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-recusa-titulo">
          <div style={s.modalBox}>
            <h2 id="modal-recusa-titulo" style={s.modalTitle}>❌ Recusar Solicitação</h2>
            <p style={s.modalSub}>#{modal.protocolo}</p>
            <label htmlFor="motivo-recusa" style={s.label}>Motivo da Recusa *</label>
            <textarea
              id="motivo-recusa"
              value={motivoRecusa}
              onChange={e => setMotivoRecusa(e.target.value)}
              placeholder="Descreva o motivo da recusa para o condutor..."
              style={s.textarea}
              rows={4}
              aria-required="true"
              autoFocus
            />
            <p style={{ fontSize: 12, color: "#7A95B2", marginTop: 4 }}>
              Este motivo será exibido ao condutor na tela de solicitações.
            </p>
            {erroModal && (
              <div role="alert" style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginTop:10, fontWeight:500 }}>
                ⚠️ {erroModal}
              </div>
            )}
            <div style={s.modalBtns}>
              <button
                onClick={() => { setModal(null); setMotivoRecusa(""); }}
                style={{ ...s.btn, background: "#F1F5F9", color: "#5A7A9A", border:"1px solid #E1EAF5" }}
                disabled={processando}
              >
                Cancelar
              </button>
              <button
                onClick={recusar}
                style={{ ...s.btn, background: "#EF4444" }}
                disabled={processando || !motivoRecusa.trim()}
              >
                {processando ? "Recusando..." : "Confirmar Recusa"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar perfil="gestor" />

      <main style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Aprovações</div>
            <div style={s.sub}>Gerencie as solicitações de uso de veículos</div>
          </div>
          <button onClick={carregar} style={{ ...s.btn, background:"#F1F5F9", color:"#5A7A9A", border:"1px solid #E1EAF5", fontSize: 13 }}>
            🔄 Atualizar
          </button>
        </div>

        <div style={{ padding:"20px 24px", flex:1, overflowY:"auto" }}>
          {erroGlobal && (
            <div role="alert" style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:12, fontWeight:500, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>⚠️ {erroGlobal}</span>
              <button onClick={()=>setErroGlobal("")} aria-label="Fechar erro" style={{ background:"none", border:"none", color:"#DC2626", cursor:"pointer", fontSize:16, padding:"0 4px" }}>✕</button>
            </div>
          )}
          {/* Filtros */}
          <div style={s.filtros}>
            {[
              { key: "pendente",  label: "Pendentes" },
              { key: "aprovada",  label: "Aprovadas" },
              { key: "recusada",  label: "Recusadas" },
              { key: "em_uso",    label: "Em Uso" },
              { key: "concluida", label: "Concluídas" },
              { key: "todas",     label: "Todas" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                style={{ ...s.filtroBtn, ...(filtro === f.key ? s.filtroAtivo : {}) }}
              >
                {f.label}
                <span style={s.filtroCount}>
                  {f.key === "todas" ? solicitacoes.length : solicitacoes.filter(s => s.status === f.key).length}
                </span>
              </button>
            ))}
          </div>

          {carregando ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"5rem", gap:14, color:"#94A3B8" }}>
              <div style={{ width:32, height:32, border:"3px solid #E1EAF5", borderTop:"3px solid #3B82F6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
              <span style={{ fontSize:13 }}>Carregando solicitações...</span>
            </div>
          ) : filtradas.length === 0 ? (
            <div style={s.emptyBox}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:26 }}>📭</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#334155", marginBottom:6 }}>Nenhuma solicitação encontrada</div>
              <p style={{ color:"#7A95B2", fontSize:13 }}>{filtro !== "todas" ? `Sem registros com status "${STATUS_LABEL[filtro]?.label}"` : "Nenhuma solicitação cadastrada ainda"}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtradas.map(sol => {
                const st = STATUS_LABEL[sol.status] ?? { label: sol.status, color: "#475569", bg: "#f1f5f9" };
                return (
                  <div key={sol.id} style={{ ...s.card, boxShadow: `inset 4px 0 0 ${STATUS_ACCENT[sol.status] ?? "#E1EAF5"}, 0 1px 3px rgba(0,0,0,0.04)` }}>
                    <div style={s.cardTop}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={s.protocolo}>#{sol.protocolo}</span>
                          <span style={{ ...s.badge, color: st.color, background: st.bg }}>{st.label}</span>
                        </div>
                        <div style={s.condutor}>👤 {sol.condutorNome} {sol.condutorSetor ? `— ${sol.condutorSetor}` : ""}</div>
                        <div style={s.cardInfo}>
                          🚗 {sol.veiculoPlaca} &nbsp;|&nbsp; 📍 {sol.destino} &nbsp;|&nbsp; 📅 {formatarData(sol.dataSaida)} → {formatarData(sol.dataRetorno)}
                        </div>
                        <div style={s.cardMotivo}>Motivo: {sol.motivo}</div>
                        {/* Alerta CNH */}
                        {avisosCnh[sol.id] && (
                          <div style={{ marginTop:8, padding:"6px 10px", borderRadius:6, fontSize:12, fontWeight:600,
                            background: avisosCnh[sol.id].startsWith("CNH vencida") ? "#fee2e2" : "#fef9c3",
                            color: avisosCnh[sol.id].startsWith("CNH vencida") ? "#991b1b" : "#854d0e",
                            border: `1px solid ${avisosCnh[sol.id].startsWith("CNH vencida") ? "#fecaca" : "#fde68a"}` }}>
                            🪪 {avisosCnh[sol.id]}
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      {sol.status === "pendente" && (
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => aprovar(sol.id)}
                            disabled={processando || avisosCnh[sol.id]?.startsWith("CNH vencida")}
                            title={avisosCnh[sol.id]?.startsWith("CNH vencida") ? avisosCnh[sol.id] : undefined}
                            style={{ ...s.btn, background: avisosCnh[sol.id]?.startsWith("CNH vencida") ? "#F1F5F9" : "#22C55E", color: avisosCnh[sol.id]?.startsWith("CNH vencida") ? "#94A3B8" : "#fff", fontSize: 13, padding: "8px 16px", opacity: avisosCnh[sol.id]?.startsWith("CNH vencida") ? 0.6 : 1, cursor: avisosCnh[sol.id]?.startsWith("CNH vencida") ? "not-allowed" : "pointer" }}
                          >
                            ✅ Aprovar
                          </button>
                          <button
                            onClick={() => setModal({ id: sol.id, protocolo: sol.protocolo })}
                            disabled={processando}
                            style={{ ...s.btn, background: "#EF4444", fontSize: 13, padding: "8px 16px" }}
                          >
                            ❌ Recusar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Motivo de recusa visível ao gestor também */}
                    {sol.status === "recusada" && sol.motivoRecusa && (
                      <div style={s.recusaBox}>
                        <span style={s.recusaLabel}>Motivo informado ao condutor:</span> {sol.motivoRecusa}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:        { display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora', system-ui, sans-serif" },
  main:        { flex:1, display:"flex", flexDirection:"column", minWidth:0, overflowY:"auto" },
  topbar:      { background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 },
  title:       { fontSize:18, fontWeight:700, color:"#0F172A" },
  sub:         { color:"#7A95B2", fontSize:12, marginTop:2 },
  empty:       { color:"#7A95B2", textAlign:"center", marginTop:40 },
  emptyBox:    { textAlign:"center", padding:"2rem", background:"#ffffff", borderRadius:12, border:"1px solid #E1EAF5" },
  filtros:     { display:"flex", gap:8, flexWrap:"wrap", marginBottom:"1.25rem" },
  filtroBtn:   { padding:"6px 14px", border:"1px solid #E1EAF5", borderRadius:20, background:"#ffffff", color:"#5A7A9A", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 },
  filtroAtivo: { background:"#1E3A8A", color:"#fff", borderColor:"#1E3A8A" },
  filtroCount: { background:"rgba(0,0,0,0.08)", borderRadius:10, padding:"0 6px", fontSize:11, fontWeight:700 },
  card:        { background:"#ffffff", border:"1px solid #E1EAF5", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" },
  cardTop:     { display:"flex", alignItems:"flex-start", gap:12, padding:"1rem 1.25rem" },
  protocolo:   { fontSize:12, color:"#7A95B2", fontWeight:600 },
  badge:       { fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99 },
  condutor:    { fontSize:15, fontWeight:700, color:"#0F172A", marginBottom:4 },
  cardInfo:    { fontSize:13, color:"#5A7A9A", marginBottom:2 },
  cardMotivo:  { fontSize:13, color:"#7A95B2", fontStyle:"italic" },
  recusaBox:   { background:"#fff5f5", borderTop:"1px solid #fecaca", padding:"0.6rem 1.25rem", fontSize:13, color:"#991b1b" },
  recusaLabel: { fontWeight:700, color:"#DC2626" },
  btn:         { padding:"10px 20px", border:"none", borderRadius:8, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" },
  label:       { display:"block", fontSize:13, color:"#5A7A9A", fontWeight:600, marginBottom:6 },
  textarea:    { width:"100%", padding:"10px 12px", background:"#fff", border:"1px solid #E1EAF5", borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", color:"#0F172A" } as React.CSSProperties,
  overlay:     { position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(2px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modalBox:    { background:"#fff", borderRadius:16, padding:"2rem", width:"100%", maxWidth:480, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" },
  modalTitle:  { fontSize:20, fontWeight:700, color:"#0F172A", marginBottom:4 },
  modalSub:    { fontSize:13, color:"#7A95B2", marginBottom:"1.25rem" },
  modalBtns:   { display:"flex", gap:10, justifyContent:"flex-end", marginTop:"1rem" },
};
