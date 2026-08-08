import { Sidebar } from "../../components/layout/Sidebar";
import { CalendarioGrade } from "../../components/CalendarioGrade";
import { ModalConfirm } from "../../components/ModalConfirm";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";
import { useEscClose } from "../../hooks/useEscClose";
import { intervalosSobrepoem } from "../../utils/conflitoHorario";
import { validarPeriodo, EXPEDIENTE_INICIO, EXPEDIENTE_FIM } from "../../utils/periodo";
import { CampoHora } from "../../components/CampoHora";
import { SkeletonLista } from "../../components/Skeleton";

interface Equipamento { id: string; nome: string; tipo: string; patrimonio: string; status: string; ativo: boolean; }
interface Emprestimo {
  id: string; protocolo: string; equipamentoId: string; equipamentoNome: string; equipamentoPatrimonio: string;
  responsavelId: string; responsavelNome: string; responsavelSetor: string; motivo: string;
  dataInicio: string; dataFim: string; status: string;
}

const STATUS_EQUIPAMENTO: Record<string, { cor: string; bg: string; label: string }> = {
  disponivel: { cor: "#166534", bg: "#dcfce7", label: "Disponível" },
  reservado:  { cor: "#854d0e", bg: "#fef9c3", label: "Reservado" },
  retirado:   { cor: "#1e40af", bg: "#dbeafe", label: "Retirado" },
  manutencao: { cor: "#991b1b", bg: "#fee2e2", label: "Manutenção" },
};

const STATUS_EMPRESTIMO: Record<string, { cor: string; label: string }> = {
  reservado: { cor: "#F59E0B", label: "Reservado" },
  retirado:  { cor: "#3B82F6", label: "Em uso" },
};

function gerarProtocolo() { return "EQP" + Date.now().toString().slice(-8); }

export default function Equipamentos() {
  const { usuario, ehGestor, ehConsulta, ehAdministrativo } = useAuth();
  // Quem mantém o catálogo do recurso (cadastrar/editar item)
  const podeGerenciar = ehGestor || ehAdministrativo;
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalEquip, setModalEquip] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ equipamentoId: "", data: "", horaInicio: "", horaFim: "", motivo: "" });
  const [formEquip, setFormEquip] = useState({ nome: "", tipo: "", patrimonio: "" });
  const [confirmCancelar, setConfirmCancelar] = useState<Emprestimo | null>(null);

  useEscClose(() => setModal(false), modal);
  useEscClose(() => setModalEquip(false), modalEquip);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const [equipSnap, emprestimosSnap] = await Promise.all([
      getDocs(query(collection(db, "equipamentos"), limit(200))),
      getDocs(query(collection(db, "emprestimosEquipamentos"), where("status", "in", ["reservado", "retirado"]), limit(200))),
    ]);
    setEquipamentos(equipSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipamento)));
    setEmprestimos(emprestimosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Emprestimo)));
    setCarregando(false);
  }

  function verificarConflito(equipamentoId: string, inicio: string, fim: string): boolean {
    return emprestimos.some(e => e.equipamentoId === equipamentoId && intervalosSobrepoem(inicio, fim, e.dataInicio, e.dataFim));
  }

  async function reservar(e: React.FormEvent) {
    e.preventDefault(); setErro("");
    if (!form.equipamentoId || !form.data || !form.horaInicio || !form.horaFim || !form.motivo) {
      setErro("Preencha todos os campos."); return;
    }
    const dataInicio = `${form.data}T${form.horaInicio}`;
    const dataFim = `${form.data}T${form.horaFim}`;
    // Validação compartilhada: intervalo, duração e data no passado (ver utils/periodo.ts).

    const erroPeriodo = validarPeriodo(dataInicio, dataFim, { maxDias: 1, rotulo: "O empréstimo", exigeExpediente: true });

    if (erroPeriodo) { setErro(erroPeriodo); return; }
    if (verificarConflito(form.equipamentoId, dataInicio, dataFim)) {
      setErro("Este equipamento já está reservado nesse horário. Escolha outro horário ou outro equipamento."); return;
    }
    setEnviando(true);
    try {
      const equip = equipamentos.find(eq => eq.id === form.equipamentoId);
      const novoEmprestimo = await addDoc(collection(db, "emprestimosEquipamentos"), {
        protocolo: gerarProtocolo(),
        equipamentoId: form.equipamentoId, equipamentoNome: equip?.nome || "", equipamentoPatrimonio: equip?.patrimonio || "",
        responsavelId: usuario?.uid, responsavelNome: usuario?.nome, responsavelSetor: usuario?.setor,
        motivo: form.motivo, dataInicio, dataFim, status: "reservado", criadoEm: serverTimestamp(),
      });
      await updateDoc(doc(db, "equipamentos", form.equipamentoId), { status: "reservado" });
      await registrarAuditoria("reservar_equipamento", usuario?.uid || "", usuario?.nome || "", {
        emprestimoId: novoEmprestimo.id, equipamentoNome: equip?.nome, dataInicio, dataFim,
      });
      setModal(false);
      setForm({ equipamentoId: "", data: "", horaInicio: "", horaFim: "", motivo: "" });
      await carregar();
    } catch (err) { console.error(err); setErro("Erro ao reservar. Tente novamente."); }
    finally { setEnviando(false); }
  }

  async function retirar(e: Emprestimo) {
    await updateDoc(doc(db, "emprestimosEquipamentos", e.id), { status: "retirado", retiradoEm: serverTimestamp() });
    await updateDoc(doc(db, "equipamentos", e.equipamentoId), { status: "retirado" });
    await registrarAuditoria("retirar_equipamento", usuario?.uid || "", usuario?.nome || "", { emprestimoId: e.id, equipamentoNome: e.equipamentoNome });
    await carregar();
  }

  async function devolver(e: Emprestimo) {
    await updateDoc(doc(db, "emprestimosEquipamentos", e.id), { status: "devolvido", devolvidoEm: serverTimestamp() });
    await updateDoc(doc(db, "equipamentos", e.equipamentoId), { status: "disponivel" });
    await registrarAuditoria("devolver_equipamento", usuario?.uid || "", usuario?.nome || "", { emprestimoId: e.id, equipamentoNome: e.equipamentoNome });
    await carregar();
  }

  async function cancelar(e: Emprestimo) {
    await updateDoc(doc(db, "emprestimosEquipamentos", e.id), { status: "cancelado" });
    await updateDoc(doc(db, "equipamentos", e.equipamentoId), { status: "disponivel" });
    await registrarAuditoria("cancelar_emprestimo_equipamento", usuario?.uid || "", usuario?.nome || "", { emprestimoId: e.id, equipamentoNome: e.equipamentoNome });
    setConfirmCancelar(null);
    await carregar();
  }

  async function cadastrarEquipamento(e: React.FormEvent) {
    e.preventDefault();
    if (!formEquip.nome || !formEquip.tipo || !formEquip.patrimonio) return;
    await addDoc(collection(db, "equipamentos"), {
      nome: formEquip.nome, tipo: formEquip.tipo, patrimonio: formEquip.patrimonio, status: "disponivel", ativo: true,
    });
    setModalEquip(false);
    setFormEquip({ nome: "", tipo: "", patrimonio: "" });
    await carregar();
  }

  function podeCancelar(e: Emprestimo) {
    return podeGerenciar || e.responsavelId === usuario?.uid;
  }

  const meusEProximos = emprestimos
    .filter(e => podeGerenciar || e.responsavelId === usuario?.uid)
    .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

  return (
    <div style={s.page}>
      <Sidebar perfil={usuario?.perfil ?? "consulta"} />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Equipamentos</div>
            <div style={s.sub}>Empréstimo de notebooks, projetores e outros equipamentos com patrimônio</div>
          </div>
          {!ehConsulta && <button onClick={() => setModal(true)} style={s.btnNovo}>+ Reservar Equipamento</button>}
        </div>

        <div style={s.grid}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Catálogo ({equipamentos.length})</div>
                {podeGerenciar && <button onClick={() => setModalEquip(true)} style={s.btnMini}>+ Novo equipamento</button>}
              </div>
              {carregando ? (
                <SkeletonLista itens={3} />
              ) : equipamentos.length === 0 ? (
                <div style={s.vazio}>Nenhum equipamento cadastrado ainda.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {equipamentos.map(eq => (
                    <div key={eq.id} style={s.linhaEquip}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{eq.nome}</div>
                          <div style={{ fontSize: 11, color: "#7A95B2", marginTop: 2 }}>{eq.tipo} · Pat. {eq.patrimonio}</div>
                        </div>
                        <span style={{ ...s.badge, background: STATUS_EQUIPAMENTO[eq.status]?.bg, color: STATUS_EQUIPAMENTO[eq.status]?.cor }}>
                          {STATUS_EQUIPAMENTO[eq.status]?.label || eq.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.card}>
              <CalendarioGrade
                colecao="emprestimosEquipamentos"
                titulo="Equipamentos"
                subtitulo="Reservas e retiradas de equipamentos"
                tema="claro"
                campoTitulo="equipamentoNome"
                campoDataInicio="dataInicio"
                campoDataFim="dataFim"
                statusMap={STATUS_EMPRESTIMO}
                statusFiltro={["reservado", "retirado"]}
              />
            </div>
          </div>

          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>{podeGerenciar ? "Todos os empréstimos ativos" : "Meus empréstimos"}</div>
            {carregando ? (
              <SkeletonLista itens={3} />
            ) : meusEProximos.length === 0 ? (
              <div style={s.vazio}>Nenhum empréstimo ativo.</div>
            ) : meusEProximos.map(e => (
              <div key={e.id} style={s.linhaEmprestimo}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{e.equipamentoNome}</div>
                <div style={{ fontSize: 11, color: "#7A95B2" }}>
                  {new Date(e.dataInicio).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {new Date(e.dataFim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{e.responsavelNome} · {e.motivo}</div>
                <span style={{ ...s.badge, background: "#F1F5F9", color: STATUS_EMPRESTIMO[e.status]?.cor, marginTop: 4, display: "inline-block" }}>
                  {STATUS_EMPRESTIMO[e.status]?.label}
                </span>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {e.status === "reservado" && podeCancelar(e) && <button onClick={() => retirar(e)} style={s.btnAcao}>Retirar</button>}
                  {e.status === "retirado" && podeCancelar(e) && <button onClick={() => devolver(e)} style={s.btnAcao}>Devolver</button>}
                  {e.status === "reservado" && podeCancelar(e) && <button onClick={() => setConfirmCancelar(e)} style={s.btnCancelar}>Cancelar</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {modal && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-emprestimo-titulo">
          <div style={s.modal}>
            <h2 id="modal-emprestimo-titulo" style={s.modalTitulo}>Reservar Equipamento</h2>
            <form onSubmit={reservar} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label htmlFor="emp-equipamento" style={s.label}>Equipamento</label>
                <select id="emp-equipamento" value={form.equipamentoId} onChange={e => setForm(p => ({ ...p, equipamentoId: e.target.value }))} style={s.input}>
                  <option value="">Selecione...</option>
                  {equipamentos.filter(eq => eq.ativo && eq.status === "disponivel").map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nome} — {eq.tipo} (Pat. {eq.patrimonio})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="emp-data" style={s.label}>Data</label>
                <input id="emp-data" type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} style={s.input} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="emp-inicio" style={s.label}>Início</label>
                  <CampoHora id="emp-inicio" valor={form.horaInicio} aoMudar={v => setForm(p => ({ ...p, horaInicio: v }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="emp-fim" style={s.label}>Fim</label>
                  <CampoHora id="emp-fim" valor={form.horaFim} aoMudar={v => setForm(p => ({ ...p, horaFim: v }))} minimo={form.horaInicio} />
                </div>
              </div>
              <div style={{ fontSize:12, color:"#94A3B8", marginTop:-4 }}>
                Expediente: das {EXPEDIENTE_INICIO} às {EXPEDIENTE_FIM}, em intervalos de 15 minutos.
              </div>
              <div>
                <label htmlFor="emp-motivo" style={s.label}>Motivo</label>
                <input id="emp-motivo" type="text" placeholder="Apresentação externa" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} style={s.input} />
              </div>
              {erro && <div role="alert" style={s.erro}>{erro}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button type="button" onClick={() => { setModal(false); setErro(""); }} style={s.btnSecundario}>Cancelar</button>
                <button type="submit" disabled={enviando} style={s.btnPrimario}>{enviando ? "Reservando..." : "Confirmar Reserva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalEquip && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-equip-titulo">
          <div style={s.modal}>
            <h2 id="modal-equip-titulo" style={s.modalTitulo}>Novo Equipamento</h2>
            <form onSubmit={cadastrarEquipamento} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label htmlFor="equip-nome" style={s.label}>Nome</label>
                <input id="equip-nome" type="text" placeholder="Notebook Dell Latitude" value={formEquip.nome} onChange={e => setFormEquip(p => ({ ...p, nome: e.target.value }))} style={s.input} />
              </div>
              <div>
                <label htmlFor="equip-tipo" style={s.label}>Tipo</label>
                <input id="equip-tipo" type="text" placeholder="Notebook, Projetor, Câmera..." value={formEquip.tipo} onChange={e => setFormEquip(p => ({ ...p, tipo: e.target.value }))} style={s.input} />
              </div>
              <div>
                <label htmlFor="equip-patrimonio" style={s.label}>Número de patrimônio</label>
                <input id="equip-patrimonio" type="text" placeholder="123456" value={formEquip.patrimonio} onChange={e => setFormEquip(p => ({ ...p, patrimonio: e.target.value }))} style={s.input} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button type="button" onClick={() => setModalEquip(false)} style={s.btnSecundario}>Cancelar</button>
                <button type="submit" style={s.btnPrimario}>Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmCancelar && (
        <ModalConfirm
          titulo="Cancelar Reserva"
          mensagem={`Deseja cancelar a reserva de ${confirmCancelar.equipamentoNome}? Esta ação não pode ser desfeita.`}
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
  page:        { display: "flex", minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', system-ui, sans-serif" },
  main:        { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" },
  topbar:      { background: "#ffffff", borderBottom: "1.5px solid #E1EAF5", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  title:       { fontSize: 18, fontWeight: 700, color: "#0F172A" },
  sub:         { color: "#7A95B2", fontSize: 12, marginTop: 2 },
  btnNovo:     { background: "#1E3A8A", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnMini:     { background: "#F1F5F9", color: "#1E3A8A", border: "1px solid #E1EAF5", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  grid:        { padding: "20px 24px", flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" },
  card:        { background: "#ffffff", border: "1px solid #E1EAF5", borderRadius: 12, padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  vazio:       { fontSize: 12, color: "#94A3B8" },
  linhaEquip:  { border: "1px solid #F1F5F9", borderRadius: 8, padding: "8px 10px" },
  linhaEmprestimo: { padding: "8px 0", borderBottom: "1px solid #F1F5F9" },
  btnAcao:     { padding: "4px 10px", border: "1px solid #bfdbfe", borderRadius: 6, background: "#eff6ff", color: "#1e40af", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  btnCancelar: { padding: "4px 10px", border: "1px solid #fecaca", borderRadius: 6, background: "#fff5f5", color: "#991b1b", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  overlay:     { position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:       { background: "#ffffff", borderRadius: 12, padding: "1.75rem", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalTitulo: { fontSize: 18, fontWeight: 700, color: "#0F172A", marginTop: 0, marginBottom: "1.25rem" },
  label:       { display: "block", fontSize: 12, color: "#5A7A9A", marginBottom: 4, fontWeight: 600 },
  input:       { width: "100%", padding: "9px 12px", border: "1px solid #E1EAF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", color: "#0F172A", fontFamily: "inherit" },
  erro:        { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", fontWeight: 500 },
  btnPrimario: { padding: "10px 20px", border: "none", borderRadius: 8, background: "#1E3A8A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSecundario: { padding: "10px 20px", border: "1px solid #E1EAF5", borderRadius: 8, background: "#F1F5F9", color: "#5A7A9A", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  badge:       { padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
};
