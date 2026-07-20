import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useSetores } from "../hooks/useSetores";

export default function SolicitarAcesso() {
  const navigate = useNavigate();
  const setores = useSetores();
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    nomeCompleto: "",
    email: "",
    matricula: "",
    setor: "",
    numeroCnh: "",
    vencimentoCnh: "",
    numeroDiario: "",
    dataPublicacao: "",
    numeroResolucao: "",
  });

  function set(key: string, val: string) {
    setForm(p => ({ ...p, [key]: val }));
    setErro("");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await addDoc(collection(db, "solicitacoesAcesso"), {
        ...form,
        status: "pendente",
        criadoEm: serverTimestamp(),
      });
      setSucesso(true);
    } catch (err) {
      console.error(err);
      setErro("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) return (
    <div style={s.page}>
      <div style={{ ...s.card, textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
        <h2 style={s.titulo}>Solicitação Enviada!</h2>
        <p style={{ color:"#5A7A9A", fontSize:14, lineHeight:1.6, marginBottom:24 }}>
          Sua solicitação foi enviada ao gestor da Controladoria-Geral do Estado de MS.<br/><br/>
          Após análise e aprovação, você receberá um e-mail em <strong>{form.email}</strong> com seus dados de acesso ao sistema.
        </p>
        <button onClick={() => navigate("/login")} style={s.btnPrimario}>Voltar ao Login</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={{ ...s.card, maxWidth:560, textAlign:"left" }}>
        <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:56, height:56, borderRadius:"50%", background:"#dbeafe", marginBottom:12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round"><path d="M2 16V11h7l2-3h3v3h8v5M2 16h20"/><circle cx="6.5" cy="18.5" r="2.3"/><circle cx="17.5" cy="18.5" r="2.3"/></svg>
          </div>
          <h1 style={s.titulo}>Solicitação de Acesso</h1>
          <p style={{ fontSize:12, color:"#7A95B2", margin:0 }}>
            Controladoria-Geral do Estado de MS — Frota Oficial
          </p>
        </div>

        <div style={{ background:"#fef9c3", border:"1px solid #fde68a", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#854d0e", marginBottom:"0.85rem" }}>
          ⚠️ Para solicitar acesso, você deve possuir publicação no Diário Oficial do Estado de MS habilitando-o como condutor de veículo oficial. Informe os dados da publicação abaixo.
        </div>

        <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#1e40af", marginBottom:"1.5rem", lineHeight:1.5 }}>
          🔒 Os dados informados serão tratados pela Controladoria-Geral do Estado de MS (CGE-MS) apenas para
          análise do seu cadastro no sistema, com base no art. 7º, III e art. 23 da LGPD.{" "}
          <button type="button" onClick={() => navigate("/privacidade")} style={{ background:"none", border:"none", padding:0, color:"#1e40af", fontWeight:700, textDecoration:"underline", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Ver Aviso de Privacidade</button>.
        </div>

        <form onSubmit={enviar} noValidate style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

          <div style={s.secao}>
            <div style={s.secaoTitulo}>👤 Dados Pessoais</div>
            <Campo label="Nome Completo *" placeholder="João da Silva" value={form.nomeCompleto} onChange={v => set("nomeCompleto", v)} />
            <Campo label="E-mail Institucional *" placeholder="joao.silva@cge.ms.gov.br" type="email" value={form.email} onChange={v => set("email", v)} />
            <div style={s.grid2}>
              <Campo label="Matrícula *" placeholder="000001" value={form.matricula} onChange={v => set("matricula", v)} />
              <div>
                <label htmlFor="setor" style={{ display: "block", fontSize: 12, color: "#5A7A9A", marginBottom: 4, fontWeight: 600 }}>Setor *</label>
                <select id="setor" required value={form.setor} onChange={e => set("setor", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E1EAF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#ffffff", color: "#0F172A", fontFamily: "inherit" }}>
                  <option value="">Selecione...</option>
                  {setores.map(st => <option key={st.id} value={st.nome}>{st.nome}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={s.secao}>
            <div style={s.secaoTitulo}>🪪 Habilitação (CNH)</div>
            <div style={s.grid2}>
              <Campo label="Número da CNH *" placeholder="00000000000" value={form.numeroCnh} onChange={v => set("numeroCnh", v)} />
              <Campo label="Vencimento da CNH *" type="date" value={form.vencimentoCnh} onChange={v => set("vencimentoCnh", v)} />
            </div>
          </div>

          <div style={s.secao}>
            <div style={s.secaoTitulo}>📰 Publicação no Diário Oficial do Estado de MS</div>
            <p style={{ fontSize:12, color:"#7A95B2", margin:"0 0 4px" }}>
              Informe os dados da publicação que autoriza sua habilitação como condutor oficial.
            </p>
            <div style={s.grid2}>
              <Campo label="Número do Diário Oficial *" placeholder="Ex: 11.234" value={form.numeroDiario} onChange={v => set("numeroDiario", v)} />
              <Campo label="Data de Publicação *" type="date" value={form.dataPublicacao} onChange={v => set("dataPublicacao", v)} />
            </div>
            <Campo label="Número da Resolução *" placeholder="Ex: 123/2025" value={form.numeroResolucao} onChange={v => set("numeroResolucao", v)} />
          </div>

          {erro && (
            <div role="alert" style={{ background:"#fff5f5", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626" }}>
              ⚠️ {erro}
            </div>
          )}

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:"0.5rem" }}>
            <button type="button" onClick={() => navigate("/login")} style={s.btnSecundario}>Cancelar</button>
            <button type="submit" disabled={enviando} style={s.btnPrimario}>
              {enviando ? "Enviando..." : "Enviar Solicitação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, placeholder, value, onChange, type="text", id }: { label:string; placeholder?:string; value:string; onChange:(v:string)=>void; type?:string; id?:string }) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]/g,"-");
  return (
    <div>
      <label htmlFor={fieldId} style={{ display:"block", fontSize:12, color:"#5A7A9A", marginBottom:4, fontWeight:600 }}>{label}</label>
      <input id={fieldId} type={type} placeholder={placeholder} value={value} required onChange={e => onChange(e.target.value)}
        style={{ width:"100%", padding:"9px 12px", border:"1px solid #E1EAF5", borderRadius:8, fontSize:13, boxSizing:"border-box", background:"#ffffff", color:"#0F172A", fontFamily:"inherit" } as React.CSSProperties} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:         { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F1F5F9", padding:"2rem 1rem", fontFamily:"'Sora',system-ui,sans-serif" },
  card:         { background:"#ffffff", borderRadius:16, border:"1px solid #E1EAF5", padding:"2rem", width:"100%", maxWidth:400, textAlign:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" },
  titulo:       { fontSize:20, fontWeight:700, color:"#0F172A", margin:"0 0 8px" },
  secao:        { background:"#F8FAFC", border:"1px solid #E1EAF5", borderRadius:10, padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" },
  secaoTitulo:  { fontSize:13, fontWeight:700, color:"#334155", marginBottom:4 },
  grid2:        { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"0.75rem" },
  btnPrimario:  { padding:"10px 24px", background:"#1E3A8A", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" },
  btnSecundario:{ padding:"10px 20px", background:"#F1F5F9", color:"#5A7A9A", border:"1px solid #E1EAF5", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" },
};
