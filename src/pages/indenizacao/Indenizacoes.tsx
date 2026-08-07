import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";
import { useEscClose } from "../../hooks/useEscClose";
import { useConfiguracaoIndenizacao } from "../../hooks/useConfiguracaoIndenizacao";
import { validarPeriodo } from "../../utils/periodo";
import { gerarPdfAnexoII, calcularHashSHA256, calcularValor, type TrajetoLinha } from "../../utils/pdfIndenizacao";
import { IcoCheckCirculo, IcoDocumento, IcoX } from "../../components/Icone";
import { SkeletonLista } from "../../components/Skeleton";

interface VeiculoProprio { id: string; placa: string; status: string; }
interface Indenizacao {
  id: string; protocolo: string; servidorId: string; veiculoPlaca: string;
  servicoARealizar: string; localidadesServico: string; totalKmRodados: number;
  valorTotal?: number;
  status: string; pdfUrl: string; criadoEm?: { toDate: () => Date };
}

const STATUS_LABEL: Record<string, { cor: string; bg: string; label: string }> = {
  gerado:     { cor: "#854d0e", bg: "#fef9c3", label: "Aguardando assinatura" },
  enviado_rh: { cor: "#166534", bg: "#dcfce7", label: "Enviada ao RH" },
  enviado:    { cor: "#1e40af", bg: "#dbeafe", label: "Enviada (confirmar e-mail)" },
};

function gerarProtocolo() { return "IND" + Date.now().toString().slice(-8); }

const TRAJETO_VAZIO: TrajetoLinha = { data: "", odometroInicial: "", trajetoPercorrido: "", kmRodados: "" };

export default function Indenizacoes() {
  const { usuario } = useAuth();
  const { valorPorKm } = useConfiguracaoIndenizacao();
  const [veiculo, setVeiculo] = useState<VeiculoProprio | null>(null);
  const [lista, setLista] = useState<Indenizacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrlPreview, setPdfUrlPreview] = useState("");
  const [protocoloAtual, setProtocoloAtual] = useState("");
  const [arquivoAssinado, setArquivoAssinado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const [form, setForm] = useState({
    servicoARealizar: "", localidadesServico: "",
    inicioAutorizado: "", retornoPrevisto: "",
    odometroInicial: "", kmPreviamenteFixada: "",
    servicosRealizados: "", houveAlteracaoForcaMaior: false, justificativaAlteracao: "",
    odometroFinal: "",
  });
  const [trajetos, setTrajetos] = useState<TrajetoLinha[]>([{ ...TRAJETO_VAZIO }]);

  useEscClose(() => fecharModal(), modal);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    if (!usuario?.uid) return;
    setCarregando(true);
    const [veiculoSnap, indenizacoesSnap] = await Promise.all([
      getDocs(query(collection(db, "veiculosProprios"), where("servidorId", "==", usuario.uid), limit(1))),
      getDocs(query(collection(db, "indenizacoes"), where("servidorId", "==", usuario.uid), limit(200))),
    ]);
    setVeiculo(veiculoSnap.empty ? null : ({ id: veiculoSnap.docs[0].id, ...veiculoSnap.docs[0].data() } as VeiculoProprio));
    setLista(indenizacoesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Indenizacao)).sort((a, b) => (b.criadoEm?.toDate?.().getTime() || 0) - (a.criadoEm?.toDate?.().getTime() || 0)));
    setCarregando(false);
  }

  const totalKmRodados = trajetos.reduce((acc, t) => acc + (Number(t.kmRodados) || 0), 0);

  function atualizarTrajeto(i: number, campo: keyof TrajetoLinha, valor: string) {
    setTrajetos(prev => prev.map((t, idx) => idx === i ? { ...t, [campo]: valor } : t));
  }

  function gerarPdf() {
    if (!form.servicoARealizar || !form.localidadesServico || !form.inicioAutorizado || !form.retornoPrevisto || !form.odometroInicial || !form.odometroFinal) {
      setErro("Preencha todos os campos obrigatórios."); return;
    }
    if (totalKmRodados <= 0) { setErro("Informe pelo menos um trajeto com km rodados."); return; }
    // O Anexo II é preenchido DEPOIS da viagem, então o passado é permitido — mas
    // a duração ainda precisa ser plausível (30 dias) para barrar erro de digitação no ano.
    const erroPeriodo = validarPeriodo(form.inicioAutorizado, form.retornoPrevisto, {
      maxDias: 30, permitePassado: true, rotulo: "O período da viagem",
    });
    if (erroPeriodo) { setErro(erroPeriodo); return; }
    setErro("");
    const protocolo = gerarProtocolo();
    setProtocoloAtual(protocolo);
    const blob = gerarPdfAnexoII({
      protocolo,
      nomeServidor: usuario?.nome || "",
      categoriaFuncional: usuario?.setor || "",
      veiculoPlaca: veiculo?.placa || "",
      servicoARealizar: form.servicoARealizar,
      localidadesServico: form.localidadesServico,
      inicioAutorizado: form.inicioAutorizado,
      retornoPrevisto: form.retornoPrevisto,
      odometroInicial: form.odometroInicial,
      kmPreviamenteFixada: form.kmPreviamenteFixada,
      trajetos,
      servicosRealizados: form.servicosRealizados,
      houveAlteracaoForcaMaior: form.houveAlteracaoForcaMaior,
      justificativaAlteracao: form.justificativaAlteracao,
      odometroFinal: form.odometroFinal,
      totalKmRodados,
    }, valorPorKm);
    setPdfBlob(blob);
    setPdfUrlPreview(URL.createObjectURL(blob));
  }

  async function enviarAssinado() {
    if (!arquivoAssinado || !usuario?.uid) { setErro("Selecione o PDF assinado."); return; }
    setEnviando(true); setErro("");
    try {
      const hash = await calcularHashSHA256(arquivoAssinado);
      const caminho = `indenizacoes/${usuario.uid}/${protocoloAtual}.pdf`;
      const storageRef = ref(storage, caminho);
      await uploadBytes(storageRef, arquivoAssinado, { contentType: "application/pdf" });
      const pdfUrl = await getDownloadURL(storageRef);

      const docRef = await addDoc(collection(db, "indenizacoes"), {
        protocolo: protocoloAtual,
        servidorId: usuario.uid, servidorNome: usuario.nome, servidorSetor: usuario.setor,
        veiculoPlaca: veiculo?.placa || "",
        ...form, trajetos, totalKmRodados,
        valorTotal: calcularValor(totalKmRodados, valorPorKm),
        status: "gerado", pdfUrl, pdfHash: hash,
        criadoEm: serverTimestamp(),
      });

      // Chama o Apps Script Web App — usa text/plain para evitar preflight CORS
      // (Apps Script não trata bem requisições OPTIONS). O e-mail é enviado no
      // servidor independentemente de conseguirmos ler a resposta aqui.
      let emailConfirmado = false;
      const urlAppsScript = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined;
      if (urlAppsScript) {
        try {
          const resp = await fetch(urlAppsScript, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              urlArquivo: pdfUrl, nomeServidor: usuario.nome, matricula: usuario.matricula || "",
              destino: form.localidadesServico, protocolo: protocoloAtual,
            }),
          });
          const json = await resp.json().catch(() => null);
          emailConfirmado = !!json?.ok;
        } catch (e) {
          console.warn("Não foi possível confirmar o envio ao Apps Script (pode ter funcionado mesmo assim):", e);
        }
      }
      await updateDoc(doc(db, "indenizacoes", docRef.id), {
        status: emailConfirmado ? "enviado_rh" : "enviado",
      });
      await registrarAuditoria("enviar_indenizacao", usuario.uid, usuario.nome || "", {
        indenizacaoId: docRef.id, protocolo: protocoloAtual, totalKmRodados,
        valorTotal: calcularValor(totalKmRodados, valorPorKm), emailConfirmado,
      });

      setSucesso(true);
      await carregar();
    } catch (e) { console.error(e); setErro("Erro ao enviar o boletim assinado. Tente novamente."); }
    finally { setEnviando(false); }
  }

  function fecharModal() {
    setModal(false); setPdfBlob(null); setPdfUrlPreview(""); setArquivoAssinado(null);
    setErro(""); setSucesso(false); setProtocoloAtual("");
    setForm({ servicoARealizar: "", localidadesServico: "", inicioAutorizado: "", retornoPrevisto: "", odometroInicial: "", kmPreviamenteFixada: "", servicosRealizados: "", houveAlteracaoForcaMaior: false, justificativaAlteracao: "", odometroFinal: "" });
    setTrajetos([{ ...TRAJETO_VAZIO }]);
  }

  const bloqueadoSemVeiculo = !veiculo || veiculo.status !== "aprovado";

  return (
    <div style={s.page}>
      <Sidebar perfil="usuario" />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Indenização de Transporte</div>
            <div style={s.sub}>Anexo II — Boletim Demonstrativo de Viagem e Homologação (Decreto nº 10.154/2000)</div>
          </div>
          {!bloqueadoSemVeiculo && <button onClick={() => setModal(true)} style={s.btnNovo}>+ Nova Indenização</button>}
        </div>

        <div style={s.content}>
          {carregando ? (
            <SkeletonLista itens={3} />
          ) : bloqueadoSemVeiculo ? (
            <div style={s.aviso}>
              Você precisa ter o <a href="/usuario/veiculo-proprio" style={s.link}>Termo de Opção (Anexo I)</a> aprovado pelo gestor antes de solicitar indenização.
              {veiculo?.status === "pendente" && " O seu já está cadastrado, só falta a aprovação."}
            </div>
          ) : lista.length === 0 ? (
            <div style={s.vazio}>Nenhuma indenização solicitada ainda.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {lista.map(i => (
                <div key={i.id} style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#7A95B2", fontWeight: 600 }}>#{i.protocolo}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{i.localidadesServico}</div>
                      <div style={{ fontSize: 12, color: "#5A7A9A", marginTop: 2 }}>{i.servicoARealizar}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{i.totalKmRodados} km · R$ {(i.valorTotal ?? calcularValor(i.totalKmRodados, valorPorKm)).toFixed(2).replace(".", ",")}</div>
                    </div>
                    <span style={{ ...s.badge, background: STATUS_LABEL[i.status]?.bg, color: STATUS_LABEL[i.status]?.cor }}>
                      {STATUS_LABEL[i.status]?.label || i.status}
                    </span>
                  </div>
                  {i.pdfUrl && <a href={i.pdfUrl} target="_blank" rel="noreferrer" style={{ ...s.link, display: "inline-block", marginTop: 8 }}><IcoDocumento tam={14}/> Ver boletim assinado</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modal && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-indenizacao-titulo">
          <div style={s.modal}>
            <h2 id="modal-indenizacao-titulo" style={s.modalTitulo}>Nova Indenização de Transporte</h2>

            {!pdfBlob ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <label htmlFor="ind-servico" style={s.label}>Serviço a realizar</label>
                  <input id="ind-servico" type="text" placeholder="Vistoria de obra pública" value={form.servicoARealizar} onChange={e => setForm(p => ({ ...p, servicoARealizar: e.target.value }))} style={s.input} />
                </div>
                <div>
                  <label htmlFor="ind-localidade" style={s.label}>Localidade(s) do serviço</label>
                  <input id="ind-localidade" type="text" placeholder="Dourados/MS" value={form.localidadesServico} onChange={e => setForm(p => ({ ...p, localidadesServico: e.target.value }))} style={s.input} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="ind-inicio" style={s.label}>Início autorizado</label>
                    <input id="ind-inicio" type="datetime-local" value={form.inicioAutorizado} onChange={e => setForm(p => ({ ...p, inicioAutorizado: e.target.value }))} style={s.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="ind-retorno" style={s.label}>Retorno previsto</label>
                    <input id="ind-retorno" type="datetime-local" value={form.retornoPrevisto} onChange={e => setForm(p => ({ ...p, retornoPrevisto: e.target.value }))} style={s.input} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="ind-odo-inicial" style={s.label}>Odômetro inicial (km)</label>
                    <input id="ind-odo-inicial" type="number" value={form.odometroInicial} onChange={e => setForm(p => ({ ...p, odometroInicial: e.target.value }))} style={s.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="ind-km-fixada" style={s.label}>Km previamente fixada (opcional)</label>
                    <input id="ind-km-fixada" type="number" value={form.kmPreviamenteFixada} onChange={e => setForm(p => ({ ...p, kmPreviamenteFixada: e.target.value }))} style={s.input} />
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>
                  <label style={s.label}>Trajetos percorridos</label>
                  {trajetos.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                      <input type="date" value={t.data} onChange={e => atualizarTrajeto(i, "data", e.target.value)} style={{ ...s.input, flex: "0 0 128px" }} />
                      <input type="number" placeholder="Odôm. inicial" value={t.odometroInicial} onChange={e => atualizarTrajeto(i, "odometroInicial", e.target.value)} style={{ ...s.input, flex: "0 0 100px" }} />
                      <input type="text" placeholder="Trajeto percorrido" value={t.trajetoPercorrido} onChange={e => atualizarTrajeto(i, "trajetoPercorrido", e.target.value)} style={{ ...s.input, flex: 1 }} />
                      <input type="number" placeholder="Km" value={t.kmRodados} onChange={e => atualizarTrajeto(i, "kmRodados", e.target.value)} style={{ ...s.input, flex: "0 0 70px" }} />
                      {trajetos.length > 1 && (
                        <button type="button" onClick={() => setTrajetos(prev => prev.filter((_, idx) => idx !== i))} style={s.btnRemover}><IcoX tam={14}/></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setTrajetos(prev => [...prev, { ...TRAJETO_VAZIO }])} style={s.btnMini}>+ Adicionar trajeto</button>
                  <div style={{ fontSize: 12, color: "#7A95B2", marginTop: 6 }}>Total: {totalKmRodados} km · R$ {calcularValor(totalKmRodados, valorPorKm).toFixed(2).replace(".", ",")}</div>
                </div>

                <div>
                  <label htmlFor="ind-servicos-realizados" style={s.label}>Serviços realizados</label>
                  <input id="ind-servicos-realizados" type="text" value={form.servicosRealizados} onChange={e => setForm(p => ({ ...p, servicosRealizados: e.target.value }))} style={s.input} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#5A7A9A" }}>
                  <input type="checkbox" checked={form.houveAlteracaoForcaMaior} onChange={e => setForm(p => ({ ...p, houveAlteracaoForcaMaior: e.target.checked }))} />
                  Houve alteração por motivo de força maior na previsão inicial
                </label>
                {form.houveAlteracaoForcaMaior && (
                  <div>
                    <label htmlFor="ind-justificativa" style={s.label}>Justificativa</label>
                    <input id="ind-justificativa" type="text" value={form.justificativaAlteracao} onChange={e => setForm(p => ({ ...p, justificativaAlteracao: e.target.value }))} style={s.input} />
                  </div>
                )}
                <div>
                  <label htmlFor="ind-odo-final" style={s.label}>Odômetro final (km)</label>
                  <input id="ind-odo-final" type="number" value={form.odometroFinal} onChange={e => setForm(p => ({ ...p, odometroFinal: e.target.value }))} style={s.input} />
                </div>

                {erro && <div role="alert" style={s.erro}>{erro}</div>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                  <button type="button" onClick={fecharModal} style={s.btnSecundario}>Cancelar</button>
                  <button type="button" onClick={gerarPdf} style={s.btnPrimario}>Gerar Boletim (PDF)</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <div style={s.passo}><strong>1.</strong> <a href={pdfUrlPreview} download={`boletim-${protocoloAtual}.pdf`} style={s.link}>Baixe o Boletim gerado (#{protocoloAtual})</a></div>
                <div style={s.passo}><strong>2.</strong> Colete as assinaturas necessárias (responsável pela execução e pela homologação), inclusive pelo <a href="https://www.gov.br/governodigital/pt-br/assinatura-eletronica" target="_blank" rel="noreferrer" style={s.link}>Gov.br</a> quando aplicável</div>
                <div style={s.passo}><strong>3.</strong> Envie o PDF assinado abaixo — ele vai automaticamente por e-mail para o RH:</div>
                <input type="file" accept="application/pdf" onChange={e => setArquivoAssinado(e.target.files?.[0] || null)} style={s.input} />
                {erro && <div role="alert" style={s.erro}>{erro}</div>}
                {sucesso && <div style={s.ok}><IcoCheckCirculo tam={14}/> Boletim enviado ao RH!</div>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={fecharModal} style={s.btnSecundario}>{sucesso ? "Fechar" : "Cancelar"}</button>
                  {!sucesso && <button onClick={enviarAssinado} disabled={enviando || !arquivoAssinado} style={s.btnPrimario}>{enviando ? "Enviando..." : "Enviar ao RH"}</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { display: "flex", minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', system-ui, sans-serif" },
  main:    { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" },
  topbar:  { background: "#ffffff", borderBottom: "1.5px solid #E1EAF5", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  title:   { fontSize: 18, fontWeight: 700, color: "#0F172A" },
  sub:     { color: "#7A95B2", fontSize: 12, marginTop: 2 },
  btnNovo: { background: "#1E3A8A", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  content: { padding: "20px 24px", flex: 1, maxWidth: 640 },
  card:    { background: "#ffffff", border: "1px solid #E1EAF5", borderRadius: 12, padding: "1.1rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  vazio:   { fontSize: 13, color: "#94A3B8" },
  aviso:   { background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#854d0e" },
  label:   { display: "block", fontSize: 12, color: "#5A7A9A", marginBottom: 4, fontWeight: 600 },
  input:   { width: "100%", padding: "9px 12px", border: "1px solid #E1EAF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", color: "#0F172A", fontFamily: "inherit" },
  erro:    { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", fontWeight: 500 },
  ok:      { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#166534", fontWeight: 500 },
  btnPrimario:   { padding: "10px 20px", border: "none", borderRadius: 8, background: "#1E3A8A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSecundario: { padding: "10px 20px", border: "1px solid #E1EAF5", borderRadius: 8, background: "#F1F5F9", color: "#5A7A9A", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnMini:       { background: "#F1F5F9", color: "#1E3A8A", border: "1px solid #E1EAF5", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  btnRemover:    { background: "#fff5f5", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, width: 26, height: 26, fontSize: 12, cursor: "pointer", flexShrink: 0 },
  badge:   { padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  link:    { color: "#1E3A8A", fontSize: 13, fontWeight: 600, textDecoration: "none" },
  passo:   { fontSize: 13, color: "#334155" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" },
  modal:   { background: "#ffffff", borderRadius: 12, padding: "1.75rem", width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalTitulo: { fontSize: 18, fontWeight: 700, color: "#0F172A", marginTop: 0, marginBottom: "1.25rem" },
};
