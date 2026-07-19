import { Sidebar } from "../../components/layout/Sidebar";
import { CalendarioGrade } from "../../components/CalendarioGrade";
import { ModalConfirm } from "../../components/ModalConfirm";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";

interface Sala { id:string; nome:string; capacidade:number; localizacao:string; equipamentos:string; ativo:boolean; }
interface ReservaSala { id:string; salaId:string; salaNome:string; responsavelId:string; responsavelNome:string; responsavelSetor:string; motivo:string; dataInicio:string; dataFim:string; status:string; }

const STATUS_SALAS = {
  confirmada: { cor:"#3B82F6", label:"Reservada" },
  cancelada:  { cor:"#94A3B8", label:"Cancelada" },
};

export default function Salas() {
  const { usuario, ehGestor, ehConsulta } = useAuth();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [reservas, setReservas] = useState<ReservaSala[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalSala, setModalSala] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ salaId:"", data:"", horaInicio:"", horaFim:"", motivo:"" });
  const [formSala, setFormSala] = useState({ nome:"", capacidade:"", localizacao:"", equipamentos:"" });
  const [confirmCancelar, setConfirmCancelar] = useState<ReservaSala|null>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const [salasSnap, reservasSnap] = await Promise.all([
      getDocs(query(collection(db, "salas"), limit(200))),
      getDocs(query(collection(db, "reservasSalas"), where("status","==","confirmada"), limit(200))),
    ]);
    setSalas(salasSnap.docs.map(d => ({ id:d.id, ...d.data() } as Sala)));
    setReservas(reservasSnap.docs.map(d => ({ id:d.id, ...d.data() } as ReservaSala)));
    setCarregando(false);
  }

  function verificarConflito(salaId: string, inicio: string, fim: string): boolean {
    const novoInicio = new Date(inicio).getTime(), novoFim = new Date(fim).getTime();
    return reservas.some(r => {
      if (r.salaId !== salaId) return false;
      const i = new Date(r.dataInicio).getTime(), f = new Date(r.dataFim).getTime();
      return novoInicio < f && novoFim > i;
    });
  }

  async function reservar(e: React.FormEvent) {
    e.preventDefault(); setErro("");
    if (!form.salaId || !form.data || !form.horaInicio || !form.horaFim || !form.motivo) {
      setErro("Preencha todos os campos."); return;
    }
    const dataInicio = `${form.data}T${form.horaInicio}`;
    const dataFim = `${form.data}T${form.horaFim}`;
    if (dataFim <= dataInicio) { setErro("O horário final deve ser depois do inicial."); return; }
    if (verificarConflito(form.salaId, dataInicio, dataFim)) {
      setErro("Esta sala já está reservada nesse horário. Escolha outro horário ou outra sala."); return;
    }
    setEnviando(true);
    try {
      const sala = salas.find(s => s.id === form.salaId);
      await addDoc(collection(db, "reservasSalas"), {
        salaId: form.salaId, salaNome: sala?.nome || "",
        responsavelId: usuario?.uid, responsavelNome: usuario?.nome, responsavelSetor: usuario?.setor,
        motivo: form.motivo, dataInicio, dataFim, status: "confirmada", criadoEm: serverTimestamp(),
      });
      setModal(false);
      setForm({ salaId:"", data:"", horaInicio:"", horaFim:"", motivo:"" });
      await carregar();
    } catch (err) { console.error(err); setErro("Erro ao reservar. Tente novamente."); }
    finally { setEnviando(false); }
  }

  async function cancelar(r: ReservaSala) {
    await updateDoc(doc(db, "reservasSalas", r.id), { status: "cancelada" });
    setConfirmCancelar(null);
    await carregar();
  }

  async function cadastrarSala(e: React.FormEvent) {
    e.preventDefault();
    if (!formSala.nome || !formSala.capacidade) return;
    await addDoc(collection(db, "salas"), {
      nome: formSala.nome, capacidade: Number(formSala.capacidade), localizacao: formSala.localizacao, equipamentos: formSala.equipamentos, ativo: true,
    });
    setModalSala(false);
    setFormSala({ nome:"", capacidade:"", localizacao:"", equipamentos:"" });
    await carregar();
  }

  function podeCancelar(r: ReservaSala) {
    return ehGestor || r.responsavelId === usuario?.uid;
  }

  const proximasReservas = reservas
    .filter(r => new Date(r.dataFim) >= new Date())
    .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

  return (
    <div style={s.page}>
      <Sidebar perfil={usuario?.perfil ?? "consulta"} />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Salas</div>
            <div style={s.sub}>Calendário e reservas de salas de reunião</div>
          </div>
          {!ehConsulta && <button onClick={() => setModal(true)} style={s.btnNovo}>+ Nova Reserva</button>}
        </div>

        <div style={s.grid}>
          <div style={s.card}>
            <CalendarioGrade
              colecao="reservasSalas"
              titulo="Salas"
              subtitulo="Disponibilidade das salas de reunião"
              tema="claro"
              campoTitulo="salaNome"
              campoDataInicio="dataInicio"
              campoDataFim="dataFim"
              statusMap={STATUS_SALAS}
              statusFiltro={["confirmada"]}
            />
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {ehGestor && (
              <div style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Salas cadastradas ({salas.length})</div>
                  <button onClick={() => setModalSala(true)} style={s.btnMini}>+ Nova sala</button>
                </div>
                {salas.length === 0 ? (
                  <div style={s.vazio}>Nenhuma sala cadastrada ainda.</div>
                ) : salas.map(sala => (
                  <div key={sala.id} style={s.linhaSala}>
                    <div>🚪 {sala.nome} · {sala.capacidade} lugares{sala.localizacao ? ` · ${sala.localizacao}` : ""}</div>
                    {sala.equipamentos && <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>🖥️ {sala.equipamentos}</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={s.card}>
              <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:10 }}>Próximas reservas</div>
              {carregando ? (
                <div style={s.vazio}>Carregando...</div>
              ) : proximasReservas.length === 0 ? (
                <div style={s.vazio}>Nenhuma reserva futura.</div>
              ) : proximasReservas.map(r => (
                <div key={r.id} style={s.linhaReserva}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#0F172A" }}>{r.salaNome}</div>
                  <div style={{ fontSize:11, color:"#7A95B2" }}>
                    {new Date(r.dataInicio).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
                    {" – "}
                    {new Date(r.dataFim).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                  <div style={{ fontSize:11, color:"#94A3B8" }}>{r.responsavelNome} · {r.motivo}</div>
                  {podeCancelar(r) && (
                    <button onClick={() => setConfirmCancelar(r)} style={s.btnCancelar}>Cancelar</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {modal && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-reserva-titulo">
          <div style={s.modal}>
            <h2 id="modal-reserva-titulo" style={s.modalTitulo}>Nova Reserva de Sala</h2>
            <form onSubmit={reservar} style={{ display:"flex", flexDirection:"column", gap:"0.85rem" }}>
              <div>
                <label style={s.label}>Sala</label>
                <select value={form.salaId} onChange={e => setForm(p => ({ ...p, salaId:e.target.value }))} style={s.input}>
                  <option value="">Selecione...</option>
                  {salas.filter(sl => sl.ativo).map(sala => (
                    <option key={sala.id} value={sala.id}>{sala.nome} ({sala.capacidade} lugares)</option>
                  ))}
                </select>
                {form.salaId && salas.find(sl => sl.id === form.salaId)?.equipamentos && (
                  <div style={{ fontSize:11, color:"#7A95B2", marginTop:5 }}>
                    🖥️ {salas.find(sl => sl.id === form.salaId)?.equipamentos}
                  </div>
                )}
              </div>
              <div>
                <label style={s.label}>Data</label>
                <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data:e.target.value }))} style={s.input} />
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1 }}>
                  <label style={s.label}>Início</label>
                  <input type="time" value={form.horaInicio} onChange={e => setForm(p => ({ ...p, horaInicio:e.target.value }))} style={s.input} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={s.label}>Fim</label>
                  <input type="time" value={form.horaFim} onChange={e => setForm(p => ({ ...p, horaFim:e.target.value }))} style={s.input} />
                </div>
              </div>
              <div>
                <label style={s.label}>Motivo</label>
                <input type="text" placeholder="Reunião de equipe" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo:e.target.value }))} style={s.input} />
              </div>
              {erro && <div role="alert" style={s.erro}>{erro}</div>}
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:6 }}>
                <button type="button" onClick={() => { setModal(false); setErro(""); }} style={s.btnSecundario}>Cancelar</button>
                <button type="submit" disabled={enviando} style={s.btnPrimario}>{enviando ? "Reservando..." : "Confirmar Reserva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalSala && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-sala-titulo">
          <div style={s.modal}>
            <h2 id="modal-sala-titulo" style={s.modalTitulo}>Nova Sala</h2>
            <form onSubmit={cadastrarSala} style={{ display:"flex", flexDirection:"column", gap:"0.85rem" }}>
              <div>
                <label style={s.label}>Nome</label>
                <input type="text" placeholder="Sala de Reuniões 1" value={formSala.nome} onChange={e => setFormSala(p => ({ ...p, nome:e.target.value }))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Capacidade</label>
                <input type="number" min="1" placeholder="8" value={formSala.capacidade} onChange={e => setFormSala(p => ({ ...p, capacidade:e.target.value }))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Localização</label>
                <input type="text" placeholder="2º andar" value={formSala.localizacao} onChange={e => setFormSala(p => ({ ...p, localizacao:e.target.value }))} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Equipamentos</label>
                <input type="text" placeholder="Projetor, TV Smart..." value={formSala.equipamentos} onChange={e => setFormSala(p => ({ ...p, equipamentos:e.target.value }))} style={s.input} />
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:6 }}>
                <button type="button" onClick={() => setModalSala(false)} style={s.btnSecundario}>Cancelar</button>
                <button type="submit" style={s.btnPrimario}>Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmCancelar && (
        <ModalConfirm
          titulo="Cancelar Reserva"
          mensagem={`Deseja cancelar a reserva de ${confirmCancelar.salaNome}? Esta ação não pode ser desfeita.`}
          labelConfirmar="Sim, cancelar"
          labelCancelar="Voltar"
          corConfirmar="#EF4444"
          onConfirmar={() => cancelar(confirmCancelar)}
          onCancelar={() => setConfirmCancelar(null)}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:        { display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora', system-ui, sans-serif" },
  main:        { flex:1, display:"flex", flexDirection:"column", minWidth:0, overflowY:"auto" },
  topbar:      { background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 },
  title:       { fontSize:18, fontWeight:700, color:"#0F172A" },
  sub:         { color:"#7A95B2", fontSize:12, marginTop:2 },
  btnNovo:     { background:"#1E3A8A", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer" },
  btnMini:     { background:"#F1F5F9", color:"#1E3A8A", border:"1px solid #E1EAF5", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" },
  grid:        { padding:"20px 24px", flex:1, overflowY:"auto", display:"grid", gridTemplateColumns:"1fr 320px", gap:16, alignItems:"start" },
  card:        { background:"#ffffff", border:"1px solid #E1EAF5", borderRadius:14, padding:"1.25rem", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  vazio:       { fontSize:12, color:"#94A3B8" },
  linhaSala:   { fontSize:12, color:"#334155", padding:"4px 0", borderBottom:"1px solid #F1F5F9" },
  linhaReserva:{ padding:"8px 0", borderBottom:"1px solid #F1F5F9" },
  btnCancelar: { marginTop:4, padding:"4px 10px", border:"1px solid #fecaca", borderRadius:6, background:"#fff5f5", color:"#991b1b", fontSize:11, fontWeight:600, cursor:"pointer" },
  overlay:     { position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(2px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:       { background:"#ffffff", borderRadius:16, padding:"1.75rem", width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" },
  modalTitulo: { fontSize:17, fontWeight:700, color:"#0F172A", marginTop:0, marginBottom:"1.25rem" },
  label:       { display:"block", fontSize:12, color:"#5A7A9A", marginBottom:4, fontWeight:600 },
  input:       { width:"100%", padding:"9px 12px", border:"1px solid #E1EAF5", borderRadius:8, fontSize:13, boxSizing:"border-box", background:"#fff", color:"#0F172A", fontFamily:"inherit" },
  erro:        { background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#DC2626", fontWeight:500 },
  btnPrimario: { padding:"10px 20px", border:"none", borderRadius:8, background:"#1E3A8A", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" },
  btnSecundario:{ padding:"10px 20px", border:"1px solid #E1EAF5", borderRadius:8, background:"#F1F5F9", color:"#5A7A9A", fontSize:13, fontWeight:600, cursor:"pointer" },
};
