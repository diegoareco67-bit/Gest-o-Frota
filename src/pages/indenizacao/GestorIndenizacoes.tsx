import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, query, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";
import { useConfiguracaoIndenizacao } from "../../hooks/useConfiguracaoIndenizacao";
import { calcularValor } from "../../utils/pdfIndenizacao";

interface VeiculoProprio {
  id: string; servidorNome: string; categoriaFuncional: string;
  marca: string; modelo: string; placa: string; status: string; pdfUrl: string;
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

  async function decidir(id: string, status: "aprovado" | "recusado") {
    await updateDoc(doc(db, "veiculosProprios", id), { status });
    const v = veiculos.find(x => x.id === id);
    await registrarAuditoria(
      status === "aprovado" ? "aprovar_veiculo_proprio" : "recusar_veiculo_proprio",
      usuario?.uid || "", usuario?.nome || "",
      { veiculoProprioId: id, servidorNome: v?.servidorNome, placa: v?.placa },
    );
    await carregar();
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
          <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", background: "#F1F5F9", borderRadius: 10, padding: 4, width: "fit-content", border: "1px solid #E1EAF5" }}>
            <button onClick={() => setAba("veiculos")} style={{ ...s.abaBtn, ...(aba === "veiculos" ? s.abaAtiva : {}) }}>
              🚗 Veículos Próprios {pendentes.length > 0 && <span style={s.badgeAba}>{pendentes.length}</span>}
            </button>
            <button onClick={() => setAba("indenizacoes")} style={{ ...s.abaBtn, ...(aba === "indenizacoes" ? s.abaAtiva : {}) }}>
              💰 Indenizações ({indenizacoes.length})
            </button>
          </div>

          {carregando ? (
            <div style={s.vazio}>Carregando...</div>
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
                        <div style={{ fontSize: 13, color: "#334155", marginTop: 8 }}>🚗 {v.marca} {v.modelo} — {v.placa}</div>
                        <a href={v.pdfUrl} target="_blank" rel="noreferrer" style={{ ...s.link, display: "inline-block", marginTop: 8 }}>📄 Ver termo assinado</a>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={() => decidir(v.id, "recusado")} style={s.btnRecusar}>✕ Recusar</button>
                          <button onClick={() => decidir(v.id, "aprovado")} style={s.btnAprovar}>✓ Aprovar</button>
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
                            <div style={{ fontSize: 12, color: "#5A7A9A", marginTop: 2 }}>🚗 {v.marca} {v.modelo} — {v.placa}</div>
                          </div>
                          <span style={{ ...s.badge, background: v.status === "aprovado" ? "#dcfce7" : "#fee2e2", color: v.status === "aprovado" ? "#166534" : "#991b1b" }}>
                            {v.status === "aprovado" ? "Aprovado" : "Recusado"}
                          </span>
                        </div>
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
                        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>🚗 {i.veiculoPlaca} · {i.totalKmRodados} km · R$ {(i.valorTotal ?? calcularValor(i.totalKmRodados, valorPorKm)).toFixed(2).replace(".", ",")}</div>
                      </div>
                      <span style={{ ...s.badge, background: STATUS_LABEL[i.status]?.bg, color: STATUS_LABEL[i.status]?.cor }}>
                        {STATUS_LABEL[i.status]?.label || i.status}
                      </span>
                    </div>
                    {i.pdfUrl && <a href={i.pdfUrl} target="_blank" rel="noreferrer" style={{ ...s.link, display: "inline-block", marginTop: 8 }}>📄 Ver boletim assinado</a>}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>
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
  badge:   { padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  badgeAba:{ background: "#fee2e2", color: "#991b1b", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "2px 7px", marginLeft: 6 },
  abaBtn:  { padding: "8px 16px", border: "none", borderRadius: 8, background: "transparent", color: "#7A95B2", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center" },
  abaAtiva:{ background: "#ffffff", color: "#0F172A", fontWeight: 700, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  btnAprovar: { flex: 1, padding: "8px", border: "none", borderRadius: 8, background: "#22C55E", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnRecusar: { flex: 1, padding: "8px", border: "1px solid #fecaca", borderRadius: 8, background: "#fff5f5", color: "#991b1b", fontSize: 12, fontWeight: 700, cursor: "pointer" },
};
