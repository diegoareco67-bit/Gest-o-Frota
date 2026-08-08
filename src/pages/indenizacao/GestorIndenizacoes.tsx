import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, query, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";
import { useConfiguracaoIndenizacao } from "../../hooks/useConfiguracaoIndenizacao";
import { calcularValor } from "../../utils/pdfIndenizacao";
import { IcoCarro, IcoCheck, IcoDinheiro, IcoDocumento, IcoX } from "../../components/Icone";
import { SkeletonLista } from "../../components/Skeleton";

interface VeiculoProprio {
  id: string; servidorNome: string; categoriaFuncional: string;
  marca: string; modelo: string; placa: string; status: string; pdfUrl: string; motivoRecusa?: string;
}
interface Indenizacao {
  id: string; protocolo: string; servidorNome: string; servidorSetor: string; veiculoPlaca: string;
  servicoARealizar: string; localidadesServico: string; totalKmRodados: number;
  valorTotal?: number;
  status: string; pdfUrl: string; criadoEm?: { toDate: () => Date };
}

const STATUS_LABEL: Record<string, { cor: string; bg: string; label: string }> = {
  gerado:     { cor: "#854d0e", bg: "#fef9c3", label: "Aguardando assinatura" },
  enviado_rh: { cor: "#166534", bg: "#dcfce7", label: "Enviada ao RH" },
  enviado:    { cor: "#1e40af", bg: "#dbeafe", label: "Enviada (confirmar e-mail)" },
};

export default function GestorIndenizacoes() {
  const { usuario } = useAuth();
  const { valorPorKm } = useConfiguracaoIndenizacao();
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [erroRecusa, setErroRecusa] = useState("");
  const [aba, setAba] = useState<"veiculos" | "indenizacoes">("veiculos");
  const [veiculos, setVeiculos] = useState<VeiculoProprio[]>([]);
  const [indenizacoes, setIndenizacoes] = useState<Indenizacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const [veiculosSnap, indenizacoesSnap] = await Promise.all([
      getDocs(query(collection(db, "veiculosProprios"), limit(500))),
      getDocs(query(collection(db, "indenizacoes"), limit(500))),
    ]);
    setVeiculos(veiculosSnap.docs.map(d => ({ id: d.id, ...d.data() } as VeiculoProprio)));
    setIndenizacoes(indenizacoesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Indenizacao)).sort((a, b) => (b.criadoEm?.toDate?.().getTime() || 0) - (a.criadoEm?.toDate?.().getTime() || 0)));
    setCarregando(false);
  }

  async function decidir(id: string, status: "aprovado" | "recusado", motivo = "") {
    // Recusa sem justificativa deixa o servidor sem saber o que corrigir.
    await updateDoc(doc(db, "veiculosProprios", id), {
      status,
      ...(status === "recusado" ? { motivoRecusa: motivo.trim() } : { motivoRecusa: "" }),
    });
    const v = veiculos.find(x => x.id === id);
    await registrarAuditoria(
      status === "aprovado" ? "aprovar_veiculo_proprio" : "recusar_veiculo_proprio",
      usuario?.uid || "", usuario?.nome || "",
      { veiculoProprioId: id, servidorNome: v?.servidorNome, placa: v?.placa, ...(motivo ? { motivo: motivo.trim() } : {}) },
    );
    await carregar();
  }

  function confirmarRecusa() {
    if (!recusando) return;
    if (!motivoRecusa.trim()) { setErroRecusa("Informe o motivo da recusa."); return; }
    const id = recusando;
    setRecusando(null); setMotivoRecusa(""); setErroRecusa("");
    decidir(id, "recusado", motivoRecusa);
  }

  const pendentes = veiculos.filter(v => v.status === "pendente");
  const decididos = veiculos.filter(v => v.status !== "pendente");

  return (
    <div style={s.page}>
      <Sidebar perfil="gestor" />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Indenização de Transporte</div>
            <div style={s.sub}>Termos de Opção e Boletins de Viagem (Decreto nº 10.154/2000)</div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", background: "#F1F5F9", borderRadius: 8, padding: 4, width: "fit-content", border: "1px solid #E1EAF5" }}>
            <button onClick={() => setAba("veiculos")} style={{ ...s.abaBtn, ...(aba === "veiculos" ? s.abaAtiva : {}) }}>
              <IcoCarro tam={14}/> Veículos Próprios {pendentes.length > 0 && <span style={s.badgeAba}>{pendentes.length}</span>}
            </button>
            <button onClick={() => setAba("indenizacoes")} style={{ ...s.abaBtn, ...(aba === "indenizacoes" ? s.abaAtiva : {}) }}>
              <IcoDinheiro tam={14}/> Indenizações ({indenizacoes.length})
            </button>
          </div>

          {carregando ? (
            <SkeletonLista itens={3} />
          ) : aba === "veiculos" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {pendentes.length > 0 && (
                <div>
                  <div style={s.secaoTitulo}>Aguardando aprovação</div>
                  <div style={s.grid}>
                    {pendentes.map(v => (
                      <div key={v.id} style={s.card}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{v.servidorNome}</div>
                        <div style={{ fontSize: 12, color: "#5A7A9A", marginTop: 2 }}>{v.categoriaFuncional}</div>
                        <div style={{ fontSize: 13, color: "#334155", marginTop: 8 }}><IcoCarro tam={14}/> {v.marca} {v.modelo} — {v.placa}</div>
                        <a href={v.pdfUrl} target="_blank" rel="noreferrer" style={{ ...s.link, display: "inline-block", marginTop: 8 }}><IcoDocumento tam={14}/> Ver termo assinado</a>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={() => { setRecusando(v.id); setMotivoRecusa(""); setErroRecusa(""); }} style={s.btnRecusar}><IcoX tam={14}/> Recusar</button>
                          <button onClick={() => decidir(v.id, "aprovado")} style={s.btnAprovar}><IcoCheck tam={14}/> Aprovar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={s.secaoTitulo}>Já decididos ({decididos.length})</div>
                {decididos.length === 0 ? <div style={s.vazio}>Nenhum ainda.</div> : (
                  <div style={s.grid}>
                    {decididos.map(v => (
                      <div key={v.id} style={s.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{v.servidorNome}</div>
                            <div style={{ fontSize: 12, color: "#5A7A9A", marginTop: 2 }}><IcoCarro tam={14}/> {v.marca} {v.modelo} — {v.placa}</div>
                          </div>
                          <span style={{ ...s.badge, background: v.status === "aprovado" ? "#dcfce7" : "#fee2e2", color: v.status === "aprovado" ? "#166534" : "#991b1b" }}>
                            {v.status === "aprovado" ? "Aprovado" : "Recusado"}
                          </span>
                        </div>

                        {/* O termo assinado precisa ficar acessível depois da decisão —
                            é o documento que comprova o cadastro do veículo. */}
                        {v.pdfUrl && (
                          <a href={v.pdfUrl} target="_blank" rel="noreferrer" style={{ ...s.link, display: "inline-block", marginTop: 10 }}>
                            <IcoDocumento tam={14}/> Ver termo assinado
                          </a>
                        )}

                        {v.status === "recusado" && (
                          <div style={s.motivoBox}>
                            <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 3 }}>Motivo da recusa</div>
                            <div>{v.motivoRecusa || "Nenhum motivo foi registrado (recusa anterior à exigência de justificativa)."}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            indenizacoes.length === 0 ? <div style={s.vazio}>Nenhuma indenização solicitada ainda.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {indenizacoes.map(i => (
                  <div key={i.id} style={s.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#7A95B2", fontWeight: 600 }}>#{i.protocolo}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{i.servidorNome} · {i.servidorSetor}</div>
                        <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>{i.localidadesServico} — {i.servicoARealizar}</div>
                        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}><IcoCarro tam={14}/> {i.veiculoPlaca} · {i.totalKmRodados} km · R$ {(i.valorTotal ?? calcularValor(i.totalKmRodados, valorPorKm)).toFixed(2).replace(".", ",")}</div>
                      </div>
                      <span style={{ ...s.badge, background: STATUS_LABEL[i.status]?.bg, color: STATUS_LABEL[i.status]?.cor }}>
                        {STATUS_LABEL[i.status]?.label || i.status}
                      </span>
                    </div>
                    {i.pdfUrl && <a href={i.pdfUrl} target="_blank" rel="noreferrer" style={{ ...s.link, display: "inline-block", marginTop: 8 }}><IcoDocumento tam={14}/> Ver boletim assinado</a>}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* Recusa exige justificativa: o servidor precisa saber o que corrigir
          para reenviar o Termo de Opção. */}
      {recusando && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="titulo-recusa-anexo1">
          <div style={s.modal}>
            <h2 id="titulo-recusa-anexo1" style={s.modalTitulo}>Recusar Termo de Opção</h2>
            <p style={{ fontSize: 13, color: "#5A7A9A", marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
              O motivo abaixo fica visível para o servidor na tela dele, para que ele possa
              corrigir e reenviar o termo.
            </p>
            <label htmlFor="motivo-recusa-anexo1" style={s.label}>Motivo da recusa *</label>
            <textarea
              id="motivo-recusa-anexo1"
              value={motivoRecusa}
              onChange={e => { setMotivoRecusa(e.target.value); setErroRecusa(""); }}
              placeholder="Ex.: A placa informada não confere com o documento do veículo."
              rows={3}
              style={{ ...s.input, resize: "vertical" }}
            />
            {erroRecusa && <div role="alert" style={{ ...s.erro, marginTop: 10 }}>{erroRecusa}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" onClick={() => { setRecusando(null); setMotivoRecusa(""); setErroRecusa(""); }} style={s.btnSecundario}>Voltar</button>
              <button type="button" onClick={confirmarRecusa} style={s.btnRecusar}>Confirmar recusa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { display: "flex", minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', system-ui, sans-serif" },
  main:    { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" },
  topbar:  { background: "#ffffff", borderBottom: "1.5px solid #E1EAF5", padding: "14px 24px", flexShrink: 0 },
  title:   { fontSize: 18, fontWeight: 700, color: "#0F172A" },
  sub:     { color: "#7A95B2", fontSize: 12, marginTop: 2 },
  vazio:   { fontSize: 13, color: "#94A3B8" },
  secaoTitulo: { fontSize: 12, fontWeight: 700, color: "#5A7A9A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 },
  grid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 },
  card:    { background: "#ffffff", border: "1px solid #E1EAF5", borderRadius: 12, padding: "1.1rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  link:    { color: "#1E3A8A", fontSize: 12, fontWeight: 600, textDecoration: "none" },
  motivoBox: { marginTop: 10, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#991b1b", lineHeight: 1.5 },
  overlay:  { position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" },
  modal:    { background: "#fff", borderRadius: 12, padding: "1.75rem", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalTitulo: { fontSize: 18, fontWeight: 700, color: "#0F172A", marginTop: 0, marginBottom: 10 },
  label:    { display: "block", fontSize: 12, color: "#5A7A9A", marginBottom: 4, fontWeight: 600 },
  input:    { width: "100%", padding: "9px 12px", border: "1px solid #E1EAF5", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "#fff", color: "#0F172A", fontFamily: "inherit" },
  erro:     { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", fontWeight: 500 },
  btnSecundario: { padding: "10px 20px", border: "1px solid #E1EAF5", borderRadius: 8, background: "#F1F5F9", color: "#5A7A9A", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  badge:   { padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  badgeAba:{ background: "#fee2e2", color: "#991b1b", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "2px 7px", marginLeft: 6 },
  abaBtn:  { padding: "8px 16px", border: "none", borderRadius: 8, background: "transparent", color: "#7A95B2", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center" },
  abaAtiva:{ background: "#ffffff", color: "#0F172A", fontWeight: 700, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  btnAprovar: { flex: 1, padding: "8px", border: "none", borderRadius: 8, background: "#22C55E", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnRecusar: { flex: 1, padding: "8px", border: "1px solid #fecaca", borderRadius: 8, background: "#fff5f5", color: "#991b1b", fontSize: 12, fontWeight: 700, cursor: "pointer" },
};
