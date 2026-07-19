import { Sidebar } from "../../components/layout/Sidebar";
import { ModalConfirm } from "../../components/ModalConfirm";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Solicitacao {
  id: string; protocolo: string; veiculoPlaca: string;
  destino: string; motivo: string; descricao?: string;
  dataSaida: string; dataRetorno: string; status: string;
  motivoRecusa?: string; criadoEm?: { seconds: number };
}

const STATUS: Record<string, { label:string; color:string; bg:string }> = {
  pendente:  { label:"Pendente",  color:"#854d0e", bg:"#fef9c3"  },
  aprovada:  { label:"Aprovada",  color:"#166534", bg:"#dcfce7"  },
  recusada:  { label:"Recusada",  color:"#991b1b", bg:"#fee2e2"  },
  em_uso:    { label:"Em Uso",    color:"#1e40af", bg:"#dbeafe"  },
  concluida: { label:"Concluída", color:"#475569", bg:"#f1f5f9"  },
  cancelada: { label:"Cancelada", color:"#475569", bg:"#f1f5f9"  },
};

const card: React.CSSProperties = {
  background:"#ffffff", border:"1px solid #E1EAF5", borderRadius:14,
  boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
};

export default function MinhasSolicitacoes() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [confirmCancelar, setConfirmCancelar] = useState<string | null>(null);

  async function cancelarSolicitacao(id: string) {
    setCancelando(id);
    try {
      await updateDoc(doc(db, "solicitacoes", id), { status: "cancelada" });
      // Remove do calendário público (se existia entrada aprovada)
      try { await deleteDoc(doc(db, "calendarioPublico", id)); } catch { /* pode não existir */ }
      setSolicitacoes(p => p.map(s => s.id === id ? { ...s, status: "cancelada" } : s));
      setExpandido(null);
    } catch(e) { console.error(e); }
    finally { setCancelando(null); }
  }

  useEffect(() => {
    async function carregar() {
      if (!usuario) return;
      try {
        const snap = await getDocs(query(collection(db,"solicitacoes"), where("condutorId","==",usuario.uid), orderBy("criadoEm","desc"), limit(200)));
        setSolicitacoes(snap.docs.map(d => ({ id:d.id, ...d.data() } as Solicitacao)));
      } catch(e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, [usuario]);

  function formatarData(str: string) {
    if (!str) return "—";
    return new Date(str).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora',system-ui,sans-serif" }}>
      <Sidebar perfil="usuario" />

      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Topbar */}
        <div style={{ background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"16px 28px", flexShrink:0 }}>
          <div style={{ fontSize:18, fontWeight:700, color:"#0F172A" }}>Minhas Solicitações</div>
          <div style={{ fontSize:12, color:"#7A95B2", marginTop:2 }}>Acompanhe o status de todas as suas solicitações</div>
        </div>

        <div style={{ padding:"24px 28px", flex:1, overflowY:"auto" }}>
          {carregando ? (
            <div style={{ textAlign:"center", padding:"5rem", color:"#7A95B2", fontSize:15 }}>Carregando...</div>
          ) : solicitacoes.length === 0 ? (
            <div style={{ ...card, textAlign:"center", padding:"3rem 2rem", maxWidth:420 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <p style={{ color:"#7A95B2", marginBottom:20, fontSize:14 }}>Você ainda não fez nenhuma solicitação.</p>
              <button onClick={() => navigate("/usuario/solicitar")} style={{ padding:"10px 22px", background:"#1E3A8A", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                + Nova Solicitação
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:760 }}>
              {solicitacoes.map(sol => {
                const st = STATUS[sol.status] ?? { label:sol.status, color:"#475569", bg:"#f1f5f9" };
                const aberto = expandido === sol.id;
                return (
                  <div key={sol.id} style={{ ...card, overflow:"hidden" }}>
                    {/* Cabeçalho */}
                    <div onClick={() => setExpandido(aberto ? null : sol.id)}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", cursor:"pointer" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:11, color:"#7A95B2", fontWeight:600 }}>#{sol.protocolo}</span>
                          <span style={{ padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:700, color:st.color, background:st.bg, border:`1px solid ${st.color}30` }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{sol.destino}</div>
                        <div style={{ fontSize:12, color:"#5A7A9A", marginTop:3 }}>
                          🚗 {sol.veiculoPlaca} &nbsp;|&nbsp; 📅 {formatarData(sol.dataSaida)}
                        </div>
                      </div>
                      <span style={{ color:"#CBD5E1", fontSize:14 }}>{aberto ? "▲" : "▼"}</span>
                    </div>

                    {/* Motivo de recusa */}
                    {sol.status === "recusada" && (
                      <div style={{ margin:"0 20px 14px", background:"#fff5f5", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#DC2626", marginBottom:4 }}>❌ Motivo da Recusa</div>
                        <div style={{ fontSize:13, color:"#991b1b" }}>{sol.motivoRecusa || "Nenhum motivo informado pelo gestor."}</div>
                      </div>
                    )}

                    {/* Detalhes expandidos */}
                    {aberto && (
                      <div style={{ padding:"0 20px 20px" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:10, background:"#F8FAFC", borderRadius:10, padding:"14px", marginBottom:12, border:"1px solid #F1F5F9" }}>
                          <DetalheItem label="Motivo da Viagem" valor={sol.motivo} />
                          <DetalheItem label="Retorno Previsto" valor={formatarData(sol.dataRetorno)} />
                          {sol.descricao && (
                            <div style={{ gridColumn:"1/-1" }}>
                              <DetalheItem label="Observações" valor={sol.descricao} />
                            </div>
                          )}
                        </div>
                        {sol.status === "pendente" && (
                          <button
                            onClick={() => setConfirmCancelar(sol.id)}
                            disabled={cancelando === sol.id}
                            style={{ width:"100%", padding:"9px", background:"#fff", border:"1px solid #fca5a5", borderRadius:8, color:"#dc2626", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                            {cancelando === sol.id ? "Cancelando..." : "✕ Cancelar solicitação"}
                          </button>
                        )}
                        {sol.status === "aprovada" && (
                          <button onClick={() => navigate(`/usuario/checkout/${sol.id}`)}
                            style={{ width:"100%", padding:"10px", background:"#22C55E", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                            🚗 Iniciar Uso do Veículo
                          </button>
                        )}
                        {sol.status === "em_uso" && (
                          <button onClick={() => navigate(`/usuario/checkin/${sol.id}`)}
                            style={{ width:"100%", padding:"10px", background:"#1E3A8A", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                            🔙 Registrar Devolução
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {confirmCancelar && (
        <ModalConfirm
          titulo="Cancelar Solicitação"
          mensagem="Tem certeza que deseja cancelar esta solicitação? Esta ação não pode ser desfeita."
          labelConfirmar="Sim, cancelar"
          labelCancelar="Voltar"
          corConfirmar="#EF4444"
          onConfirmar={() => { cancelarSolicitacao(confirmCancelar); setConfirmCancelar(null); }}
          onCancelar={() => setConfirmCancelar(null)}
        />
      )}
    </div>
  );
}

function DetalheItem({ label, valor }: { label:string; valor:string }) {
  return (
    <div>
      <div style={{ fontSize:10, color:"#7A95B2", fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, color:"#334155" }}>{valor || "—"}</div>
    </div>
  );
}
