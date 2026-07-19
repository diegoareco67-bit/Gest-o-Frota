import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { doc, getDoc, getDocs, updateDoc, setDoc, collection, query, where, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNavigate, useParams } from "react-router-dom";

const card: React.CSSProperties = {
  background:"#ffffff", border:"1px solid #E1EAF5",
  borderRadius:14, boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
};
const inputStyle: React.CSSProperties = {
  width:"100%", padding:"10px 14px",
  background:"#ffffff", border:"1px solid #E1EAF5",
  borderRadius:8, fontSize:14, boxSizing:"border-box", fontFamily:"inherit",
  color:"#0F172A",
};

export default function Checkin() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [solicitacao, setSolicitacao] = useState<Record<string,string> | null>(null);
  const [uso, setUso] = useState<Record<string,unknown> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ kmChegada:"", combustivelChegada:"cheio", tipoOcorrencia:"normal", observacoes:"" });

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      const solSnap = await getDoc(doc(db, "solicitacoes", id));
      if (solSnap.exists()) {
        setSolicitacao({ id:solSnap.id, ...solSnap.data() } as Record<string,string>);
        const usoSnap = await getDocs(query(collection(db, "usos"), where("solicitacaoId","==",id), limit(1)));
        if (!usoSnap.empty) setUso({ id:usoSnap.docs[0].id, ...usoSnap.docs[0].data() });
      }
      setCarregando(false);
    }
    carregar();
  }, [id]);

  async function confirmarDevolucao() {
    setErro("");
    if (!form.kmChegada) { setErro("Informe a quilometragem de chegada."); return; }
    if (form.tipoOcorrencia !== "normal" && !form.observacoes.trim()) { setErro("Descreva a ocorrência antes de confirmar."); return; }
    if (!id || !solicitacao || !uso) return;
    const kmSaida = Number(uso.kmSaida || 0), kmChegada = Number(form.kmChegada);
    if (kmChegada < kmSaida) { setErro("KM de chegada não pode ser menor que o de saída."); return; }
    setEnviando(true);
    try {
      const kmRodado = kmChegada - kmSaida;
      await updateDoc(doc(db, "usos", String(uso.id)), { kmChegada, combustivelChegada:form.combustivelChegada, tipoOcorrencia:form.tipoOcorrencia, observacoesChegada:form.observacoes, kmRodado, status:"concluido", chegadaEm:serverTimestamp() });
      await updateDoc(doc(db, "solicitacoes", id), { status:"concluida" });
      await updateDoc(doc(db, "veiculos", solicitacao.veiculoId), { status:"disponivel", kmAtual:kmChegada });
      await setDoc(doc(db, "calendarioPublico", id), { status:"concluida" }, { merge: true });
      navigate("/usuario/solicitacoes");
    } catch(e) { console.error(e); setErro("Erro ao registrar devolução. Tente novamente."); }
    finally { setEnviando(false); }
  }

  const niveis = ["reserva","1/4","1/2","3/4","cheio"];
  const kmSaida = Number(uso?.kmSaida || 0);
  const kmRodadoPreview = form.kmChegada && Number(form.kmChegada) > kmSaida ? Number(form.kmChegada) - kmSaida : null;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora',system-ui,sans-serif" }}>
      <Sidebar perfil="usuario" />

      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Topbar */}
        <div style={{ background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"16px 28px", flexShrink:0 }}>
          <button onClick={() => navigate("/usuario/solicitacoes")} style={{ background:"none", border:"none", color:"#7A95B2", fontSize:13, cursor:"pointer", padding:0, marginBottom:6, display:"block" }}>← Voltar</button>
          <div style={{ fontSize:18, fontWeight:700, color:"#0F172A" }}>Devolução do Veículo</div>
          <div style={{ fontSize:12, color:"#7A95B2", marginTop:2 }}>Registre os dados de chegada para concluir o uso</div>
        </div>

        <div style={{ padding:"24px 28px", flex:1, overflowY:"auto" }}>
          {carregando ? (
            <div style={{ textAlign:"center", padding:"5rem", color:"#7A95B2" }}>Carregando...</div>
          ) : !solicitacao ? (
            <div style={{ textAlign:"center", padding:"5rem", color:"#7A95B2" }}>Solicitação não encontrada.</div>
          ) : (
            <div style={{ maxWidth:620 }}>
              {/* Resumo */}
              <div style={{ ...card, padding:"20px 22px", marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#7A95B2", textTransform:"uppercase", letterSpacing:0.5, marginBottom:14 }}>Resumo da Viagem</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:14 }}>
                  <InfoItem label="Veículo" valor={solicitacao.veiculoPlaca} />
                  <InfoItem label="Destino" valor={solicitacao.destino} />
                  <InfoItem label="KM na Saída" valor={uso ? `${Number(uso.kmSaida).toLocaleString("pt-BR")} km` : "—"} />
                  <InfoItem label="Combustível na Saída" valor={String(uso?.combustivelSaida || "—")} />
                </div>
              </div>

              {/* Formulário */}
              <div style={{ ...card, padding:"20px 22px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#7A95B2", textTransform:"uppercase", letterSpacing:0.5, marginBottom:18 }}>Dados de Chegada</div>

                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Quilometragem de chegada *</label>
                  <input type="number" placeholder={`Mínimo: ${kmSaida.toLocaleString("pt-BR")} km`} value={form.kmChegada} onChange={e=>setForm(p=>({...p,kmChegada:e.target.value}))} style={inputStyle} />
                  {kmRodadoPreview !== null && (
                    <div style={{ marginTop:8, padding:"8px 12px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, fontSize:13, color:"#1e40af", fontWeight:500 }}>
                      📍 Total percorrido: {kmRodadoPreview.toLocaleString("pt-BR")} km
                    </div>
                  )}
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:8, fontWeight:600 }}>Nível de combustível na chegada</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {niveis.map(n => (
                      <button key={n} onClick={() => setForm(p=>({...p,combustivelChegada:n}))}
                        style={{ padding:"8px 16px", borderRadius:8, border:`2px solid ${form.combustivelChegada===n ? "#3B82F6" : "#E1EAF5"}`, fontSize:13, cursor:"pointer", fontWeight:600,
                          background: form.combustivelChegada===n ? "#dbeafe" : "#F8FAFC",
                          color: form.combustivelChegada===n ? "#1e40af" : "#5A7A9A" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:8, fontWeight:600 }}>Tipo de Ocorrência</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {[
                      { val:"normal",  label:"✅ Normal",   cor:"#22C55E", bg:"#dcfce7" },
                      { val:"avaria",  label:"🔧 Avaria",   cor:"#D97706", bg:"#fef9c3" },
                      { val:"sinistro",label:"⚠️ Sinistro", cor:"#EF4444", bg:"#fee2e2" },
                      { val:"multa",   label:"🚦 Multa",    cor:"#7C3AED", bg:"#ede9fe" },
                    ].map(o=>(
                      <button key={o.val} type="button" onClick={()=>setForm(p=>({...p,tipoOcorrencia:o.val}))}
                        style={{ padding:"8px 14px", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600,
                          border:`2px solid ${form.tipoOcorrencia===o.val ? o.cor : "#E1EAF5"}`,
                          background: form.tipoOcorrencia===o.val ? o.bg : "#F8FAFC",
                          color: form.tipoOcorrencia===o.val ? o.cor : "#5A7A9A" }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>
                    Observações {form.tipoOcorrencia !== "normal" ? "*" : ""}
                  </label>
                  <textarea
                    placeholder={form.tipoOcorrencia==="normal" ? "Condição geral do veículo, observações da viagem..." : "Descreva detalhadamente a ocorrência..."}
                    value={form.observacoes}
                    onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))}
                    style={{ ...inputStyle, height: form.tipoOcorrencia!=="normal" ? 100 : 80, resize:"vertical",
                      border: form.tipoOcorrencia!=="normal" && !form.observacoes ? "1px solid #fecaca" : "1px solid #E1EAF5" }} />
                  {form.tipoOcorrencia!=="normal" && !form.observacoes && (
                    <p style={{ fontSize:11, color:"#EF4444", marginTop:4 }}>Descreva a ocorrência antes de confirmar.</p>
                  )}
                </div>

                <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"12px 14px", fontSize:13, color:"#166534", marginBottom:20 }}>
                  ✓ Ao confirmar, o veículo será liberado como disponível para outros condutores.
                </div>

                {erro && (
                  <div role="alert" style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:12, fontWeight:500 }}>
                    ⚠️ {erro}
                  </div>
                )}

                <button onClick={confirmarDevolucao} disabled={enviando}
                  style={{ width:"100%", padding:"12px", background: enviando ? "#94A3B8" : "#1E3A8A", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor: enviando ? "not-allowed" : "pointer" }}>
                  {enviando ? "Registrando..." : "✓ Confirmar Devolução"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, valor }: { label:string; valor:string }) {
  return (
    <div>
      <div style={{ fontSize:10, color:"#7A95B2", fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:14, color:"#0F172A", fontWeight:500 }}>{valor || "—"}</div>
    </div>
  );
}
