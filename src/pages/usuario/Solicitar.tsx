import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, setDoc, doc, serverTimestamp, query, where, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Veiculo { id:string; placa:string; modelo:string; marca:string; tipo:string; categoriaUso?:string; }

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #E1EAF5",
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "#ffffff",
  border: "1px solid #E1EAF5",
  borderRadius: 8, fontSize: 14,
  boxSizing: "border-box", fontFamily: "inherit",
  color: "#0F172A",
};

export default function Solicitar() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [protocoloGerado, setProtocoloGerado] = useState("");
  const [erroCon, setErroCon] = useState("");
  const [form, setForm] = useState({ veiculoId:"", veiculoPlaca:"", destino:"", motivo:"", descricao:"", dataSaida:"", dataRetorno:"" });

  useEffect(() => {
    async function carregar() {
      const snap = await getDocs(query(collection(db, "veiculos"), where("status","==","disponivel"), limit(200)));
      setVeiculos(snap.docs.map(d => ({ id:d.id, ...d.data() } as Veiculo)));
    }
    carregar();
  }, []);

  function gerarProtocolo() { return "SOL" + Date.now().toString().slice(-6); }

  async function verificarConflito(veiculoPlaca: string, dataSaida: string, dataRetorno: string): Promise<boolean> {
    // Lê do mirror público (não-sensível) em vez de 'solicitacoes' — evita que a checagem de
    // conflito precise de leitura ampla da coleção sensível (LGPD, ver PLANO.md Fase 5).
    const snap = await getDocs(query(collection(db, "calendarioPublico"), where("veiculoPlaca","==",veiculoPlaca), limit(200)));
    const novaSaida = new Date(dataSaida).getTime(), novoRetorno = new Date(dataRetorno).getTime();
    for (const d of snap.docs) {
      const sol = d.data();
      if (!["pendente","aprovada","em_uso"].includes(sol.status)) continue;
      const saida = new Date(sol.dataSaida).getTime(), retorno = new Date(sol.dataRetorno).getTime();
      if (novaSaida < retorno && novoRetorno > saida) return true;
    }
    return false;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setErroCon("");
    if (!form.veiculoId || !form.destino || !form.motivo || !form.dataSaida || !form.dataRetorno) {
      setErroCon("Preencha todos os campos obrigatórios."); return;
    }
    if (new Date(form.dataRetorno) <= new Date(form.dataSaida)) {
      setErroCon("A data de retorno deve ser posterior à data de saída."); return;
    }
    // Validação de CNH
    if (usuario?.vencimentoCnh) {
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const vencimento = new Date(usuario.vencimentoCnh + "T00:00:00");
      if (vencimento < hoje) {
        setErroCon(`Sua CNH venceu em ${new Date(usuario.vencimentoCnh + "T00:00:00").toLocaleDateString("pt-BR")}. Regularize sua habilitação antes de solicitar um veículo.`);
        return;
      }
      const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000*60*60*24));
      if (diasRestantes <= 30) {
        setErroCon(`⚠️ Atenção: sua CNH vence em ${diasRestantes} dia(s) (${new Date(usuario.vencimentoCnh + "T00:00:00").toLocaleDateString("pt-BR")}). Providencie a renovação.`);
        // Aviso, não bloqueia
      }
    }
    setEnviando(true);
    try {
      const conflito = await verificarConflito(form.veiculoPlaca, form.dataSaida, form.dataRetorno);
      if (conflito) {
        setErroCon("Este veículo já possui um agendamento neste período. Escolha outra data ou outro veículo.");
        setEnviando(false); return;
      }
      const protocolo = gerarProtocolo();
      const novaSolicitacao = await addDoc(collection(db, "solicitacoes"), {
        ...form, protocolo,
        condutorId: usuario?.uid, condutorNome: usuario?.nome, condutorSetor: usuario?.setor,
        status: "pendente", criadoEm: serverTimestamp(),
      });
      // Mirror não-sensível no calendarioPublico já na criação (não só na aprovação) —
      // é o que permite a checagem de conflito acima ler um dado público em vez de 'solicitacoes'.
      await setDoc(doc(db, "calendarioPublico", novaSolicitacao.id), {
        veiculoPlaca: form.veiculoPlaca,
        dataSaida: form.dataSaida,
        dataRetorno: form.dataRetorno,
        status: "pendente",
      });
      setProtocoloGerado(protocolo);
      setSucesso(true);
    } catch(e) { console.error(e); setErroCon("Erro ao enviar solicitação. Tente novamente."); }
    finally { setEnviando(false); }
  }

  if (sucesso) return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora',system-ui,sans-serif" }}>
      <Sidebar perfil="usuario" />
      <main style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ ...card, padding:"3rem 2.5rem", textAlign:"center", maxWidth:420 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
          <h2 style={{ fontSize:22, fontWeight:800, color:"#0F172A", marginBottom:8 }}>Solicitação Enviada!</h2>
          {protocoloGerado && (
            <div style={{ display:"inline-block", background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8, padding:"6px 16px", fontSize:13, fontWeight:700, color:"#1E3A8A", marginBottom:12, letterSpacing:1 }}>
              Protocolo #{protocoloGerado}
            </div>
          )}
          <p style={{ color:"#7A95B2", marginBottom:28, fontSize:14 }}>Sua solicitação foi registrada e está aguardando aprovação do gestor.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={() => navigate("/usuario/solicitacoes")} style={{ padding:"10px 22px", background:"#1E3A8A", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>Ver Minhas Solicitações</button>
            <button onClick={() => { setSucesso(false); setErroCon(""); setForm({ veiculoId:"", veiculoPlaca:"", destino:"", motivo:"", descricao:"", dataSaida:"", dataRetorno:"" }); }} style={{ padding:"10px 22px", background:"#F1F5F9", color:"#334155", border:"1px solid #E1EAF5", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>Nova Solicitação</button>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora',system-ui,sans-serif" }}>
      <Sidebar perfil="usuario" />

      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Topbar */}
        <div style={{ background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"16px 28px", flexShrink:0 }}>
          <div style={{ fontSize:18, fontWeight:700, color:"#0F172A" }}>Nova Solicitação</div>
          <div style={{ fontSize:12, color:"#7A95B2", marginTop:2 }}>Preencha os dados para solicitar um veículo</div>
        </div>

        <div style={{ padding:"24px 28px", flex:1, overflowY:"auto" }}>
          <form onSubmit={enviar} style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:700 }}>

            {/* Seção Veículo */}
            <div style={{ ...card, padding:"22px 24px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#7A95B2", marginBottom:16, textTransform:"uppercase", letterSpacing:0.5 }}>Veículo</div>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Veículo Disponível *</label>
                <select value={form.veiculoId} onChange={e => { const v=veiculos.find(x=>x.id===e.target.value); setForm(p=>({ ...p, veiculoId:e.target.value, veiculoPlaca:v?.placa||"" })); setErroCon(""); }} style={inputStyle} required>
                  <option value="">Selecione um veículo</option>
                  {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo} ({v.tipo})</option>)}
                </select>
                {veiculos.length === 0 && <p style={{ fontSize:12, color:"#D97706", marginTop:6 }}>⚠️ Nenhum veículo disponível no momento.</p>}
              </div>
            </div>

            {/* Seção Viagem */}
            <div style={{ ...card, padding:"22px 24px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#7A95B2", marginBottom:16, textTransform:"uppercase", letterSpacing:0.5 }}>Viagem</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Destino *</label>
                  <input value={form.destino} onChange={e=>setForm(p=>({...p,destino:e.target.value}))} style={inputStyle} placeholder="Ex: Hospital CGE-MS" required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Motivo *</label>
                  <input value={form.motivo} onChange={e=>setForm(p=>({...p,motivo:e.target.value}))} style={inputStyle} placeholder="Ex: Transporte de pacientes" required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Data/Hora de Saída *</label>
                  <input type="datetime-local" value={form.dataSaida} onChange={e=>{ setForm(p=>({...p,dataSaida:e.target.value})); setErroCon(""); }} style={inputStyle} required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Data/Hora de Retorno *</label>
                  <input type="datetime-local" value={form.dataRetorno} onChange={e=>{ setForm(p=>({...p,dataRetorno:e.target.value})); setErroCon(""); }} style={inputStyle} required />
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:6, fontWeight:600 }}>Descrição / Observações</label>
                <textarea value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} style={{ ...inputStyle, height:80, resize:"vertical" }} placeholder="Detalhes adicionais sobre a viagem..." />
              </div>
            </div>

            {erroCon && (
              <div role="alert" style={{ background:"#fff5f5", border:"1px solid #fecaca", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#991b1b", fontWeight:500 }}>
                ⚠️ {erroCon}
              </div>
            )}

            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#1e40af" }}>
              ℹ️ Sua solicitação será analisada pelo gestor. Você receberá a aprovação ou recusa em breve.
            </div>

            <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
              <button type="button" onClick={() => navigate("/usuario")} style={{ padding:"10px 24px", background:"#F1F5F9", color:"#334155", border:"1px solid #E1EAF5", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
              <button type="submit" disabled={enviando} style={{ padding:"10px 24px", background: enviando ? "#94A3B8" : "#1E3A8A", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor: enviando ? "not-allowed" : "pointer" }}>
                {enviando ? "Verificando..." : "Enviar Solicitação"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
