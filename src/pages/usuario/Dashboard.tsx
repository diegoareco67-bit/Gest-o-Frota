import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Solicitacao {
  id: string; protocolo: string; veiculoPlaca: string;
  destino: string; status: string; dataSaida: string; dataRetorno: string;
}

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #E1EAF5",
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

function IcoHourglass() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>;
}
function IcoCheck() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function IcoCar() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 16V11h7l2-3h3v3h8v5M2 16h20"/><circle cx="6.5" cy="18.5" r="2.3"/><circle cx="17.5" cy="18.5" r="2.3"/></svg>;
}
function IcoClipboard() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
}
function IcoPlus() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pendente:  { label:"Pendente",  color:"#854d0e", bg:"#fef9c3"  },
    aprovada:  { label:"Aprovada",  color:"#166534", bg:"#dcfce7"  },
    recusada:  { label:"Recusada",  color:"#991b1b", bg:"#fee2e2"  },
    em_uso:    { label:"Em Uso",    color:"#1e40af", bg:"#dbeafe"  },
    concluida: { label:"Concluída", color:"#475569", bg:"#f1f5f9"  },
  };
  const m = map[status] ?? { label: status, color:"#475569", bg:"#f1f5f9" };
  return (
    <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, color:m.color, background:m.bg, border:`1px solid ${m.color}30`, whiteSpace:"nowrap" }}>
      {m.label}
    </span>
  );
}

function StatCard({ icon, label, valor, sub, accentColor, iconBg }: { icon: React.ReactNode; label: string; valor: number; sub: string; accentColor: string; iconBg: string }) {
  return (
    <div style={{ ...card, padding:"18px 16px", display:"flex", flexDirection:"column", gap:8, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accentColor, borderRadius:"14px 14px 0 0" }} />
      <div style={{ width:40, height:40, borderRadius:"50%", background:iconBg, display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</div>
      <div style={{ fontSize:26, fontWeight:800, color:"#0F172A", lineHeight:1 }}>{valor}</div>
      <div style={{ fontSize:13, fontWeight:700, color:"#334155" }}>{label}</div>
      <div style={{ fontSize:11, color:"#7A95B2" }}>{sub}</div>
    </div>
  );
}

export default function DashboardCondutor() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      if (!usuario?.uid) return;
      try {
        const snap = await getDocs(query(collection(db, "solicitacoes"), where("condutorId","==",usuario.uid), limit(200)));
        setSolicitacoes(snap.docs.map(d => ({ id:d.id, ...d.data() } as Solicitacao)));
      } catch(e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, [usuario]);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const pendentes  = solicitacoes.filter(s => s.status === "pendente").length;
  const aprovadas  = solicitacoes.filter(s => s.status === "aprovada").length;
  const emUso      = solicitacoes.filter(s => s.status === "em_uso").length;
  const concluidas = solicitacoes.filter(s => s.status === "concluida").length;
  const recentes   = [...solicitacoes].slice(-5).reverse();

  const nomeExibido = usuario?.nome?.split(" ")[0] || "Condutor";
  const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora',system-ui,sans-serif" }}>
      <Sidebar perfil="usuario" />

      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Topbar */}
        <div style={{ background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:"#0F172A" }}>{saudacao}, {nomeExibido}!</div>
            <div style={{ fontSize:12, color:"#7A95B2", marginTop:2 }}>{dataHoje}</div>
          </div>
          <button onClick={() => navigate("/usuario/solicitar")}
            style={{ background:"#1E3A8A", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
            <IcoPlus/> Nova Solicitação
          </button>
        </div>

        <div style={{ padding:"24px 28px", flex:1, overflowY:"auto" }}>
          {carregando ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"5rem", gap:14, color:"#94A3B8" }}>
              <div style={{ width:32, height:32, border:"3px solid #E1EAF5", borderTop:"3px solid #3B82F6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
              <span style={{ fontSize:13 }}>Carregando...</span>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:14, marginBottom:28 }}>
                <StatCard icon={<IcoHourglass/>} label="Pendentes"  valor={pendentes}  sub="aguardando aprovação" accentColor="#FACC15" iconBg="#fef9c3" />
                <StatCard icon={<IcoCheck/>}     label="Aprovadas"  valor={aprovadas}  sub="prontas para uso"     accentColor="#22C55E" iconBg="#dcfce7" />
                <StatCard icon={<IcoCar/>}       label="Em Uso"     valor={emUso}      sub="viagem em andamento"  accentColor="#3B82F6" iconBg="#dbeafe" />
                <StatCard icon={<IcoClipboard/>} label="Concluídas" valor={concluidas} sub="histórico total"      accentColor="#7C3AED" iconBg="#ede9fe" />
              </div>

              {/* Solicitações recentes */}
              <div style={{ ...card, padding:"20px 22px", marginBottom:24 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Solicitações Recentes</div>
                  <button onClick={() => navigate("/usuario/solicitacoes")}
                    style={{ background:"none", border:"none", color:"#3B82F6", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                    Ver todas →
                  </button>
                </div>

                {recentes.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"2.5rem 1rem", color:"#7A95B2" }}>
                    <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
                    <div style={{ fontSize:13 }}>Nenhuma solicitação ainda</div>
                    <button onClick={() => navigate("/usuario/solicitar")}
                      style={{ marginTop:14, background:"#1E3A8A", color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      Fazer primeira solicitação
                    </button>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {recentes.map(sol => (
                      <div key={sol.id} style={{ background:"#F8FAFC", border:"1px solid #E1EAF5", borderRadius:10, padding:"14px 16px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:11, color:"#7A95B2", marginBottom:3 }}>#{sol.protocolo || sol.id.slice(0,8).toUpperCase()}</div>
                            <div style={{ fontSize:14, fontWeight:600, color:"#0F172A", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sol.destino}</div>
                            <div style={{ fontSize:12, color:"#5A7A9A" }}>
                              <span style={{ marginRight:10 }}>🚗 {sol.veiculoPlaca}</span>
                              <span>{sol.dataSaida?.slice(0,10)}</span>
                            </div>
                          </div>
                          <StatusBadge status={sol.status} />
                        </div>
                        {sol.status === "aprovada" && (
                          <button onClick={() => navigate(`/usuario/checkout/${sol.id}`)}
                            style={{ marginTop:12, width:"100%", padding:"9px", background:"#22C55E", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                            Iniciar Uso do Veículo →
                          </button>
                        )}
                        {sol.status === "em_uso" && (
                          <button onClick={() => navigate(`/usuario/checkin/${sol.id}`)}
                            style={{ marginTop:12, width:"100%", padding:"9px", background:"#1E3A8A", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                            Registrar Devolução →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações rápidas */}
              <div style={{ fontWeight:700, color:"#7A95B2", marginBottom:12, letterSpacing:0.5, textTransform:"uppercase", fontSize:11 } as React.CSSProperties}>
                Ações Rápidas
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
                <button onClick={() => navigate("/usuario/solicitar")}
                  style={{ ...card, padding:"18px 20px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14, transition:"box-shadow 0.15s" }}>
                  <div style={{ width:44, height:44, borderRadius:11, background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Nova Solicitação</div>
                    <div style={{ fontSize:11, color:"#7A95B2", marginTop:3 }}>Solicitar uso de veículo</div>
                  </div>
                </button>

                <button onClick={() => navigate("/usuario/solicitacoes")}
                  style={{ ...card, padding:"18px 20px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14, transition:"box-shadow 0.15s" }}>
                  <div style={{ width:44, height:44, borderRadius:11, background:"#ede9fe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <IcoClipboard/>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Minhas Solicitações</div>
                    <div style={{ fontSize:11, color:"#7A95B2", marginTop:3 }}>Histórico completo</div>
                  </div>
                </button>

                <button onClick={() => navigate("/salas")}
                  style={{ ...card, padding:"18px 20px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14, transition:"box-shadow 0.15s" }}>
                  <div style={{ width:44, height:44, borderRadius:11, background:"#f3e8ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="1"/><circle cx="15" cy="12" r="1" fill="#7C3AED"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Salas</div>
                    <div style={{ fontSize:11, color:"#7A95B2", marginTop:3 }}>Calendário e reservas</div>
                  </div>
                </button>

                <button onClick={() => navigate("/equipamentos")}
                  style={{ ...card, padding:"18px 20px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14, transition:"box-shadow 0.15s" }}>
                  <div style={{ width:44, height:44, borderRadius:11, background:"#cffafe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="1"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Equipamentos</div>
                    <div style={{ fontSize:11, color:"#7A95B2", marginTop:3 }}>Notebooks, projetores...</div>
                  </div>
                </button>

                <button onClick={() => navigate("/usuario/indenizacoes")}
                  style={{ ...card, padding:"18px 20px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14, transition:"box-shadow 0.15s" }}>
                  <div style={{ width:44, height:44, borderRadius:11, background:"#d1fae5", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 6v12M18 6v12"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Indenização de Transporte</div>
                    <div style={{ fontSize:11, color:"#7A95B2", marginTop:3 }}>Veículo próprio e boletins</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
