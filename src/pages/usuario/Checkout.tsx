import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { doc, getDoc, addDoc, updateDoc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
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

export default function Checkout() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const [solicitacao, setSolicitacao] = useState<Record<string,string> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ kmSaida:"", combustivelSaida:"cheio", observacoes:"" });

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      const snap = await getDoc(doc(db, "solicitacoes", id));
      if (snap.exists()) setSolicitacao({ id:snap.id, ...snap.data() } as Record<string,string>);
      setCarregando(false);
    }
    carregar();
  }, [id]);

  async function confirmarSaida() {
    setErro("");
    if (!form.kmSaida) { setErro("Informe a quilometragem atual do veículo."); return; }
    if (!id || !solicitacao) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, "usos"), {
        solicitacaoId:id, veiculoId:solicitacao.veiculoId, condutorId:usuario?.uid,
        kmSaida:Number(form.kmSaida), combustivelSaida:form.combustivelSaida,
        observacoes:form.observacoes, status:"em_uso", saidaEm:serverTimestamp(),
      });
      await updateDoc(doc(db, "solicitacoes", id), { status:"em_uso" });
      await updateDoc(doc(db, "veiculos", solicitacao.veiculoId), { status:"em_uso", kmAtual:Number(form.kmSaida) });
      await setDoc(doc(db, "calendarioPublico", id), { status:"em_uso" }, { merge: true });
      navigate("/usuario/solicitacoes");
    } catch(e) { console.error(e); setErro("Erro ao registrar saída. Tente novamente."); }
    finally { setEnviando(false); }
  }

  const niveis = ["reserva","1/4","1/2","3/4","cheio"];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora',system-ui,sans-serif" }}>
      <Sidebar perfil="usuario" />

      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Topbar */}
        <div style={{ background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"16px 28px", flexShrink:0 }}>
          <button onClick={() => navigate("/usuario/solicitacoes")} style={{ background:"none", border:"none", color:"#7A95B2", fontSize:13, cursor:"pointer", padding:0, marginBottom:6, display:"block" }}>← Voltar</button>
          <div style={{ fontSize:18, fontWeight:700, color:"#0F172A" }}>Retirada do Veículo</div>
          <div style={{ fontSize:12, color:"#7A95B2", marginTop:2 }}>Registre os dados de saída antes de usar o veículo</div>
        </div>

        <div style={{ padding:"24px 28px", flex:1, overflowY:"auto" }}>
          {carregando ? (
            <div style={{ textAlign:"center", padding:"5rem", color:"#7A95B2" }}>Carregando...</div>
          ) : !solicitacao ? (
            <div style={{ textAlign:"center", padding:"5rem", color:"#7A95B2" }}>Solicitação não encontrada.</div>
          ) : (
            <div style={{ maxWidth:620 }}>
              {/* Info da solicitação */}
              <div style={{ ...card, padding:"20px 22px", marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#7A95B2", textTransform:"uppercase", letterSpacing:0.5, marginBottom:14 }}>Dados da Solicitação</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:14 }}>
                  <InfoItem label="Veículo" valor={solicitacao.veiculoPlaca} />
                  <InfoItem label="Destino" valor={solicitacao.destino} />
                  <InfoItem label="Motivo" valor={solicitacao.motivo} />
                  <InfoItem label="Saída prevista" valor={solicitacao.dataSaida} />
                  <InfoItem label="Retorno previsto" valor={solicitacao.dataRetorno} />
                </div>
              </div>

              {/* Formulário */}
              <div style={{ ...card, padding:"20px 22px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#7A95B2", textTransform:"uppercase", letterSpacing:0.5, marginBottom:18 }}>Dados de Saída</div>

                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Quilometragem atual *</label>
                  <input type="number" placeholder="Ex: 45230" value={form.kmSaida} onChange={e=>setForm(p=>({...p,kmSaida:e.target.value}))} style={inputStyle} />
                  <p style={{ fontSize:11, color:"#7A95B2", marginTop:4 }}>Confirme o km marcado no painel do veículo</p>
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:8, fontWeight:600 }}>Nível de combustível</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {niveis.map(n => (
                      <button key={n} onClick={() => setForm(p=>({...p,combustivelSaida:n}))}
                        style={{ padding:"8px 16px", borderRadius:8, border:`2px solid ${form.combustivelSaida===n ? "#3B82F6" : "#E1EAF5"}`, fontSize:13, cursor:"pointer", fontWeight:600,
                          background: form.combustivelSaida===n ? "#dbeafe" : "#F8FAFC",
                          color: form.combustivelSaida===n ? "#1e40af" : "#5A7A9A" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Observações</label>
                  <textarea placeholder="Condição do veículo, avarias existentes..." value={form.observacoes} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} style={{ ...inputStyle, height:80, resize:"vertical" }} />
                </div>

                <div style={{ background:"#fef9c3", border:"1px solid #fde68a", borderRadius:8, padding:"12px 14px", fontSize:13, color:"#854d0e", marginBottom:20 }}>
                  ⚠️ Ao confirmar, você declara ter vistoriado o veículo e está ciente das condições atuais.
                </div>

                {erro && (
                  <div role="alert" style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:12, fontWeight:500 }}>
                    ⚠️ {erro}
                  </div>
                )}
                <button onClick={confirmarSaida} disabled={enviando}
                  style={{ width:"100%", padding:"12px", background: enviando ? "#94A3B8" : "#22C55E", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor: enviando ? "not-allowed" : "pointer" }}>
                  {enviando ? "Registrando..." : "✓ Confirmar Retirada"}
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
