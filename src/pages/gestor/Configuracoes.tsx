import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";
import { VALOR_KM_PADRAO } from "../../utils/pdfIndenizacao";
import { IcoCheckCirculo } from "../../components/Icone";
import { SkeletonLista } from "../../components/Skeleton";

export default function Configuracoes() {
  const { usuario } = useAuth();
  const [valorAtual, setValorAtual] = useState(VALOR_KM_PADRAO);
  const [valorInput, setValorInput] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  async function carregar() {
    const snap = await getDoc(doc(db, "configuracoes", "indenizacao"));
    const valor = snap.data()?.valorPorKm;
    const atual = typeof valor === "number" && valor > 0 ? valor : VALOR_KM_PADRAO;
    setValorAtual(atual);
    setValorInput(atual.toFixed(2));
    setCarregando(false);
  }

  // Mesmo padrão de busca-no-mount já usado em Setores.tsx/VeiculoProprio.tsx (que não
  // disparam esta regra apesar do formato idêntico) — regra experimental inconsistente.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setOk(false);
    const novoValor = Number(valorInput.replace(",", "."));
    if (!novoValor || novoValor <= 0) { setErro("Informe um valor válido, maior que zero."); return; }
    if (!usuario?.uid) return;
    setSalvando(true);
    try {
      await setDoc(doc(db, "configuracoes", "indenizacao"), {
        valorPorKm: novoValor,
        atualizadoEm: serverTimestamp(),
        atualizadoPor: usuario.nome || usuario.uid,
      });
      await registrarAuditoria("alterar_configuracao", usuario.uid, usuario.nome || "", {
        campo: "valorPorKm", valorAnterior: valorAtual, valorNovo: novoValor,
      });
      setValorAtual(novoValor);
      setOk(true);
    } catch (err) { console.error(err); setErro("Erro ao salvar. Tente novamente."); }
    finally { setSalvando(false); }
  }

  return (
    <div style={s.page}>
      <Sidebar perfil="gestor" />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Configurações</div>
            <div style={s.sub}>Valores paramétricos do sistema, editáveis sem depender de uma nova versão do código</div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto", maxWidth: 640 }}>
          <div style={s.card}>
            <div style={s.tituloCard}>Indenização de Transporte</div>
            <div style={s.descCard}>
              Valor pago por km rodado (Anexo II, Decreto Estadual nº 10.154/2000 — redação vigente do
              Decreto nº 12.606/2008). Se o decreto for reajustado novamente, atualize o valor aqui; não
              é necessário nenhum deploy de código.
            </div>

            {carregando ? (
              <SkeletonLista itens={3} />
            ) : (
              <form onSubmit={salvar} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 14 }}>
                <div style={{ flex: 1, maxWidth: 220 }}>
                  <label htmlFor="cfg-valor-km" style={s.label}>Valor por km rodado (R$)</label>
                  <input
                    id="cfg-valor-km" type="text" inputMode="decimal"value={valorInput} onChange={e => setValorInput(e.target.value)}
                    style={s.input}
                  />
                </div>
                <button type="submit" disabled={salvando} style={s.btnPrimario}>{salvando ? "Salvando..." : "Salvar"}</button>
              </form>
            )}

            {erro && <div role="alert" style={{ ...s.erro, marginTop: 12 }}>{erro}</div>}
            {ok && <div style={{ ...s.ok, marginTop: 12 }}><IcoCheckCirculo tam={14}/> Valor atualizado — novas indenizações já usam R$ {valorAtual.toFixed(2).replace(".", ",")}/km.</div>}

            <div style={s.nota}>
              Boletins já enviados não são recalculados — mantêm o valor por km vigente no momento em
              que foram gerados.
            </div>
          </div>
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
  card:    { background: "#ffffff", border: "1px solid #E1EAF5", borderRadius: 12, padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  tituloCard: { fontSize: 15, fontWeight: 700, color: "#0F172A" },
  descCard:   { fontSize: 13, color: "#5A7A9A", marginTop: 4, lineHeight: 1.5 },
  vazio:   { fontSize: 13, color: "#94A3B8", marginTop: 14 },
  label:   { display: "block", fontSize: 12, color: "#5A7A9A", marginBottom: 4, fontWeight: 600 },
  input:   { width: "100%", padding: "9px 12px", border: "1px solid #E1EAF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", color: "#0F172A", fontFamily: "inherit" },
  erro:    { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", fontWeight: 500 },
  ok:      { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#166534", fontWeight: 500 },
  btnPrimario: { padding: "9px 18px", border: "none", borderRadius: 8, background: "#1E3A8A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  nota:    { fontSize: 12, color: "#94A3B8", marginTop: 16, borderTop: "1px solid #F1F5F9", paddingTop: 10 },
};
