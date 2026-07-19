import { useEffect, useState } from "react";
import { ModalConfirm } from "./ModalConfirm";
import { collection, getDocs, doc, updateDoc, query, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";

interface Solicitacao {
  id: string;
  protocolo: string;
  condutorNome: string;
  condutorId: string;
  veiculoPlaca: string;
  destino: string;
  dataSaida: string;
  dataRetorno: string;
  status: string;
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const statusCor: Record<string, string> = {
  aprovada:  "#22c55e",
  em_uso:    "#3b82f6",
  pendente:  "#f59e0b",
  concluida: "#94a3b8",
  recusada:  "#ef4444",
};

export default function Calendario() {
  const { usuario, ehGestor } = useAuth();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Solicitacao | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState<Solicitacao | null>(null);

  useEffect(() => { carregar(); }, [mes, ano]);

  async function carregar() {
    const snap = await getDocs(query(collection(db, "solicitacoes"), limit(500)));
    const todas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Solicitacao));
    setSolicitacoes(todas.filter(s => s.status !== "recusada" && s.status !== "cancelada"));
  }

  async function cancelar(sol: Solicitacao) {
    setCancelando(true);
    await updateDoc(doc(db, "solicitacoes", sol.id), { status: "recusada" });
    setDetalhe(null);
    setSelecionado(null);
    await carregar();
    setCancelando(false);
  }

  // Gerar dias do mês
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const diasArray = Array.from({ length: primeiroDia + totalDias }, (_, i) =>
    i < primeiroDia ? null : i - primeiroDia + 1
  );

  function solDodia(dia: number): Solicitacao[] {
    const dataStr = `${ano}-${String(mes + 1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    return solicitacoes.filter(s => {
      const saida = s.dataSaida?.slice(0, 10);
      const retorno = s.dataRetorno?.slice(0, 10);
      return saida <= dataStr && dataStr <= retorno;
    });
  }

  function podeCancelar(sol: Solicitacao) {
    return ehGestor || sol.condutorId === usuario?.uid;
  }

  return (
    <div style={s.wrap}>
      {/* Cabeçalho do calendário */}
      <div style={s.header}>
        <button onClick={() => { if (mes === 0) { setMes(11); setAno(a => a-1); } else setMes(m => m-1); }} style={s.navBtn}>‹</button>
        <span style={s.mesAno}>{MESES[mes]} {ano}</span>
        <button onClick={() => { if (mes === 11) { setMes(0); setAno(a => a+1); } else setMes(m => m+1); }} style={s.navBtn}>›</button>
      </div>

      {/* Legenda */}
      <div style={s.legenda}>
        {Object.entries({ aprovada:"Aprovada", em_uso:"Em Uso", pendente:"Pendente", concluida:"Concluída" }).map(([k,v]) => (
          <div key={k} style={s.legendaItem}>
            <div style={{ width:10, height:10, borderRadius:2, background:statusCor[k] }} />
            <span>{v}</span>
          </div>
        ))}
      </div>

      {/* Grid de dias da semana */}
      <div style={s.grid7}>
        {DIAS_SEMANA.map(d => <div key={d} style={s.diaLabel}>{d}</div>)}
      </div>

      {/* Grid de dias */}
      <div style={s.grid7}>
        {diasArray.map((dia, i) => {
          if (!dia) return <div key={i} />;
          const eventos = solDodia(dia);
          const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
          const diaStr = `${ano}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
          const selecionadoNoDia = selecionado === diaStr;
          return (
            <div key={i} onClick={() => setSelecionado(selecionadoNoDia ? null : diaStr)}
              style={{ ...s.dia, ...(isHoje ? s.diaHoje : {}), ...(selecionadoNoDia ? s.diaSelecionado : {}), cursor: eventos.length > 0 ? "pointer" : "default" }}>
              <span style={s.diaNum}>{dia}</span>
              <div style={s.eventos}>
                {eventos.slice(0,2).map(e => (
                  <div key={e.id} onClick={ev => { ev.stopPropagation(); setDetalhe(e); }}
                    style={{ ...s.evento, background: statusCor[e.status] || "#94a3b8" }}
                    title={`${e.veiculoPlaca} — ${e.destino}`}>
                    🚗 {e.veiculoPlaca}
                  </div>
                ))}
                {eventos.length > 2 && <div style={s.mais}>+{eventos.length - 2} mais</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de detalhe */}
      {detalhe && (
        <div style={s.overlay} onClick={() => setDetalhe(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:12, color:"#9ca3af", fontWeight:600 }}>#{detalhe.protocolo || detalhe.id.slice(0,8).toUpperCase()}</div>
                <div style={{ fontSize:18, fontWeight:700, color:"#1e293b", marginTop:2 }}>{detalhe.destino}</div>
              </div>
              <button onClick={() => setDetalhe(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>✕</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
              <Row icon="🚗" label="Veículo" valor={detalhe.veiculoPlaca} />
              <Row icon="👤" label="Condutor" valor={detalhe.condutorNome} />
              <Row icon="📅" label="Saída" valor={detalhe.dataSaida?.replace("T"," ")} />
              <Row icon="🔙" label="Retorno" valor={detalhe.dataRetorno?.replace("T"," ")} />
              <Row icon="📝" label="Status" valor={detalhe.status} cor={statusCor[detalhe.status]} />
            </div>

            {podeCancelar(detalhe) && detalhe.status !== "concluida" && detalhe.status !== "recusada" && (
              <button onClick={() => setConfirmCancelar(detalhe)} disabled={cancelando}
                style={{ width:"100%", padding:"10px", background:"#ef4444", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>
                {cancelando ? "Cancelando..." : "✕ Cancelar Agendamento"}
              </button>
            )}
          </div>
        </div>
      )}

      {confirmCancelar && (
        <ModalConfirm
          titulo="Cancelar Agendamento"
          mensagem={`Deseja cancelar o agendamento de ${confirmCancelar.veiculoPlaca} para ${confirmCancelar.condutorNome}? Esta ação não pode ser desfeita.`}
          labelConfirmar="Sim, cancelar"
          labelCancelar="Voltar"
          corConfirmar="#EF4444"
          onConfirmar={() => { cancelar(confirmCancelar); setConfirmCancelar(null); }}
          onCancelar={() => setConfirmCancelar(null)}
        />
      )}
    </div>
  );
}

function Row({ icon, label, valor, cor }: { icon:string; label:string; valor:string; cor?:string }) {
  return (
    <div style={{ display:"flex", gap:8, fontSize:13 }}>
      <span>{icon}</span>
      <span style={{ color:"#9ca3af", minWidth:60 }}>{label}:</span>
      <span style={{ color: cor || "#1e293b", fontWeight: cor ? 600 : 400 }}>{valor}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap:         { background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"1.25rem" },
  header:       { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" },
  navBtn:       { background:"none", border:"1px solid #e2e8f0", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", color:"#374151" },
  mesAno:       { fontSize:16, fontWeight:700, color:"#1e293b" },
  legenda:      { display:"flex", gap:12, flexWrap:"wrap", marginBottom:"1rem" },
  legendaItem:  { display:"flex", alignItems:"center", gap:4, fontSize:12, color:"#64748b" },
  grid7:        { display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2 },
  diaLabel:     { textAlign:"center", fontSize:11, fontWeight:600, color:"#94a3b8", padding:"4px 0", textTransform:"uppercase" },
  dia:          { minHeight:70, border:"1px solid #f1f5f9", borderRadius:6, padding:"4px", background:"#fafafa" },
  diaHoje:      { border:"2px solid #3b82f6", background:"#eff6ff" },
  diaSelecionado:{ background:"#f0fdf4", border:"1px solid #86efac" },
  diaNum:       { fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:2 },
  eventos:      { display:"flex", flexDirection:"column", gap:2 },
  evento:       { fontSize:10, color:"#fff", borderRadius:3, padding:"1px 4px", cursor:"pointer", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  mais:         { fontSize:10, color:"#94a3b8" },
  overlay:      { position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(2px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:        { background:"#fff", borderRadius:16, padding:"1.5rem", width:"100%", maxWidth:380, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" },
};
