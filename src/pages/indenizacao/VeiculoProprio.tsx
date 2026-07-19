import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { gerarPdfAnexoI, calcularHashSHA256 } from "../../utils/pdfIndenizacao";

interface VeiculoProprio {
  id: string; servidorId: string; servidorNome: string; categoriaFuncional: string;
  marca: string; modelo: string; placa: string; localidade: string; data: string;
  status: "pendente" | "aprovado" | "recusado"; pdfUrl: string; pdfHash: string; criadoEm?: { toDate: () => Date };
}

const STATUS_LABEL: Record<string, { cor: string; bg: string; label: string }> = {
  pendente:  { cor: "#854d0e", bg: "#fef9c3", label: "Aguardando aprovação" },
  aprovado:  { cor: "#166534", bg: "#dcfce7", label: "Aprovado" },
  recusado:  { cor: "#991b1b", bg: "#fee2e2", label: "Recusado" },
};

export default function VeiculoProprio() {
  const { usuario } = useAuth();
  const [registro, setRegistro] = useState<VeiculoProprio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({ categoriaFuncional: "", marca: "", modelo: "", placa: "", localidade: "Campo Grande" });
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrlPreview, setPdfUrlPreview] = useState("");
  const [arquivoAssinado, setArquivoAssinado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    if (!usuario?.uid) return;
    setCarregando(true);
    const snap = await getDocs(query(collection(db, "veiculosProprios"), where("servidorId", "==", usuario.uid), limit(1)));
    if (!snap.empty) {
      const d = snap.docs[0];
      setRegistro({ id: d.id, ...d.data() } as VeiculoProprio);
    }
    setCarregando(false);
  }

  function gerarPdf() {
    if (!form.categoriaFuncional || !form.marca || !form.modelo || !form.placa) {
      setErro("Preencha todos os campos antes de gerar o PDF."); return;
    }
    setErro("");
    const blob = gerarPdfAnexoI({
      protocolo: "PENDENTE",
      nomeServidor: usuario?.nome || "",
      categoriaFuncional: form.categoriaFuncional,
      marca: form.marca, modelo: form.modelo, placa: form.placa,
      localidade: form.localidade,
      data: new Date().toISOString(),
    });
    setPdfBlob(blob);
    setPdfUrlPreview(URL.createObjectURL(blob));
  }

  async function enviarAssinado() {
    if (!arquivoAssinado || !usuario?.uid) { setErro("Selecione o PDF assinado."); return; }
    setEnviando(true); setErro("");
    try {
      const hash = await calcularHashSHA256(arquivoAssinado);
      const caminho = `veiculosProprios/${usuario.uid}/termo_${Date.now()}.pdf`;
      const storageRef = ref(storage, caminho);
      await uploadBytes(storageRef, arquivoAssinado, { contentType: "application/pdf" });
      const pdfUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "veiculosProprios"), {
        servidorId: usuario.uid, servidorNome: usuario.nome,
        categoriaFuncional: form.categoriaFuncional,
        marca: form.marca, modelo: form.modelo, placa: form.placa,
        localidade: form.localidade, data: new Date().toISOString(),
        status: "pendente", pdfUrl, pdfHash: hash,
        criadoEm: serverTimestamp(),
      });
      setSucesso(true);
      await carregar();
    } catch (e) { console.error(e); setErro("Erro ao enviar o termo assinado. Tente novamente."); }
    finally { setEnviando(false); }
  }

  return (
    <div style={s.page}>
      <Sidebar perfil="usuario" />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Cadastro de Veículo Próprio</div>
            <div style={s.sub}>Anexo I — Termo de Opção e Cadastramento de Veículo (Decreto nº 10.154/2000)</div>
          </div>
        </div>

        <div style={s.content}>
          {carregando ? (
            <div style={s.vazio}>Carregando...</div>
          ) : registro ? (
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{registro.marca} {registro.modelo} — {registro.placa}</div>
                  <div style={{ fontSize: 12, color: "#7A95B2", marginTop: 2 }}>Categoria funcional: {registro.categoriaFuncional}</div>
                </div>
                <span style={{ ...s.badge, background: STATUS_LABEL[registro.status].bg, color: STATUS_LABEL[registro.status].cor }}>
                  {STATUS_LABEL[registro.status].label}
                </span>
              </div>
              <a href={registro.pdfUrl} target="_blank" rel="noreferrer" style={s.link}>📄 Ver termo assinado</a>
              {registro.status === "recusado" && (
                <div style={{ ...s.aviso, marginTop: 12 }}>Seu termo foi recusado. Fale com o gestor para entender o motivo e reenviar.</div>
              )}
              {registro.status === "pendente" && (
                <div style={{ ...s.aviso, marginTop: 12 }}>Aguardando aprovação do gestor. Você já pode solicitar indenizações — elas ficam liberadas para envio ao RH assim que este termo for aprovado.</div>
              )}
            </div>
          ) : (
            <div style={s.card}>
              <p style={{ fontSize: 13, color: "#5A7A9A", marginTop: 0 }}>
                Antes de solicitar indenização de despesas de transporte, cadastre o veículo próprio que você vai usar nos deslocamentos a serviço.
              </p>

              {!pdfBlob ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div>
                    <label htmlFor="vp-categoria" style={s.label}>Categoria funcional</label>
                    <input id="vp-categoria" type="text" placeholder="Ex.: Auditor de Controle Interno" value={form.categoriaFuncional} onChange={e => setForm(p => ({ ...p, categoriaFuncional: e.target.value }))} style={s.input} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="vp-marca" style={s.label}>Marca</label>
                      <input id="vp-marca" type="text" placeholder="Fiat" value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} style={s.input} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="vp-modelo" style={s.label}>Modelo</label>
                      <input id="vp-modelo" type="text" placeholder="Strada" value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} style={s.input} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="vp-placa" style={s.label}>Placa</label>
                      <input id="vp-placa" type="text" placeholder="ABC-1234" value={form.placa} onChange={e => setForm(p => ({ ...p, placa: e.target.value.toUpperCase() }))} style={s.input} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="vp-localidade" style={s.label}>Localidade</label>
                    <input id="vp-localidade" type="text" value={form.localidade} onChange={e => setForm(p => ({ ...p, localidade: e.target.value }))} style={s.input} />
                  </div>
                  {erro && <div role="alert" style={s.erro}>{erro}</div>}
                  <button onClick={gerarPdf} style={s.btnPrimario}>Gerar Termo de Opção (PDF)</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                  <div style={s.passo}>
                    <strong>1.</strong> <a href={pdfUrlPreview} download="termo-opcao-veiculo.pdf" style={s.link}>Baixe o Termo de Opção gerado</a>
                  </div>
                  <div style={s.passo}><strong>2.</strong> Assine eletronicamente pelo <a href="https://www.gov.br/governodigital/pt-br/assinatura-eletronica" target="_blank" rel="noreferrer" style={s.link}>Gov.br</a> (fora deste sistema)</div>
                  <div style={s.passo}><strong>3.</strong> Envie o PDF assinado abaixo:</div>
                  <input type="file" accept="application/pdf" onChange={e => setArquivoAssinado(e.target.files?.[0] || null)} style={s.input} />
                  {erro && <div role="alert" style={s.erro}>{erro}</div>}
                  {sucesso && <div style={s.ok}>✅ Termo enviado! Aguardando aprovação do gestor.</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setPdfBlob(null); setPdfUrlPreview(""); }} style={s.btnSecundario}>Voltar</button>
                    <button onClick={enviarAssinado} disabled={enviando || !arquivoAssinado} style={s.btnPrimario}>{enviando ? "Enviando..." : "Enviar Termo Assinado"}</button>
                  </div>
                </div>
              )}
            </div>
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
  content: { padding: "20px 24px", flex: 1, maxWidth: 560 },
  card:    { background: "#ffffff", border: "1px solid #E1EAF5", borderRadius: 14, padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  vazio:   { fontSize: 13, color: "#94A3B8" },
  label:   { display: "block", fontSize: 12, color: "#5A7A9A", marginBottom: 4, fontWeight: 600 },
  input:   { width: "100%", padding: "9px 12px", border: "1px solid #E1EAF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", color: "#0F172A", fontFamily: "inherit" },
  erro:    { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", fontWeight: 500 },
  ok:      { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#166534", fontWeight: 500 },
  aviso:   { background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#854d0e" },
  btnPrimario:  { padding: "10px 20px", border: "none", borderRadius: 8, background: "#1E3A8A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSecundario:{ padding: "10px 20px", border: "1px solid #E1EAF5", borderRadius: 8, background: "#F1F5F9", color: "#5A7A9A", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  badge:   { padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 },
  link:    { color: "#1E3A8A", fontSize: 13, fontWeight: 600, textDecoration: "none" },
  passo:   { fontSize: 13, color: "#334155" },
};
